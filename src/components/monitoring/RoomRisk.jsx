import React from 'react';
import {ShieldCheck, TriangleAlert, OctagonAlert} from 'lucide-react';

export const RISK = {
  normal: {label: 'Normal', icon: ShieldCheck, badge: 'bg-emerald-50 text-emerald-700', ring: 'border-slate-200', bar: 'bg-[#34c759]', text: 'text-emerald-700'},
  warning: {label: 'Warning', icon: TriangleAlert, badge: 'bg-amber-100 text-amber-800', ring: 'border-[#ff9f0a] ring-4 ring-[#ff9f0a]/15', bar: 'bg-[#ff9f0a]', text: 'text-amber-700'},
  critical: {label: 'Critical', icon: OctagonAlert, badge: 'bg-[#ff3b30] text-white animate-pulse', ring: 'border-[#ff3b30] ring-4 ring-[#ff3b30]/20', bar: 'bg-[#ff3b30]', text: 'text-[#ff3b30]'},
};

export function RiskBadge({level, size = 'md'}) {
  const style = RISK[level] || RISK.normal;
  const Icon = style.icon;
  const pad = size === 'lg' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]';
  return <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad} ${style.badge}`}><Icon size={size === 'lg' ? 15 : 13}/>{style.label}</span>;
}

function Meter({label, value, limit}) {
  const over = value > limit;
  const pct = Math.min(100, Math.round((value / (limit + 1)) * 100));
  const tone = over ? 'bg-[#ff3b30]' : value >= limit * 0.6 ? 'bg-[#ff9f0a]' : 'bg-[#34c759]';
  return <div className="flex-1 min-w-0">
    <div className="flex justify-between items-baseline text-[11px]">
      <span className="text-[#6e6e73] truncate">{label}</span>
      <span className={`font-semibold tabular-nums ${over ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>{value}<span className="text-[#86868b] font-normal"> / {limit}</span></span>
    </div>
    <div className="h-2 rounded-full bg-black/[.06] mt-1.5 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{width: `${pct}%`}}/></div>
  </div>;
}

export function RiskMeters({risk, rules}) {
  return <div className="flex gap-4">
    <Meter label="Cheating cues" value={risk.cue} limit={rules.cueLimit}/>
    <Meter label="Suspicious behavior" value={risk.behavior} limit={rules.suspiciousLimit}/>
  </div>;
}

export function riskHeadline(risk) {
  if (risk.level === 'critical') return 'Cheating cues and suspicious behavior are both above the limit. Go to this room now.';
  if (risk.kind === 'behavior') return 'Suspicious behavior is above the limit.';
  if (risk.kind === 'sound') return 'Cheating cues are above the limit.';
  return 'Within normal limits.';
}
