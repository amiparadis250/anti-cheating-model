import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {Card, SectionTitle, EmptyState} from '../ui/Primitives';
import {RiskBadge, RiskMeters, RISK, riskHeadline} from './RoomRisk';
import {LEVEL_RANK} from '../../shared/risk';
import {useApp} from '../../context/AppContext';

export function RoomStatusGrid() {
  const {rooms, risks, rules} = useApp();
  const sorted = [...rooms].sort((a, b) => LEVEL_RANK[risks[b.name]?.level || 'normal'] - LEVEL_RANK[risks[a.name]?.level || 'normal'] || a.name.localeCompare(b.name));

  return <div className="mt-6">
    <div className="flex items-center justify-between mb-4">
      <SectionTitle title="Room status" subtitle={`Cheating cues above ${rules.cueLimit} or suspicious behavior above ${rules.suspiciousLimit} in ${rules.windowMinutes} minutes`}/>
      <Link to="/monitoring" className="text-xs font-semibold text-cyanbrand flex gap-1 items-center">Open live monitoring <ArrowRight size={15}/></Link>
    </div>
    {sorted.length === 0
      ? <Card><EmptyState title="No rooms yet" text="Add rooms on the Exam rooms page."/></Card>
      : <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{sorted.map(room => {
          const risk = risks[room.name] || {behavior: 0, cue: 0, level: 'normal'};
          return <Link to="/monitoring" key={room.id} className={`panel lift p-4 border-2 block ${RISK[risk.level].ring}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold text-sm text-[#1d1d1f] truncate">{room.name}</p><p className="text-[11px] text-[#86868b] truncate">{room.assignedTo || 'No supervisor assigned'}</p></div>
              <RiskBadge level={risk.level}/>
            </div>
            <div className="mt-4"><RiskMeters risk={risk} rules={rules}/></div>
            {risk.level !== 'normal' && <p className={`text-[11px] mt-3 font-medium ${RISK[risk.level].text}`}>{riskHeadline(risk)}</p>}
          </Link>;
        })}</div>}
  </div>;
}
