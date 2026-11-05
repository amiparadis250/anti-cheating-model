import React,{useState} from 'react';
import {ArrowUpRight,Inbox,ChevronLeft,ChevronRight} from 'lucide-react';
export const Card=({children,className='',...props})=><section className={`panel ${className}`} {...props}>{children}</section>;
export const PageHeader=({eyebrow='Ukuri AI',title,description,children})=><div className="flex flex-wrap items-end justify-between gap-4 mb-7"><div><p className="text-[11px] font-bold tracking-[.18em] text-cyanbrand mb-2">{eyebrow}</p><h1 className="text-[28px] md:text-[32px] font-bold tracking-tight text-[#1d1d1f]">{title}</h1>{description&&<p className="text-[15px] text-[#6e6e73] mt-2">{description}</p>}</div>{children}</div>;
export function StatusBadge({status}){const styles={Disabled:'bg-slate-100 text-slate-600',Upcoming:'bg-blue-50 text-blue-700',Live:'bg-emerald-50 text-emerald-700',Completed:'bg-slate-100 text-slate-600',Monitoring:'bg-emerald-50 text-emerald-700',Active:'bg-emerald-50 text-emerald-700',Ready:'bg-emerald-50 text-emerald-700',Pending:'bg-amber-50 text-amber-700',Standby:'bg-slate-100 text-slate-600',Reviewed:'bg-blue-50 text-blue-700',Dismissed:'bg-slate-100 text-slate-600',Escalated:'bg-rose-50 text-rose-700',High:'bg-rose-50 text-rose-700',Medium:'bg-amber-50 text-amber-700',Low:'bg-slate-100 text-slate-600'};return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]||'bg-slate-100 text-slate-700'}`}>{(status==='Monitoring'||status==='Live')&&<span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>}{status}</span>}
export const ActionButton=({children,onClick,variant='primary',className='',disabled=false})=><button disabled={disabled} onClick={onClick} className={`${variant==='primary'?'bg-[#0071e3] text-white hover:bg-[#0077ed]':variant==='outline'?'bg-white text-[#1d1d1f] border border-slate-200 hover:bg-slate-50':'bg-slate-100 text-[#1d1d1f] hover:bg-slate-200'} px-5 py-2.5 rounded-full text-xs font-semibold transition active:scale-[.97] disabled:opacity-50 ${className}`}>{children}</button>;
export const EmptyState=({icon:Icon=Inbox,title,text})=><div className="flex flex-col items-center text-center py-12 px-6"><span className="p-3.5 rounded-2xl bg-[#e8f1fd] text-[#0066cc]"><Icon size={24}/></span><p className="font-semibold text-[#1d1d1f] mt-4">{title}</p>{text&&<p className="text-xs text-slate-400 mt-1.5 max-w-sm">{text}</p>}</div>;
export const Metric=({label,value,icon:Icon,note,accent='cyan'})=><Card className="p-5 lift"><div className="flex justify-between items-start"><div className="text-xs font-medium text-slate-500">{label}</div><div className={`p-2.5 rounded-xl ${accent==='red'?'bg-rose-50 text-rose-600':accent==='green'?'bg-emerald-50 text-emerald-600':'bg-blue-50 text-blue-600'}`}><Icon size={18}/></div></div><div className="text-4xl font-semibold mt-3 tracking-tight text-[#1d1d1f]">{value}</div><div className="text-[11px] text-slate-400 mt-2">{note}</div></Card>;
export const SectionTitle=({title,subtitle,link})=><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-[#1d1d1f] text-base">{title}</h2>{subtitle&&<p className="text-xs text-slate-400 mt-1">{subtitle}</p>}</div>{link&&<span className="text-xs text-cyanbrand flex items-center">{link}<ArrowUpRight size={14}/></span>}</div>;

export function usePagination(items, pageSize = 8) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return {rows: items.slice(start, start + pageSize), page: current, pages, setPage, total: items.length, from: items.length ? start + 1 : 0, to: Math.min(start + pageSize, items.length)};
}

const pageList = (page, pages) => {
  if (pages <= 7) return Array.from({length: pages}, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  return list.flatMap((n, i) => i && n - list[i - 1] > 1 ? ['...', n] : [n]);
};

export function Pagination({pager}) {
  const {page, pages, setPage, total, from, to} = pager;
  if (total === 0) return null;
  const btn = 'min-w-8 h-8 px-2 rounded-full text-xs font-medium flex items-center justify-center transition';
  return <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#f0f0f3] text-xs text-[#86868b]">
    <span>Showing {from}-{to} of {total}</span>
    {pages > 1 && <nav className="flex items-center gap-1" aria-label="Pagination">
      <button className={`${btn} hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent`} disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16}/></button>
      {pageList(page, pages).map((n, i) => n === '...'
        ? <span key={`gap${i}`} className="px-1">...</span>
        : <button key={n} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined} className={`${btn} ${n === page ? 'bg-[#0071e3] text-white' : 'text-[#1d1d1f] hover:bg-black/5'}`}>{n}</button>)}
      <button className={`${btn} hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent`} disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={16}/></button>
    </nav>}
  </div>;
}
