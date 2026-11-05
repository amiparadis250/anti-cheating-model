import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Mic, MicOff, ChevronDown, Usb} from 'lucide-react';
import {AreaChart, Area, ResponsiveContainer, ReferenceLine, YAxis} from 'recharts';
import {useApp} from '../../context/AppContext';

const CUE_THRESHOLD = 0.5, COOLDOWN_MS = 30000, MAX_POINTS = 40, MAX_LINES = 100, BAUDS = [9600, 19200, 38400, 57600, 115200];
const CLASSES = [['cheating_cue', 'Cheating cue', '#ff3b30'], ['normal_classroom', 'Normal classroom', '#34c759'], ['other_noise', 'Other noise', '#8e8e93'], ['speech_unknown', 'Speech (unknown)', '#ff9f0a']];
const claimed = new Set();
const storeKey = room => `ukuri.mic.${room.id}`;
const portKey = info => `${info.usbVendorId ?? 'x'}:${info.usbProductId ?? 'x'}`;

const readSaved = room => {
  try { return JSON.parse(localStorage.getItem(storeKey(room))) || {}; } catch { return {}; }
};
const writeSaved = (room, value) => {
  try { localStorage.setItem(storeKey(room), JSON.stringify(value)); } catch { return; }
};

export function parseLine(line) {
  const m = line.match(/^\s*(?:\d{1,2}:\d{2}:\d{2}\s*[AP]M\s+)?([A-Za-z_]+)\s*:\s*(-?\d*\.?\d+)\s*$/);
  return m ? {label: m[1].toLowerCase(), value: Number(m[2])} : null;
}

