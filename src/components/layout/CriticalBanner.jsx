import React from 'react';
import {useNavigate} from 'react-router-dom';
import {AlertOctagon} from 'lucide-react';
import {useApp} from '../../context/AppContext';

export function CriticalBanner() {
  const {notifications, markNotificationsRead} = useApp();
  const navigate = useNavigate();
  const critical = notifications.filter(n => n.level === 'critical' && !n.read);
  if (critical.length === 0) return null;
  const latest = critical[0];

  return <div role="alert" className="sticky top-[72px] z-10 bg-[#ff3b30] text-white px-5 md:px-9 py-3 flex flex-wrap items-center gap-3 shadow-lg">
    <AlertOctagon size={20} className="shrink-0 animate-pulse"/>
    <div className="flex-1 min-w-[220px]">
      <p className="text-sm font-semibold">{latest.title}{critical.length > 1 ? ` (+${critical.length - 1} more)` : ''}</p>
      <p className="text-xs text-white/90 mt-0.5">{latest.message}</p>
    </div>
    <button onClick={() => { markNotificationsRead(latest.id); navigate(`/alerts?q=${encodeURIComponent(latest.room)}`); }} className="bg-white text-[#ff3b30] text-xs font-semibold rounded-full px-4 py-2">Review now</button>
    <button onClick={() => markNotificationsRead()} className="text-xs font-medium text-white/90 hover:text-white underline">Dismiss</button>
  </div>;
}
