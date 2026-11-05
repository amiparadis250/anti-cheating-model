import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {api} from '../services/api';
import {DEFAULT_RULES, LEVEL_RANK, MODEL_KEYS, roomRisk} from '../shared/risk';

const Context = createContext(null);
const pad = n => String(n).padStart(2, '0');
export const todayKey = () => new Date().toLocaleDateString('en-CA');

function buildTrend(alerts) {
  const buckets = {};
  alerts.forEach(a => {
    const hour = `${(a.time || '00').slice(0, 2)}:00`;
    buckets[hour] ||= {time: hour, behavior: 0, phone: 0, sound: 0};
    const key = MODEL_KEYS[a.model];
    if (key) buckets[hour][key]++;
  });
  return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time));
}

function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    [0, 0.25, 0.5].forEach(offset => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.value = 880; osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
      osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { return; }
}

export function AppProvider({children}) {
  const [alerts, setAlerts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [role, setRole] = useState('Administrator');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [now, setNow] = useState(Date.now());
  const seenNotifications = useRef(null);

  useEffect(() => {
    Promise.all([api.getAlerts(), api.getRooms(), api.getUsers(), api.getSessions(), api.getConfig()])
      .then(([a, r, u, s, config]) => { setAlerts(a); setRooms(r); setUsers(u); setSessions(s); setRules(config.rules); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let stopped = false;
    const pollNotifications = async () => {
      try {
        const list = await api.getNotifications();
        if (stopped) return;
        setNotifications(list);
        const known = seenNotifications.current;
        if (known) {
          const fresh = list.filter(n => !n.read && !known.has(n.id));
          if (fresh.some(n => n.level === 'critical')) beep();
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            fresh.forEach(n => new Notification(n.title, {body: n.message, tag: `ukuri-${n.id}`}));
          }
        }
        seenNotifications.current = new Set(list.map(n => n.id));
      } catch { return; }
    };
    const pollAlerts = async () => {
      try { const list = await api.getAlerts(); if (!stopped) setAlerts(list); } catch { return; }
    };
    pollNotifications();
    const a = setInterval(pollNotifications, 5000);
    const b = setInterval(pollAlerts, 10000);
    const c = setInterval(() => setNow(Date.now()), 15000);
    return () => { stopped = true; clearInterval(a); clearInterval(b); clearInterval(c); };
  }, []);

  const user = useMemo(() => users.find(u => u.role === role) || {name: role, email: '', role}, [users, role]);

  const updateAlert = async (id, status) => {
    const updated = await api.updateAlert(id, status, user.name);
    setAlerts(previous => previous.map(a => a.id === id ? {...a, status, reviewedBy: user.name, ...updated} : a));
  };

  const addAlert = useCallback((room, score, kind = 'behavior') => {
    const sound = kind === 'sound';
    const moment = new Date();
    const confidence = Math.round(score * 100);
    const alert = {
      id: `AL-${moment.getTime().toString(36).toUpperCase()}${Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase()}`,
      room: room.name,
      type: sound ? 'Cheating cue (sound)' : 'Unusual behavior',
      model: sound ? 'Sound detection' : 'Behavior detection',
      confidence,
      time: `${pad(moment.getHours())}:${pad(moment.getMinutes())}:${pad(moment.getSeconds())}`,
      date: `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`,
      createdAt: moment.toISOString(),
      priority: confidence >= 90 ? 'High' : confidence >= 75 ? 'Medium' : 'Low',
      status: 'Pending',
      detail: sound
        ? `The microphone in ${room.name} picked up a cheating cue (${confidence}%). Supervisor review required.`
        : `The behavior model classified a live camera frame in ${room.name} as suspicious (${confidence}%). Supervisor review required.`,
    };
    setAlerts(previous => [alert, ...previous]);
    api.createAlert(alert)
      .then(saved => { if (saved?.notification) setNotifications(prev => prev.some(n => n.id === saved.notification.id) ? prev : [saved.notification, ...prev]); })
      .catch(console.error);
  }, []);

  const markNotificationsRead = async id => {
    setNotifications(previous => previous.map(n => !id || n.id === id ? {...n, read: true} : n));
    try { await api.markNotificationsRead(id); } catch (error) { console.error(error); }
  };

  const addSession = async session => {
    const created = await api.createSession(session);
    setSessions(previous => [...previous, created]);
    return created;
  };
  const deleteSession = async id => {
    await api.deleteSession(id);
    setSessions(previous => previous.filter(s => s.id !== id));
  };

  const addRoom = async room => {
    const created = await api.createRoom(room);
    setRooms(previous => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  };
  const updateRoom = async (id, patch) => {
    const updated = await api.updateRoom(id, patch);
    setRooms(previous => previous.map(r => r.id === id ? {...r, ...updated} : r));
    return updated;
  };
  const deleteRoom = async id => {
    await api.deleteRoom(id);
    setRooms(previous => previous.filter(r => r.id !== id));
  };

  const risks = useMemo(() => Object.fromEntries(rooms.map(r => [r.name, roomRisk(alerts, r.name, rules, now)])), [rooms, alerts, rules, now]);
  const worstLevel = useMemo(() => Object.values(risks).reduce((w, r) => LEVEL_RANK[r.level] > LEVEL_RANK[w] ? r.level : w, 'normal'), [risks]);
  const dateAlerts = useMemo(() => selectedDate ? alerts.filter(a => a.date === selectedDate) : alerts, [alerts, selectedDate]);
  const trend = useMemo(() => buildTrend(dateAlerts), [dateAlerts]);

  const value = useMemo(() => ({
    alerts, dateAlerts, selectedDate, setSelectedDate, rooms, users, sessions, trend, rules, risks, worstLevel, notifications,
    role, setRole, user, loading, updateAlert, addAlert, markNotificationsRead, addSession, deleteSession, addRoom, updateRoom, deleteRoom,
  }), [alerts, dateAlerts, selectedDate, rooms, users, sessions, trend, rules, risks, worstLevel, notifications, role, user, loading, addAlert]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useApp = () => useContext(Context);
