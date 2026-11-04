import React, {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {api} from '../services/api';
const Context=createContext(null);
export function AppProvider({children}) {
 const [alerts,setAlerts]=useState([]),[rooms,setRooms]=useState([]),[users,setUsers]=useState([]),[trend,setTrend]=useState([]),[role,setRole]=useState('Administrator'),[loading,setLoading]=useState(true);
 useEffect(()=>{Promise.all([api.getAlerts(),api.getRooms(),api.getUsers(),api.getTrend()]).then(([a,r,u,t])=>{setAlerts(a);setRooms(r);setUsers(u);setTrend(t)}).catch(console.error).finally(()=>setLoading(false));},[]);
 const updateAlert=async(id,status)=>{await api.updateAlert(id,status);setAlerts(previous=>previous.map(a=>a.id===id?{...a,status}:a));};
 const addAlert=useCallback((room,score)=>{const now=new Date(),pad=n=>String(n).padStart(2,'0'),confidence=Math.round(score*100);
  const alert={id:`AL-L${now.getTime().toString().slice(-6)}`,room:room.name,type:'Unusual behavior',model:'Behavior detection',confidence,time:`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,date:`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,priority:confidence>=90?'High':confidence>=75?'Medium':'Low',status:'Pending',source:'live',detail:`The behavior model classified a live camera frame as suspicious (${confidence}%). Supervisor review required.`};
  setAlerts(previous=>[alert,...previous]);api.createAlert(alert).catch(console.error);},[]);
 const value=useMemo(()=>({alerts,rooms,users,trend,role,setRole,loading,updateAlert,addAlert}),[alerts,rooms,users,trend,role,loading,addAlert]);return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
