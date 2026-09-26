import { useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorText, Money, Select, TextInput } from '../components/ui';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [fields, setFields] = useState([]);
  const [targets, setTargets] = useState([]);
  const [reports, setReports] = useState({});

  const loadSummary = () => api.get('/dashboard/summary').then(setSummary);
  const loadFields = () => api.get('/dashboard/fields').then(setFields);
  const loadTargets = async () => {
    const rows = await api.get('/dashboard/targets');
    setTargets(rows);
    const entries = await Promise.all(rows.map(async (t) => [t.id, await api.get(`/dashboard/targets/${t.id}/report`)]));
    setReports(Object.fromEntries(entries));
  };

  useEffect(() => { loadSummary(); loadFields(); loadTargets(); }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Target-Based Dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">Build a target on any combination of fields, save it as a view, and track achievement automatically.</p>
      </header>

      {summary && <SummaryStrip summary={summary} />}

      <div className="mt-8 grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <NewTargetForm fields={fields} onCreated={loadTargets} />
        </div>
        <div className="col-span-3 space-y-3">
          <h2 className="text-[15px] font-semibold">Saved views</h2>
          {targets.length === 0 && <p className="text-sm text-ink/40">No target views yet — build one on the left.</p>}
          {targets.map((t) => (
            <TargetCard key={t.id} target={t} report={reports[t.id]} onDeleted={loadTargets} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryStrip({ summary }) {
  const byStage = Object.fromEntries(summary.stageCounts.map((s) => [s.pipeline_stage, s]));
  const cards = [
    { label: 'Companies', value: summary.totalCompanies },
    { label: 'Quotation', value: byStage['Quotation']?.c || 0, sub: <Money value={byStage['Quotation']?.enquiry_total || 0} /> },
    { label: 'Negotiation', value: byStage['Negotiation']?.c || 0, sub: <Money value={byStage['Negotiation']?.enquiry_total || 0} /> },
    { label: 'P.O. Raised', value: byStage['P.O. Raised']?.c || 0, sub: <Money value={byStage['P.O. Raised']?.po_total || 0} /> },
    { label: 'Order Lost', value: byStage['Order Lost']?.c || 0 },
  ];
  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink/40">{c.label}</div>
          <div className="mt-1 font-mono text-2xl">{c.value}</div>
          {c.sub && <div className="mt-0.5 text-xs text-ink/50">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function periodDefault(type) {
  const now = new Date();
  if (type === 'monthly') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (type === 'quarterly') return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  return `${now.getFullYear()}`;
}

function NewTargetForm({ fields, onCreated }) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('value');
  const [periodType, setPeriodType] = useState('monthly');
  const [periodValue, setPeriodValue] = useState(periodDefault('monthly'));
  const [amount, setAmount] = useState('');
  const [filters, setFilters] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const changePeriodType = (t) => { setPeriodType(t); setPeriodValue(periodDefault(t)); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name this view.'); return; }
    if (!amount) { setError('Target amount is required.'); return; }
    setSaving(true);
    try {
      await api.post('/dashboard/targets', { name, metric, period_type: periodType, period_value: periodValue, target_amount: amount, filters });
      setName(''); setAmount(''); setFilters({});
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <h2 className="text-[15px] font-semibold">Build a target</h2>
      <TextInput label="View name" value={name} onChange={setName} placeholder="e.g. Chimak — Sep value target" required />

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Metric</span>
          <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="value">Value (₹)</option>
            <option value="qty">Quantity</option>
          </select>
        </label>
        <TextInput label="Target amount" type="number" value={amount} onChange={setAmount} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Period</span>
          <select className="input" value={periodType} onChange={(e) => changePeriodType(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <TextInput label="Period value" value={periodValue} onChange={setPeriodValue} placeholder={periodType === 'monthly' ? 'YYYY-MM' : periodType === 'quarterly' ? 'YYYY-Q1..Q4' : 'YYYY'} />
      </div>

      <div>
        <span className="label">Filter by (optional — combine any fields)</span>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <Select
              key={f.key}
              label={f.label}
              value={filters[f.key] ?? ''}
              onChange={(v) => setFilters((prev) => ({ ...prev, [f.key]: v || undefined }))}
              options={f.options}
            />
          ))}
        </div>
      </div>

      <ErrorText>{error}</ErrorText>
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save target view'}</button>
    </form>
  );
}

function TargetCard({ target, report, onDeleted }) {
  const remove = async () => {
    await api.del(`/dashboard/targets/${target.id}`);
    onDeleted();
  };
  const pct = report?.pct_achieved ?? 0;
  const barColor = pct >= 100 ? 'bg-teal-600' : pct >= 60 ? 'bg-clay-400' : 'bg-rose-500';

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{target.name}</div>
          <div className="text-xs text-ink/50">
            {target.metric === 'value' ? 'Value' : 'Quantity'} · {target.period_type} {target.period_value}
          </div>
        </div>
        <button onClick={remove} className="text-xs text-rose-500 hover:underline">Remove</button>
      </div>

      {report && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span><Money value={report.achieved} /> <span className="text-ink/40">/ <Money value={target.target_amount} /></span></span>
            <span className="font-mono text-ink/60">{report.pct_achieved}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="mt-1 text-xs text-ink/40">
            {report.variance >= 0 ? 'Ahead by ' : 'Behind by '}<Money value={Math.abs(report.variance)} />
          </div>
        </div>
      )}
    </div>
  );
}
