import React,{useEffect,useRef,useState} from 'react';
import {Radio,Video,VideoOff} from 'lucide-react';
import {loadBehaviorModel,classifyFrame,THRESHOLD} from '../../services/behaviorModel';
import {useApp} from '../../context/AppContext';

const INTERVAL_MS=1000, CONSECUTIVE=2, COOLDOWN_MS=30000;

// Webcam preview + on-device Edge Impulse inference. Raises a "Behavior detection" alert when flagged.
export function LiveBehaviorCamera({room}){
  const {addAlert}=useApp();
  const videoRef=useRef(null),[state,setState]=useState('idle'),[score,setScore]=useState(0),[error,setError]=useState('');
  useEffect(()=>{
    if(state!=='running')return;
    let stream,timer,stopped=false,streak=0,lastAlert=0;
    (async()=>{
      try{
        const [,s]=await Promise.all([loadBehaviorModel(),navigator.mediaDevices.getUserMedia({video:{width:640,height:480},audio:false})]);
        stream=s;if(stopped){s.getTracks().forEach(t=>t.stop());return;}
        videoRef.current.srcObject=s;await videoRef.current.play();
        timer=setInterval(()=>{
          const v=videoRef.current;if(!v||!v.videoWidth)return;
          try{
            const {suspicious}=classifyFrame(v);setScore(suspicious);
            streak=suspicious>=THRESHOLD?streak+1:0;
            if(streak>=CONSECUTIVE&&Date.now()-lastAlert>COOLDOWN_MS){lastAlert=Date.now();streak=0;addAlert(room,suspicious);}
          }catch(e){console.error(e);}
        },INTERVAL_MS);
      }catch(e){setError(e.message||String(e));setState('error');}
    })();
    return()=>{stopped=true;clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());};
  },[state,room,addAlert]);
  const pct=Math.round(score*100),flagged=score>=THRESHOLD;
  return <div className="bg-[#0e2b3d] aspect-[16/9] relative text-[#7eabbf] flex items-center justify-center overflow-hidden">
    <video ref={videoRef} muted playsInline className={`absolute inset-0 w-full h-full object-cover ${state==='running'?'':'hidden'}`}/>
    <div className="absolute top-3 left-3 text-white/90 bg-[#22465d]/90 rounded-md px-2 py-1 text-[10px] flex items-center gap-1 z-10"><Radio size={11}/> {state==='running'?'LIVE · AI MONITORING':'CAMERA PREVIEW'}</div>
    {state==='running'&&<div className="absolute left-3 right-3 bottom-3 z-10 bg-black/55 rounded-lg px-3 py-2 text-white text-[11px]"><div className="flex justify-between mb-1"><span>Suspicious score</span><span className={flagged?'text-rose-300 font-semibold':''}>{pct}%</span></div><div className="h-1.5 bg-white/20 rounded"><div className={`h-full rounded ${flagged?'bg-rose-400':'bg-emerald-400'}`} style={{width:`${pct}%`}}/></div></div>}
    {state!=='running'&&<div className="flex flex-col items-center z-10"><VideoOff size={32} strokeWidth={1.4}/><p className="text-xs mt-3 text-[#b9cdd9]">{state==='error'?error:'No live camera connected'}</p><button onClick={()=>{setError('');setState('running');}} className="mt-3 inline-flex items-center gap-1.5 bg-[#188db3] hover:bg-[#13789a] text-white text-xs font-semibold rounded-lg px-3 py-2"><Video size={14}/> {state==='error'?'Retry':'Start AI monitoring'}</button></div>}
    {state==='running'&&<button onClick={()=>{setState('idle');setScore(0);}} className="absolute top-3 right-3 z-10 bg-[#22465d]/90 text-white text-[10px] rounded-md px-2 py-1">Stop</button>}
  </div>;
}
