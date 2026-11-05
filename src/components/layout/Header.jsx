import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Menu, Search, Bell, CalendarDays, ChevronDown, Check, ShieldAlert, DoorOpen, CalendarClock, BellOff} from 'lucide-react';
import {useApp, todayKey} from '../../context/AppContext';

function useOutsideClose(ref, close) {
  useEffect(() => {
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [ref, close]);
}

function SearchBox() {
  const {alerts, rooms, sessions} = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef(null), input = useRef(null);
  useOutsideClose(wrap, () => setOpen(false));

  useEffect(() => {
    const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const has = text => text.toLowerCase().includes(term);
    return [
      ...alerts.filter(a => has(`${a.type} ${a.room} ${a.id}`)).slice(0, 4).map(a => ({key: a.id, icon: ShieldAlert, title: a.type, sub: `${a.room} - ${a.id}`, to: `/alerts?q=${encodeURIComponent(a.id)}`})),
      ...rooms.filter(r => has(`${r.name} ${r.school}`)).slice(0, 3).map(r => ({key: r.id, icon: DoorOpen, title: r.name, sub: r.school, to: '/rooms'})),
      ...sessions.filter(s => has(`${s.name} ${s.id}`)).slice(0, 3).map(s => ({key: s.id, icon: CalendarClock, title: s.name, sub: `${s.date} - ${s.start}`, to: '/sessions'})),
    ];
  }, [q, alerts, rooms, sessions]);

  const go = to => { navigate(to); setOpen(false); setQ(''); input.current?.blur(); };

  return <div ref={wrap} className="relative flex-1 max-w-md">
    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]"/>
    <input ref={input} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
      onKeyDown={e => { if (e.key === 'Enter' && results[0]) go(results[0].to); }}
      placeholder="Search alerts, rooms, sessions" aria-label="Search"
      className="w-full h-10 rounded-full bg-black/[.05] focus:bg-white focus:shadow-md pl-10 pr-14 text-sm outline-none transition placeholder:text-[#86868b]"/>
    <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#86868b] border border-black/10 rounded-md px-1.5 py-0.5 bg-white">Ctrl K</kbd>
    {open && q.trim() && <div className="absolute left-0 right-0 top-12 bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-30">
      {results.length === 0
        ? <p className="px-4 py-5 text-sm text-[#86868b] text-center">No results for "{q}"</p>
        : results.map(r => <button key={r.key} onClick={() => go(r.to)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f5f5f7]">
            <span className="p-2 rounded-xl bg-[#e8f1fd] text-[#0066cc]"><r.icon size={15}/></span>
            <span className="min-w-0"><span className="block text-sm font-medium text-[#1d1d1f] truncate">{r.title}</span><span className="block text-[11px] text-[#86868b] truncate">{r.sub}</span></span>
          </button>)}
    </div>}
  </div>;
}

const ROLES = ['Administrator', 'Supervisor', 'Coordinator'];
const LEVEL_STYLE = {
  critical: {icon: 'bg-rose-50 text-[#ff3b30]', tag: 'bg-rose-50 text-rose-700', label: 'Critical'},
  warning: {icon: 'bg-amber-50 text-[#ff9f0a]', tag: 'bg-amber-50 text-amber-700', label: 'Warning'},
};
const ago = iso => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return minutes < 1 ? 'now' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
};

