import {initialAlerts, rooms, users, trend} from '../data/mockData';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';
const wait = async value => {await new Promise(resolve=>setTimeout(resolve,100)); return structuredClone(value);};
async function request(path, options={}) {const result=await fetch(`${API_BASE}${path}`,{headers:{'Content-Type':'application/json',...options.headers},...options}); if(!result.ok) throw new Error(`API request failed: ${result.status}`);return result.json();}
export const api = {
  getRooms:()=>USE_MOCKS?wait(rooms):request('/rooms'),
  getAlerts:()=>USE_MOCKS?wait(initialAlerts):request('/alerts'),
  getUsers:()=>USE_MOCKS?wait(users):request('/users'),
  getTrend:()=>USE_MOCKS?wait(trend):request('/analytics/trend'),
  createAlert:alert=>USE_MOCKS?wait(alert):request('/alerts',{method:'POST',body:JSON.stringify(alert)}),
  updateAlert:(id,status)=>USE_MOCKS?wait({id,status}):request(`/alerts/${id}`,{method:'PATCH',body:JSON.stringify({status})}),
};
export {USE_MOCKS,API_BASE};
