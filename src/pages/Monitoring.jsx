import React, {useState} from 'react';
import {DoorOpen} from 'lucide-react';
import {PageHeader, SectionTitle, EmptyState, Card} from '../components/ui/Primitives';
import {CameraCard} from '../components/monitoring/CameraCard';
import {AlertTable, ReviewModal} from '../components/monitoring/AlertTable';
import {RISK} from '../components/monitoring/RoomRisk';
import {useApp} from '../context/AppContext';

export default function Monitoring() {
  const {rooms, dateAlerts: alerts, risks} = useApp();
  const [selected, setSelected] = useState(null);
  const counts = {normal: 0, warning: 0, critical: 0};
  rooms.forEach(r => { counts[risks[r.name]?.level || 'normal']++; });

  return <>
    <PageHeader title="Live monitoring" description="Each room has its own camera and microphone. Rooms turn amber or red when detections go above the limits."/>
    <div className="grid grid-cols-3 gap-3 mb-6 max-w-xl">
      {Object.entries(RISK).map(([level, style]) => <div key={level} className={`rounded-2xl px-4 py-3 ${level === 'critical' && counts.critical ? 'bg-[#ff3b30] text-white' : level === 'warning' && counts.warning ? 'bg-[#ff9f0a] text-white' : 'bg-white border border-slate-200'}`}>
        <p className="text-2xl font-semibold tabular-nums">{counts[level]}</p>
        <p className="text-[11px] opacity-80">{style.label} {counts[level] === 1 ? 'room' : 'rooms'}</p>
      </div>)}
    </div>
    {rooms.length === 0
      ? <Card><EmptyState icon={DoorOpen} title="No rooms yet" text="Add examination rooms on the Exam rooms page, then connect a camera and microphone to each."/></Card>
      : <div className="grid xl:grid-cols-2 gap-5">{rooms.map(room => <CameraCard key={room.id} room={room}/>)}</div>}
    <div className="mt-8">
      <SectionTitle title="Latest detection alerts" subtitle="From the behavior, phone and audio models"/>
      <AlertTable pageSize={5} alerts={alerts} onView={setSelected}/>
    </div>
    <ReviewModal alert={selected} onClose={() => setSelected(null)}/>
  </>;
}
