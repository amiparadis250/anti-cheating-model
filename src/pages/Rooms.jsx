import React, {useState} from 'react';
import {DoorOpen, Plus, Pencil, Trash2} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {PageHeader, Card, StatusBadge, EmptyState, ActionButton, Pagination, usePagination} from '../components/ui/Primitives';
import {RiskBadge} from '../components/monitoring/RoomRisk';

const field = 'border border-slate-200 rounded-xl px-3 py-2.5 text-sm w-full bg-white outline-none focus:border-[#0071e3] disabled:bg-slate-50 disabled:text-slate-500';
const blank = {name: '', school: '', candidates: 0, status: 'Standby', assignedTo: ''};

export default function Rooms() {
  const {rooms, risks, rules, users, role, addRoom, updateRoom, deleteRoom} = useApp();
  const canEdit = ['Administrator', 'Coordinator'].includes(role);
  const pager = usePagination(rooms, 8);
  const supervisors = users.filter(u => u.role === 'Supervisor');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm(prev => ({...prev, [key]: value}));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const details = {school: form.school, candidates: Number(form.candidates) || 0, status: form.status, assignedTo: form.assignedTo};
      if (form.id) await updateRoom(form.id, details);
      else await addRoom({...details, name: form.name});
      setForm(null);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async room => {
    if (!window.confirm(`Delete ${room.name}? Its past alerts are kept.`)) return;
    try { await deleteRoom(room.id); } catch (err) { window.alert(err.message); }
  };

  return <>
    <PageHeader title="Examination rooms" description="Create rooms and assign supervisors. Each room has one camera and one microphone.">
      {canEdit && !form && <ActionButton onClick={() => { setError(''); setForm(blank); }} className="inline-flex items-center gap-1.5"><Plus size={14}/> Add room</ActionButton>}
    </PageHeader>

    {form && <Card className="p-6 mb-6">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-semibold text-[#1d1d1f]">{form.id ? `Edit ${form.name}` : 'New room'}</h2>
        <div className="grid md:grid-cols-5 gap-4">
          <label className="text-xs text-slate-500 md:col-span-2">Room name<input required autoFocus={!form.id} disabled={Boolean(form.id)} className={`${field} mt-1.5`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Room C-301"/></label>
          <label className="text-xs text-slate-500 md:col-span-2">School or centre<input className={`${field} mt-1.5`} value={form.school || ''} onChange={e => set('school', e.target.value)}/></label>
          <label className="text-xs text-slate-500">Candidates<input type="number" min="0" max="5000" className={`${field} mt-1.5`} value={form.candidates} onChange={e => set('candidates', e.target.value)}/></label>
          <label className="text-xs text-slate-500">Session status<select className={`${field} mt-1.5`} value={form.status} onChange={e => set('status', e.target.value)}><option>Standby</option><option>Monitoring</option></select></label>
          <label className="text-xs text-slate-500 md:col-span-2">Supervisor<select className={`${field} mt-1.5`} value={form.assignedTo || ''} onChange={e => set('assignedTo', e.target.value)}><option value="">Not assigned</option>{supervisors.map(s => <option key={s.id}>{s.name}</option>)}</select></label>
        </div>
        {form.id && <p className="text-[11px] text-slate-400">The room name cannot be changed because its alerts are recorded under that name.</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-rose-600">{error}</p>
          <div className="flex gap-2">
            <ActionButton variant="outline" onClick={() => setForm(null)}>Cancel</ActionButton>
            <button disabled={busy} className="bg-[#0071e3] text-white hover:bg-[#0077ed] px-5 py-2.5 rounded-full text-xs font-semibold disabled:opacity-50">{form.id ? 'Save changes' : 'Create room'}</button>
          </div>
        </div>
      </form>
    </Card>}

    <Card className="overflow-hidden">
      {rooms.length === 0
        ? <EmptyState icon={DoorOpen} title="No rooms yet" text={canEdit ? 'Use Add room to create the first one.' : 'An administrator or coordinator needs to add rooms.'}/>
        : <>
          <div className="table-scroll"><table>
            <thead><tr>
              <th>Room</th><th>School</th><th>Candidates</th><th>Supervisor</th>
              <th>Cheating cues (limit {rules.cueLimit})</th><th>Suspicious (limit {rules.suspiciousLimit})</th><th>Room status</th><th>Session</th>{canEdit && <th/>}
            </tr></thead>
            <tbody>{pager.rows.map(r => {
              const risk = risks[r.name] || {behavior: 0, cue: 0, level: 'normal'};
              return <tr key={r.id}>
                <td><div className="font-semibold text-[#1d1d1f]">{r.name}</div><div className="text-[11px] text-slate-400">{r.id}</div></td>
                <td>{r.school || '-'}</td>
                <td className="tabular-nums">{r.candidates}</td>
                <td>{r.assignedTo || '-'}</td>
                <td className={`tabular-nums font-semibold ${risk.cue > rules.cueLimit ? 'text-[#ff3b30]' : ''}`}>{risk.cue}</td>
                <td className={`tabular-nums font-semibold ${risk.behavior > rules.suspiciousLimit ? 'text-[#ff3b30]' : ''}`}>{risk.behavior}</td>
                <td><RiskBadge level={risk.level}/></td>
                <td><StatusBadge status={r.status}/></td>
                {canEdit && <td><div className="flex gap-3 justify-end">
                  <button onClick={() => { setError(''); setForm({...r, school: r.school || '', assignedTo: r.assignedTo || ''}); }} className="text-slate-400 hover:text-[#0071e3]" aria-label={`Edit ${r.name}`} title="Edit"><Pencil size={16}/></button>
                  <button onClick={() => remove(r)} className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${r.name}`} title="Delete"><Trash2 size={16}/></button>
                </div></td>}
              </tr>;
            })}</tbody>
          </table></div>
          <Pagination pager={pager}/>
        </>}
    </Card>
  </>;
}
