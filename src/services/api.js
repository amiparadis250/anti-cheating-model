import {rooms, users} from '../data/defaults';
import {DEFAULT_RULES} from '../shared/risk';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND !== 'false';

const readStore = key => {
  try { return JSON.parse(localStorage.getItem(`ukuri.${key}`)) || []; } catch { return []; }
};
const writeStore = (key, value) => {
  try { localStorage.setItem(`ukuri.${key}`, JSON.stringify(value.slice(0, 500))); } catch { return; }
};

const readRooms = () => {
  try {
    const saved = localStorage.getItem('ukuri.rooms');
    return saved ? JSON.parse(saved) : rooms;
  } catch { return rooms; }
};
const writeRooms = list => writeStore('rooms', list);

async function request(path, options = {}) {
  const result = await fetch(`${API_BASE}${path}`, {headers: {'Content-Type': 'application/json', ...options.headers}, ...options});
  if (!result.ok) {
    const body = await result.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed (${result.status})`);
    error.status = result.status;
    throw error;
  }
  return result.status === 204 ? null : result.json();
}

let backendUp = USE_BACKEND;
const call = async (remote, local) => {
  if (!backendUp) return local();
  try {
    return await remote();
  } catch (error) {
    if (error.status) throw error;
    backendUp = false;
    return local();
  }
};

export const isBackendUp = () => backendUp;

export const api = {
  getConfig: () => call(() => request('/config'), async () => ({store: 'browser', rules: DEFAULT_RULES})),
  getRooms: () => call(() => request('/rooms'), async () => readRooms()),
  createRoom: room => call(
    () => request('/rooms', {method: 'POST', body: JSON.stringify(room)}),
    async () => {
      const list = readRooms();
      if (list.some(r => r.name === room.name)) throw Object.assign(new Error('A room with that name already exists'), {status: 409});
      const created = {...room, id: `RM-${Date.now().toString(36).toUpperCase()}`, cameras: 1};
      writeRooms([...list, created]);
      return created;
    },
  ),
  updateRoom: (id, patch) => call(
    () => request(`/rooms/${id}`, {method: 'PATCH', body: JSON.stringify(patch)}),
    async () => {
      let updated = null;
      writeRooms(readRooms().map(r => r.id === id ? (updated = {...r, ...patch}) : r));
      return updated;
    },
  ),
  deleteRoom: id => call(
    () => request(`/rooms/${id}`, {method: 'DELETE'}),
    async () => { writeRooms(readRooms().filter(r => r.id !== id)); return null; },
  ),
  getUsers: () => call(() => request('/users'), async () => users),

  getAlerts: () => call(() => request('/alerts'), async () => readStore('alerts')),
  createAlert: alert => call(
    () => request('/alerts', {method: 'POST', body: JSON.stringify(alert)}),
    async () => { writeStore('alerts', [alert, ...readStore('alerts')]); return alert; },
  ),
  updateAlert: (id, status, reviewedBy) => call(
    () => request(`/alerts/${id}`, {method: 'PATCH', body: JSON.stringify({status, reviewedBy})}),
    async () => {
      const patch = {status, reviewedBy, reviewedAt: new Date().toISOString()};
      writeStore('alerts', readStore('alerts').map(a => a.id === id ? {...a, ...patch} : a));
      return {id, ...patch};
    },
  ),

  getNotifications: () => call(() => request('/notifications'), async () => []),
  markNotificationsRead: id => call(
    () => request('/notifications/read', {method: 'POST', body: JSON.stringify({id})}),
    async () => null,
  ),

  getSessions: () => call(() => request('/sessions'), async () => readStore('sessions')),
  createSession: session => call(
    () => request('/sessions', {method: 'POST', body: JSON.stringify(session)}),
    async () => {
      const created = {...session, id: `SE-${Date.now().toString(36).toUpperCase()}`};
      writeStore('sessions', [...readStore('sessions'), created]);
      return created;
    },
  ),
  deleteSession: id => call(
    () => request(`/sessions/${id}`, {method: 'DELETE'}),
    async () => { writeStore('sessions', readStore('sessions').filter(s => s.id !== id)); return null; },
  ),
};

export {USE_BACKEND, API_BASE};
