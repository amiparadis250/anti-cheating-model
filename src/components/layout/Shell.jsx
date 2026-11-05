import React, {useEffect, useState} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import {Sidebar} from './Sidebar';
import {Header} from './Header';
import {CriticalBanner} from './CriticalBanner';
import Monitoring from '../../pages/Monitoring';

export function Shell() {
  const [open, setOpen] = useState(false);
  const [monitoringStarted, setMonitoringStarted] = useState(false);
  const {pathname} = useLocation();
  const onMonitoring = pathname === '/monitoring';

  useEffect(() => { if (onMonitoring) setMonitoringStarted(true); }, [onMonitoring]);
  useEffect(() => setOpen(false), [pathname]);

  return <div className="min-h-screen">
    <Sidebar open={open} onClose={() => setOpen(false)}/>
    <div className="md:ml-[248px]">
      <Header onMenu={() => setOpen(true)}/>
      <CriticalBanner/>
      <main className="max-w-[1550px] mx-auto px-5 md:px-9 py-8">
        {!onMonitoring && <Outlet/>}
        {monitoringStarted && <div style={{display: onMonitoring ? 'block' : 'none'}}><Monitoring/></div>}
      </main>
      <footer className="px-9 pb-6 text-[11px] text-slate-400">UKURI AI · Examination Integrity System · Flags are for supervisor review and are not proof of misconduct</footer>
    </div>
  </div>;
}
