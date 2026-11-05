import React from 'react';
import {Database, Gauge, Link2, ShieldAlert} from 'lucide-react';
import {PageHeader, Card} from '../components/ui/Primitives';
import {isBackendUp, API_BASE} from '../services/api';
import {useApp} from '../context/AppContext';

const Row = ({icon: Icon, label, children}) => <div className="flex gap-4 items-start">
  <span className="p-2.5 rounded-xl bg-[#e8f1fd] text-[#0066cc]"><Icon size={18}/></span>
  <div><p className="text-xs text-slate-500">{label}</p><div className="mt-1">{children}</div></div>
</div>;

export default function Settings() {
  const {rules} = useApp();
  return <>
    <PageHeader title="System settings" description="Connection and alert configuration."/>
    <Card className="p-6 max-w-2xl space-y-6">
      <Row icon={Database} label="Data source"><p className="font-semibold">{isBackendUp() ? 'Backend API (saved on the server)' : 'This browser (backend not reachable, data stored locally)'}</p></Row>
      <Row icon={Link2} label="API address"><p className="font-mono text-sm break-all">{API_BASE}</p></Row>
      <Row icon={Gauge} label="Room alert limits">
        <p className="text-sm text-slate-600">A room turns <strong>Warning</strong> when cheating cues go above <strong>{rules.cueLimit}</strong> or suspicious behavior goes above <strong>{rules.suspiciousLimit}</strong> within {rules.windowMinutes} minutes, and <strong>Critical</strong> when both do. Change them with <span className="font-mono text-xs">CUE_LIMIT</span>, <span className="font-mono text-xs">SUSPICIOUS_LIMIT</span> and <span className="font-mono text-xs">ESCALATION_WINDOW_MINUTES</span> in <span className="font-mono text-xs">.env</span>, then restart the server.</p>
      </Row>
      <Row icon={ShieldAlert} label="Access control"><p className="text-sm text-slate-600">The role selector in the profile menu controls which pages are visible. It is not a login.</p></Row>
    </Card>
  </>;
}