function Notifications() {
  const {alerts, notifications, markNotificationsRead} = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  const pending = alerts.filter(a => a.status === 'Pending');
  const unread = notifications.filter(n => !n.read);
  const hasCritical = unread.some(n => n.level === 'critical');
  const count = notifications.length ? unread.length : pending.length;

  const openNotification = n => { markNotificationsRead(n.id); navigate(`/alerts?q=${encodeURIComponent(n.room)}`); setOpen(false); };
  const enableDesktop = async () => setPermission(await Notification.requestPermission());

  return <div ref={ref} className="relative">
    <button onClick={() => setOpen(o => !o)} aria-label="Notifications" className={`relative h-10 w-10 rounded-full flex items-center justify-center transition ${open ? 'bg-[#e8f1fd] text-[#0071e3]' : 'text-[#424245] hover:bg-black/5'}`}>
      <Bell size={19} className={hasCritical ? 'animate-pulse text-[#ff3b30]' : ''}/>
      {count > 0 && <span className="absolute top-1 right-1 bg-[#ff3b30] text-white text-[9px] font-semibold h-4 min-w-4 px-1 rounded-full flex items-center justify-center ring-2 ring-white">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 w-[380px] max-w-[92vw] bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-30">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#f0f0f3]">
        <p className="font-semibold text-sm text-[#1d1d1f]">Notifications</p>
        {unread.length > 0
          ? <button onClick={() => markNotificationsRead()} className="text-[11px] font-medium text-[#0071e3] hover:underline">Mark all as read</button>
          : <span className="text-[11px] text-[#86868b]">{pending.length} alerts awaiting review</span>}
      </div>
      {notifications.length > 0
        ? <div className="max-h-[380px] overflow-y-auto">{notifications.slice(0, 10).map(n => {
            const style = LEVEL_STYLE[n.level] || LEVEL_STYLE.warning;
            return <button key={n.id} onClick={() => openNotification(n)} className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-[#f5f5f7] ${n.read ? 'opacity-60' : ''}`}>
              <span className={`mt-0.5 p-2 rounded-xl h-fit ${style.icon}`}><ShieldAlert size={15}/></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${style.tag}`}>{style.label}</span>{!n.read && <span className="h-1.5 w-1.5 rounded-full bg-[#0071e3]"/>}</span>
                <span className="block text-sm font-medium text-[#1d1d1f] mt-1">{n.title}</span>
                <span className="block text-[12px] text-[#6e6e73] mt-0.5 leading-snug">{n.message}</span>
              </span>
              <span className="text-[11px] text-[#86868b] whitespace-nowrap">{ago(n.createdAt)}</span>
            </button>;
          })}</div>
        : pending.length === 0
          ? <div className="py-10 flex flex-col items-center text-[#86868b]"><BellOff size={22}/><p className="text-sm mt-2">You are all caught up</p></div>
          : <div className="max-h-[360px] overflow-y-auto">{pending.slice(0, 8).map(a => <button key={a.id} onClick={() => { navigate(`/alerts?q=${encodeURIComponent(a.id)}`); setOpen(false); }} className="w-full flex gap-3 px-4 py-3 text-left hover:bg-[#f5f5f7]">
              <span className={`mt-0.5 p-2 rounded-xl h-fit ${a.priority === 'High' ? 'bg-rose-50 text-[#ff3b30]' : 'bg-amber-50 text-[#ff9f0a]'}`}><ShieldAlert size={15}/></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#1d1d1f]">{a.type}</span><span className="block text-[11px] text-[#86868b]">{a.room} - {a.confidence}% confidence</span></span>
              <span className="text-[11px] text-[#86868b] whitespace-nowrap">{a.time.slice(0, 5)}</span>
            </button>)}</div>}
      {permission === 'default' && <button onClick={enableDesktop} className="w-full py-2.5 text-xs font-medium text-[#424245] bg-[#f5f5f7] hover:bg-[#ececf0]">Turn on desktop alerts</button>}
      <button onClick={() => { navigate('/alerts'); setOpen(false); }} className="w-full py-3 text-sm font-medium text-[#0071e3] border-t border-[#f0f0f3] hover:bg-[#f5f5f7]">View all alerts</button>
    </div>}
  </div>;
}

function Profile() {
  const {user, role, setRole} = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return <div ref={ref} className="relative">
    <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2.5 pl-1 pr-2.5 h-10 rounded-full hover:bg-black/5 transition">
      <span className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#0058b8] text-white text-xs font-semibold flex items-center justify-center">{initials}</span>
      <span className="hidden lg:block text-left leading-tight"><span className="block text-xs font-semibold text-[#1d1d1f]">{user.name}</span><span className="block text-[11px] text-[#86868b]">{role}</span></span>
      <ChevronDown size={14} className={`text-[#86868b] transition ${open ? 'rotate-180' : ''}`}/>
    </button>
    {open && <div className="absolute right-0 top-12 w-[280px] bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-30">
      <div className="p-4 flex items-center gap-3 border-b border-[#f0f0f3]">
        <span className="h-11 w-11 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#0058b8] text-white font-semibold flex items-center justify-center">{initials}</span>
        <div className="min-w-0"><p className="text-sm font-semibold text-[#1d1d1f] truncate">{user.name}</p><p className="text-[11px] text-[#86868b] truncate">{user.email}</p></div>
      </div>
      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-[#86868b]">Switch role</p>
      {ROLES.map(r => <button key={r} onClick={() => { setRole(r); setOpen(false); }} className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#1d1d1f] hover:bg-[#f5f5f7]">{r}{r === role && <Check size={15} className="text-[#0071e3]"/>}</button>)}
    </div>}
  </div>;
}

function DatePicker() {
  const {selectedDate, setSelectedDate} = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null), input = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  const label = selectedDate
    ? new Date(`${selectedDate}T00:00`).toLocaleDateString('en-GB', {weekday: 'short', day: '2-digit', month: 'short'})
    : 'All dates';
  const isToday = selectedDate === todayKey();
  const quick = 'flex-1 h-9 rounded-full text-xs font-medium transition';

  return <div ref={ref} className="relative hidden md:block">
    <button onClick={() => setOpen(o => !o)} aria-label="Choose date" className={`flex items-center gap-2 h-10 px-4 rounded-full text-xs font-medium transition ${open ? 'bg-[#e8f1fd] text-[#0071e3]' : 'bg-black/[.05] text-[#424245] hover:bg-black/[.08]'}`}>
      <CalendarDays size={15} className="text-[#0071e3]"/>{label}{isToday && <span className="text-[10px] text-[#0071e3] font-semibold">Today</span>}
    </button>
    {open && <div className="absolute right-0 top-12 w-[260px] bg-white rounded-2xl shadow-xl border border-black/5 p-4 z-30">
      <p className="text-[11px] font-semibold text-[#86868b] mb-2">Show data for</p>
      <input ref={input} type="date" value={selectedDate} max={todayKey()} onChange={e => setSelectedDate(e.target.value)} onClick={() => input.current?.showPicker?.()}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0071e3]"/>
      <div className="flex gap-2 mt-3">
        <button onClick={() => { setSelectedDate(todayKey()); setOpen(false); }} className={`${quick} ${isToday ? 'bg-[#0071e3] text-white' : 'bg-black/[.05] text-[#1d1d1f] hover:bg-black/10'}`}>Today</button>
        <button onClick={() => { setSelectedDate(''); setOpen(false); }} className={`${quick} ${!selectedDate ? 'bg-[#0071e3] text-white' : 'bg-black/[.05] text-[#1d1d1f] hover:bg-black/10'}`}>All dates</button>
      </div>
    </div>}
  </div>;
}

export function Header({onMenu}) {
  return <header className="h-[72px] bg-white/70 backdrop-blur-xl border-b border-black/5 px-4 md:px-9 flex items-center gap-4 sticky top-0 z-20">
    <button onClick={onMenu} className="md:hidden" aria-label="Open menu"><Menu size={22}/></button>
    <div className="flex-1 flex justify-center lg:justify-start"><SearchBox/></div>
    <div className="flex items-center gap-1.5">
      <DatePicker/>
      <Notifications/>
      <div className="w-px h-6 bg-black/10 mx-1.5 hidden sm:block"/>
      <Profile/>
    </div>
  </header>;
}