export function RoomMic({room}) {
  const {addAlert} = useApp();
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [baud, setBaud] = useState(() => readSaved(room).baud || 9600);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [classes, setClasses] = useState({});
  const [lines, setLines] = useState([]);
  const [phase, setPhase] = useState('');
  const [details, setDetails] = useState(false);
  const portRef = useRef(null), readerRef = useRef(null), streak = useRef(0), lastAlert = useRef(0), seq = useRef(0), roomRef = useRef(room);
  roomRef.current = room;

  const release = useCallback(() => {
    if (portRef.current) claimed.delete(portRef.current);
    portRef.current = null; readerRef.current = null;
    setConnected(false);
  }, []);

  const disconnect = useCallback(async () => {
    try { await readerRef.current?.cancel(); } catch { /* already closed */ }
    try { await portRef.current?.close(); } catch { /* already closed */ }
    release();
  }, [release]);

  const handleLine = useCallback(text => {
    const stamp = new Date().toLocaleTimeString();
    setLines(prev => [...prev, {stamp, text}].slice(-MAX_LINES));
    if (/recording\.\.\./i.test(text)) setPhase('Recording');
    else if (/recording done/i.test(text)) setPhase('Analysing');
    else if (/starting inferencing/i.test(text)) setPhase('Waiting for next sample');
    const parsed = parseLine(text);
    if (!parsed) return;
    setClasses(prev => ({...prev, [parsed.label]: parsed.value}));
    if (parsed.label !== 'cheating_cue') return;
    const v = parsed.value;
    setHistory(prev => [...prev, {n: seq.current++, value: v}].slice(-MAX_POINTS));
    streak.current = v > CUE_THRESHOLD ? streak.current + 1 : 0;
    if (streak.current >= 1 && Date.now() - lastAlert.current > COOLDOWN_MS) {
      lastAlert.current = Date.now(); streak.current = 0;
      addAlert(roomRef.current, Math.min(v, 1), 'sound');
    }
  }, [addAlert]);

  const openPort = useCallback(async (port, rate) => {
    await port.open({baudRate: rate});
    portRef.current = port; claimed.add(port);
    setConnected(true); setError('');
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable).catch(() => {});
    const reader = decoder.readable.getReader();
    readerRef.current = reader;
    let buffer = '';
    try {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        buffer += value;
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop();
        parts.filter(p => p.trim().length).forEach(handleLine);
      }
    } finally {
      try { await port.close(); } catch { /* already closed */ }
      release();
    }
  }, [handleLine, release]);

  const connect = async () => {
    setError('');
    try {
      const port = await navigator.serial.requestPort();
      if (claimed.has(port)) throw new Error('That microphone is already connected to another room.');
      writeSaved(room, {...portKeyInfo(port), baud});
      await openPort(port, baud);
    } catch (e) {
      if (e.name !== 'NotFoundError') setError(e.message || String(e));
    }
  };

  useEffect(() => {
    if (!supported) return undefined;
    const saved = readSaved(room);
    if (!saved.key) return undefined;
    let cancelled = false;
    navigator.serial.getPorts().then(ports => {
      const matches = ports.filter(p => portKey(p.getInfo()) === saved.key && !claimed.has(p));
      if (!cancelled && matches.length === 1 && !portRef.current) openPort(matches[0], saved.baud || 9600).catch(e => setError(e.message || String(e)));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [room.id]);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  const current = history.length ? history[history.length - 1].value : 0;
  const hot = connected && current > CUE_THRESHOLD;
  const status = !connected ? 'Not connected' : hot ? 'Cheating cue heard' : phase || 'Listening';

  return <div className="border-t border-slate-100 p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`p-1.5 rounded-lg ${hot ? 'bg-[#ff3b30] text-white' : connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{connected ? <Mic size={14}/> : <MicOff size={14}/>}</span>
        <div className="min-w-0"><p className="text-xs font-semibold text-[#1d1d1f]">Microphone</p><p className={`text-[11px] truncate ${hot ? 'text-[#ff3b30] font-semibold' : 'text-[#86868b]'}`}>{status}</p></div>
      </div>
      <div className="flex items-center gap-2">
        {!connected && <select value={baud} onChange={e => setBaud(Number(e.target.value))} aria-label="Baud rate" className="h-8 rounded-full bg-black/[.05] px-2 text-[11px] outline-none">{BAUDS.map(b => <option key={b} value={b}>{b}</option>)}</select>}
        <button onClick={connected ? disconnect : connect} disabled={!supported} className={`h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-40 ${connected ? 'bg-black/[.06] text-[#1d1d1f] hover:bg-black/10' : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'}`}><Usb size={13}/>{connected ? 'Disconnect' : 'Connect'}</button>
      </div>
    </div>
    {!supported && <p className="text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2.5 mt-3">Microphones need Chrome or Edge (Web Serial).</p>}
    {error && <p className="text-[11px] text-rose-700 bg-rose-50 rounded-xl p-2.5 mt-3">{error} Close the Arduino Serial Monitor if it is open.</p>}
    {connected && <>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative flex-1 h-2 rounded-full bg-black/[.06] overflow-visible">
          <div className={`h-full rounded-full transition-all ${hot ? 'bg-[#ff3b30]' : 'bg-[#0071e3]'}`} style={{width: `${Math.min(current, 1) * 100}%`}}/>
          <span className="absolute -top-1 h-4 w-0.5 bg-[#1d1d1f]/60" style={{left: `${CUE_THRESHOLD * 100}%`}} title="alert limit"/>
        </div>
        <span className={`text-xs font-semibold tabular-nums w-10 text-right ${hot ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>{current.toFixed(2)}</span>
      </div>
      {history.length > 1 && <div className="h-14 mt-2"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><YAxis hide domain={[0, 1]}/><ReferenceLine y={CUE_THRESHOLD} stroke="#ff3b30" strokeDasharray="4 4"/><Area type="monotone" dataKey="value" stroke="#0071e3" strokeWidth={1.8} fill="#0071e3" fillOpacity={0.12} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>}
      <button onClick={() => setDetails(d => !d)} className="mt-2 text-[11px] text-[#86868b] inline-flex items-center gap-1 hover:text-[#1d1d1f]">Details <ChevronDown size={12} className={details ? 'rotate-180' : ''}/></button>
      {details && <div className="mt-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">{CLASSES.map(([key, name, color]) => {
          const v = classes[key] ?? 0;
          return <div key={key}><div className="flex justify-between text-[11px]"><span className="text-[#6e6e73]">{name}</span><span className="font-semibold">{(v * 100).toFixed(0)}%</span></div><div className="h-1.5 bg-black/[.06] rounded mt-1"><div className="h-full rounded" style={{width: `${Math.min(v, 1) * 100}%`, background: color}}/></div></div>;
        })}</div>
        <div className="h-24 overflow-auto rounded-lg bg-[#1c1c1e] text-[#d1d1d6] font-mono text-[10px] p-2">{lines.length === 0 ? 'No data yet.' : lines.slice(-30).map((l, i) => <div key={i}>{l.stamp} {l.text}</div>)}</div>
      </div>}
    </>}
  </div>;
}

function portKeyInfo(port) {
  return {key: portKey(port.getInfo())};
}
