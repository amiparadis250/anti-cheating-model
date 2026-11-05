import React,{useEffect,useRef,useState} from 'react';
import {Radio,Video,VideoOff} from 'lucide-react';
import {loadBehaviorModel,classifyFrame,THRESHOLD} from '../../services/behaviorModel';
import {useApp} from '../../context/AppContext';
import Peer from 'peerjs';
import QRCode from 'qrcode';

const INTERVAL_MS=1000, CONSECUTIVE=2, COOLDOWN_MS=30000;
const isMjpeg=u=>!/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(u);

export function LiveBehaviorCamera({room}){
  const {addAlert}=useApp();
  const videoRef=useRef(null),imgRef=useRef(null);
  const [state,setState]=useState('idle'),[score,setScore]=useState(0),[error,setError]=useState('');
  const [devices,setDevices]=useState([]),[deviceId,setDeviceId]=useState(''),[mode,setMode]=useState('phone'),[qr,setQr]=useState(''),[phoneLink,setPhoneLink]=useState(''),[phoneOn,setPhoneOn]=useState(false),[url,setUrl]=useState('');
  const useImg=mode==='url'&&isMjpeg(url);

  const refreshDevices=async()=>{
    try{setDevices((await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'));}catch{}
  };
  useEffect(()=>{refreshDevices();navigator.mediaDevices?.addEventListener?.('devicechange',refreshDevices);return()=>navigator.mediaDevices?.removeEventListener?.('devicechange',refreshDevices);},[]);

  useEffect(()=>{
    if(state!=='running')return;
    let stream,peer,timer,stopped=false,streak=0,lastAlert=0;
    const startLoop=el=>{
      timer=setInterval(()=>{
        if(!(el.videoWidth||el.naturalWidth))return;
        try{
          const {suspicious}=classifyFrame(el);setScore(suspicious);
          streak=suspicious>=THRESHOLD?streak+1:0;
          if(streak>=CONSECUTIVE&&Date.now()-lastAlert>COOLDOWN_MS){lastAlert=Date.now();streak=0;addAlert(room,suspicious);}
        }catch(e){
          console.error(e);
          if(/insecure|tainted/i.test(e.message))setError('Stream blocked by CORS - the camera must send Access-Control-Allow-Origin.');
        }
      },INTERVAL_MS);
    };
    (async()=>{
      try{
        if(mode==='phone'){
          await loadBehaviorModel();if(stopped)return;
          setPhoneOn(false);
          peer=new Peer();
          peer.on('error',e=>{setError(e.message||String(e));setState('error');});
          peer.on('open',async id=>{
            const isLocal=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
            const origin=import.meta.env.VITE_PUBLIC_URL||(isLocal&&__LAN_ORIGIN__)||location.origin;
            const link=`${origin.replace(/\/$/,'')}/phone-camera/${id}`;setPhoneLink(link);
            setQr(await QRCode.toDataURL(link,{width:220,margin:1}));
          });
          peer.on('call',call=>{
            call.answer();
            call.on('stream',async s=>{
              const v=videoRef.current;if(!v||stopped)return;
              v.srcObject=s;await v.play().catch(()=>{});
              setPhoneOn(true);clearInterval(timer);startLoop(v);
            });
            call.on('close',()=>{setPhoneOn(false);clearInterval(timer);});
          });
          return;
        }
        if(mode==='url'){
          if(!url)throw new Error('Enter the camera stream URL.');
          await loadBehaviorModel();if(stopped)return;
          if(useImg){imgRef.current.src=url;startLoop(imgRef.current);}
          else{videoRef.current.crossOrigin='anonymous';videoRef.current.src=url;await videoRef.current.play();startLoop(videoRef.current);}
          return;
        }
        const video={width:640,height:480,...(deviceId?{deviceId:{exact:deviceId}}:{})};
        const [,s]=await Promise.all([loadBehaviorModel(),navigator.mediaDevices.getUserMedia({video,audio:false})]);
        stream=s;if(stopped){s.getTracks().forEach(t=>t.stop());return;}
        videoRef.current.srcObject=s;await videoRef.current.play();
        refreshDevices();
        startLoop(videoRef.current);
      }catch(e){setError(e.message||String(e));setState('error');}
    })();
    return()=>{
      stopped=true;clearInterval(timer);peer?.destroy();setQr('');setPhoneOn(false);stream?.getTracks().forEach(t=>t.stop());
      if(videoRef.current){videoRef.current.srcObject=null;videoRef.current.removeAttribute('src');}
      if(imgRef.current)imgRef.current.removeAttribute('src');
    };
  },[state,room,addAlert,mode,deviceId,url,useImg]);

  const pct=Math.round(score*100),flagged=score>=THRESHOLD,running=state==='running';
  const media='absolute inset-0 w-full h-full object-cover';
  return <div className="bg-[#1c1c1e] aspect-[16/9] relative text-[#8e8e93] flex items-center justify-center overflow-hidden">
    <video ref={videoRef} muted autoPlay playsInline className={`${media} ${running&&!useImg?'':'hidden'}`}/>
    <img ref={imgRef} crossOrigin="anonymous" alt="" onError={()=>{if(running&&useImg){setError('Could not load the stream. Check the URL, Wi-Fi and CORS.');setState('error');}}} className={`${media} ${running&&useImg?'':'hidden'}`}/>
    <div className="absolute top-3 left-3 text-white/90 bg-[#3a3a3c]/90 rounded-md px-2 py-1 text-[10px] flex items-center gap-1 z-10"><Radio size={11}/> {running?'LIVE · AI MONITORING':'CAMERA PREVIEW'}</div>
    {running&&error&&<div className="absolute top-10 left-3 right-3 z-10 bg-rose-900/80 text-white text-[11px] rounded-md px-2 py-1">{error}</div>}
    {running&&mode==='phone'&&!phoneOn&&<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1c1c1e] text-center px-4">
      {qr?<img src={qr} alt="Scan with phone" className="w-40 h-40 rounded-lg bg-white p-1"/>:<p className="text-xs">Preparing QR code...</p>}
      <p className="text-xs mt-3 text-[#d1d1d6]">Scan with your phone camera, allow camera access, and it connects automatically.</p>
      {phoneLink.includes('localhost')&&<p className="text-[10px] mt-1 text-amber-300">No network address found. Connect the computer to Wi-Fi, then restart npm run dev.</p>}
    </div>}
    {running&&(mode!=='phone'||phoneOn)&&<div className="absolute left-3 right-3 bottom-3 z-10 bg-black/55 rounded-lg px-3 py-2 text-white text-[11px]"><div className="flex justify-between mb-1"><span>Suspicious score</span><span className={flagged?'text-rose-300 font-semibold':''}>{pct}%</span></div><div className="h-1.5 bg-white/20 rounded"><div className={`h-full rounded ${flagged?'bg-rose-400':'bg-emerald-400'}`} style={{width:`${pct}%`}}/></div></div>}
    {!running&&<div className="flex flex-col items-center z-10 w-full max-w-xs px-4">
      <VideoOff size={32} strokeWidth={1.4}/>
      <p className="text-xs mt-3 text-[#d1d1d6] text-center">{state==='error'?error:'No live camera connected'}</p>
      <div className="mt-3 flex w-full gap-1 text-[11px]">
        {[['phone','Phone (QR)'],['device','Camera'],['url','Stream URL']].map(([m,l])=><button key={m} onClick={()=>setMode(m)} className={`flex-1 rounded-md px-2 py-1 ${mode===m?'bg-[#0071e3] text-white':'bg-[#3a3a3c] text-[#d1d1d6]'}`}>{l}</button>)}
      </div>
      {mode==='phone'?<p className="mt-2 text-[11px] text-[#d1d1d6] text-center">A QR code will appear. Scan it with your phone.</p>:mode==='device'
        ?<select value={deviceId} onChange={e=>setDeviceId(e.target.value)} className="mt-2 w-full bg-[#3a3a3c] text-white text-[11px] rounded-md px-2 py-1.5">
            <option value="">Default camera</option>
            {devices.map((d,i)=><option key={d.deviceId||i} value={d.deviceId}>{d.label||`Camera ${i+1}`}</option>)}
          </select>
        :<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="http://192.168.1.20:8080/video" className="mt-2 w-full bg-[#3a3a3c] text-white placeholder:text-[#8e8e93] text-[11px] rounded-md px-2 py-1.5 outline-none"/>}
      <button onClick={()=>{setError('');setState('running');}} className="mt-3 inline-flex items-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-full px-4 py-2"><Video size={14}/> {state==='error'?'Retry':'Start AI monitoring'}</button>
    </div>}
    {running&&<button onClick={()=>{setState('idle');setScore(0);setError('');}} className="absolute top-3 right-3 z-10 bg-[#3a3a3c]/90 text-white text-[10px] rounded-md px-2 py-1">Stop</button>}
  </div>;
}
