import React, {useState} from 'react';
import {CalendarDays, Plus, Trash2} from 'lucide-react';
import {PageHeader, Card, EmptyState, ActionButton, StatusBadge, Pagination, usePagination} from '../components/ui/Primitives';
import {useApp} from '../context/AppContext';

const today = () => new Date().toLocaleDateString('en-CA');
const field = 'border border-slate-200 rounded-xl px-3 py-2.5 text-sm w-full bg-white';

function sessionStatus(s, now = new Date()) {
  const start = new Date(`${s.date}T${s.start}`), end = new Date(`${s.date}T${s.end}`);
  return now < start ? 'Upcoming' : now <= end ? 'Live' : 'Completed';
}

export default function Sessions() {
  const {sessions, rooms, addSession, deleteSession, role} = useApp();
  const canEdit = ['Administrator', 'Coordinator'].includes(role);
  const empty = {name: '', date: today(), start: '09:00', end: '12:00', rooms: []};
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sorted = [...sessions].sort((a, b) => `${b.date}T${b.start}`.localeCompare(`${a.date}T${a.start}`));
  const pager = usePagination(sorted, 6);
  const set = (key, value) => setForm(prev => ({...prev, [key]: value}));
  const toggleRoom = name => set('rooms', form.rooms.includes(name) ? form.rooms.filter(r => r !== name) : [...form.rooms, name]);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Enter a session name.');
    if (form.end <= form.start) return setError('End time must be after the start time.');
    if (form.rooms.length === 0) return setError('Select at least one room.');
    setBusy(true);
    try { await addSession(form); setForm(empty); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async s => {
    if (window.confirm(`Delete "${s.name}"?`)) {
      try { await deleteSession(s.id); } catch (err) { window.alert(err.message); }
    }
  };

  return <>
    <PageHeader title="Examination sessions" description="Plan sessions and assign the rooms that will be monitored."/>
    {canEdit && <Card className="p-6 mb-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-4">
          <label className="text-xs text-slate-500">Session name<input className={`${field} mt-1.5`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mathematics final"/></label>
          <label className="text-xs text-slate-500">Date<input type="date" className={`${field} mt-1.5`} value={form.date} onChange={e => set('date', e.target.value)}/></label>
          <label className="text-xs text-slate-500">Start<input type="time" className={`${field} mt-1.5`} value={form.start} onChange={e => set('start', e.target.value)}/></label>
          <label className="text-xs text-slate-500">End<input type="time" className={`${field} mt-1.5`} value={form.end} onChange={e => set('end', e.target.value)}/></label>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2">Rooms</p>
          <div className="flex flex-wrap gap-2">
            {rooms.map(r => <button type="button" key={r.id} onClick={() => toggleRoom(r.name)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${form.rooms.includes(r.name) ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'bg-white border-slate-200 text-[#1d1d1f] hover:bg-slate-50'}`}>{r.name}</button>)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-rose-600">{error}</p>
          <ActionButton disabled={busy} onClick={() => {}} className="inline-flex items-center gap-1.5"><Plus size={14}/> Create session</ActionButton>
        </div>
      </form>
    </Card>}

    <Card className="overflow-hidden">
      {sessions.length === 0
        ? <EmptyState icon={CalendarDays} title="No sessions yet" text={canEdit ? "Create the first examination session using the form above." : "Sessions created by a coordinator or administrator will appear here."}/>
        : <>
          <div className="table-scroll"><table>
            <thead><tr><th>Session</th><th>Date</th><th>Time</th><th>Rooms</th><th>Status</th>{canEdit && <th/>}</tr></thead>
            <tbody>{pager.rows.map(s => <tr key={s.id}>
              <td><div className="font-semibold text-[#1d1d1f]">{s.name}</div><div className="text-[11px] text-slate-400">{s.id}</div></td>
              <td>{new Date(`${s.date}T00:00`).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</td>
              <td>{s.start} - {s.end}</td>
              <td className="whitespace-normal max-w-[280px]">{s.rooms.join(', ') || '-'}</td>
              <td><StatusBadge status={sessionStatus(s)}/></td>
              {canEdit && <td><button onClick={() => remove(s)} className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${s.name}`}><Trash2 size={16}/></button></td>}
            </tr>)}</tbody>
          </table></div>
          <Pagination pager={pager}/>
        </>}
    </Card>
  </>;
}
