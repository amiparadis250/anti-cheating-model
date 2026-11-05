import React from 'react';
import {Users} from 'lucide-react';
import {LiveBehaviorCamera} from './LiveBehaviorCamera';
import {RoomMic} from './RoomMic';
import {RiskBadge, RiskMeters, RISK, riskHeadline} from './RoomRisk';
import {useApp} from '../../context/AppContext';

export function CameraCard({room}) {
  const {risks, rules} = useApp();
  const risk = risks[room.name] || {behavior: 0, cue: 0, level: 'normal', kind: null};
  const style = RISK[risk.level];

  return <div className={`overflow-hidden rounded-[22px] border-2 bg-white transition-all duration-500 ${style.ring}`}>
    {risk.level !== 'normal' && <div className={`px-4 py-2 text-xs font-semibold text-white ${risk.level === 'critical' ? 'bg-[#ff3b30]' : 'bg-[#ff9f0a]'}`}>
      {risk.level === 'critical' ? 'CRITICAL' : 'WARNING'} - {riskHeadline(risk)}
    </div>}
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
      <div className="min-w-0">
        <p className="font-semibold text-[15px] text-[#1d1d1f] truncate">{room.name}</p>
        <p className="text-[11px] text-[#86868b] mt-0.5 flex items-center gap-1.5"><Users size={12}/>{room.candidates} candidates{room.assignedTo ? ` - ${room.assignedTo}` : ''}</p>
      </div>
      <RiskBadge level={risk.level} size="lg"/>
    </div>
    <LiveBehaviorCamera room={room}/>
    <RoomMic room={room}/>
    <div className="border-t border-slate-100 px-4 py-3.5 bg-[#fafafc]">
      <RiskMeters risk={risk} rules={rules}/>
      <p className="text-[10px] text-[#86868b] mt-2">Counted over the last {rules.windowMinutes} minutes. Warning above the limit, Critical when both are above.</p>
    </div>
  </div>;
}
