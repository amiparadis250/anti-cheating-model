import React,{useEffect,useRef,useState} from 'react';
import {useParams} from 'react-router-dom';
import Peer from 'peerjs';

export default function PhoneCamera(){
  const {id}=useParams(),videoRef=useRef(null),[status,setStatus]=useState('Starting camera...'),[ok,setOk]=useState(false);
  useEffect(()=>{
    let peer,stream,stopped=false;
    (async()=>{
      try{
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:640,height:480},audio:false});
        if(stopped){stream.getTracks().forEach(t=>t.stop());return;}
        videoRef.current.srcObject=stream;
        peer=new Peer();
        peer.on('open',()=>{
          setStatus('Connecting to dashboard...');
          const call=peer.call(id,stream);
          call.on('close',()=>{setOk(false);setStatus('Dashboard disconnected. Rescan the QR code.');});
          call.on('error',e=>setStatus(e.message));
          setOk(true);setStatus('Connected - streaming to Ukuri AI monitoring');
        });
        peer.on('error',e=>{setOk(false);setStatus(e.type==='peer-unavailable'?'Dashboard not found. Press Start on the dashboard and rescan.':e.message);});
      }catch(e){setStatus(e.name==='NotAllowedError'?'Camera permission denied.':(e.message||String(e)));}
    })();
    return()=>{stopped=true;peer?.destroy();stream?.getTracks().forEach(t=>t.stop());};
  },[id]);
  return <div className="min-h-screen bg-[#1c1c1e] text-white flex flex-col items-center justify-center p-4 gap-3">
    <video ref={videoRef} autoPlay muted playsInline className="w-full max-w-md rounded-xl bg-black aspect-[4/3] object-cover"/>
    <p className={`text-sm text-center ${ok?'text-emerald-300':'text-[#d1d1d6]'}`}>{status}</p>
    <p className="text-[11px] text-[#8e8e93] text-center">Keep this page open and the screen on. Point the camera at the room.</p>
  </div>;
}
