import React from 'react';
import {NavLink} from 'react-router-dom';
import {Activity, LayoutDashboard, MonitorPlay, ShieldAlert, Users, CalendarDays, BarChart3, Settings, X, GraduationCap} from 'lucide-react';
import {useApp} from '../../context/AppContext';

export const links = [
  {to: '/', label: 'Overview', icon: LayoutDashboard},
  {to: '/monitoring', label: 'Live monitoring', icon: MonitorPlay},
  {to: '/alerts', label: 'Detection alerts', icon: ShieldAlert},
  {to: '/rooms', label: 'Exam rooms', icon: GraduationCap},
  {to: '/sessions', label: 'Exam sessions', icon: CalendarDays},
  {to: '/reports', label: 'Reports & analytics', icon: BarChart3},
  {to: '/users', label: 'User management', icon: Users},
  {to: '/settings', label: 'Settings', icon: Settings},
];

export function Sidebar({open, onClose}) {
  const {role, alerts, risks} = useApp();
  const pending = alerts.filter(a => a.status === 'Pending').length;
  const levels = Object.values(risks).map(r => r.level);
  const critical = levels.filter(l => l === 'critical').length;
  const warning = levels.filter(l => l === 'warning').length;
  const visible = links.filter(l =>
    !(l.to === '/users' && role !== 'Administrator') &&
    !(l.to === '/settings' && role !== 'Administrator') &&
    !(l.to === '/sessions' && role === 'Supervisor'));

  return <>
    <div onClick={onClose} className={`md:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm ${open ? 'block' : 'hidden'}`}/>
    <aside className={`fixed z-40 inset-y-0 left-0 w-[248px] bg-white/70 backdrop-blur-2xl border-r border-black/5 flex flex-col transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="px-6 pt-7 pb-7 flex items-start justify-between">
        <div className="flex gap-3 items-center">
          <div>
            <div className="font-semibold text-[#1d1d1f] text-xl tracking-tight">Ukuri<span className="text-[#0071e3]"> AI</span></div>
            <div className="text-[10px] tracking-[.14em] text-[#86868b] font-medium">EXAM INTEGRITY</div>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden text-[#1d1d1f]" aria-label="Close menu"><X size={20}/></button>
      </div>
      <div className="px-3 flex-1 overflow-y-auto">
        <p className="text-[11px] text-[#86868b] px-3 mb-2 font-semibold">Workspace</p>
        <nav className="space-y-0.5">
          {visible.map(({to, label, icon: Icon}) =>
            <NavLink end={to === '/'} onClick={onClose} key={to} to={to} className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}><Icon size={18}/>{label}</NavLink>)}
        </nav>
      </div>
      <div className="px-4 pb-5">
        <div className="rounded-2xl p-4 bg-[#f5f5f7]">
          <div className="flex items-center gap-2 text-[#1d1d1f] text-xs font-semibold"><Activity size={15} className={critical ? 'text-[#ff3b30]' : 'text-[#0071e3]'}/> Room status</div>
          <p className={`text-[11px] leading-5 mt-2 ${critical ? 'text-[#ff3b30] font-semibold' : 'text-[#6e6e73]'}`}>{critical ? `${critical} room${critical === 1 ? '' : 's'} critical` : warning ? `${warning} room${warning === 1 ? '' : 's'} on warning` : 'All rooms normal'}</p>
          <p className="text-[11px] leading-5 text-[#86868b]">{pending} alert{pending === 1 ? '' : 's'} awaiting review</p>
        </div>
      </div>
    </aside>
  </>;
}
