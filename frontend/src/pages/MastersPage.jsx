import { useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorText, Select, TextInput } from '../components/ui';

const TABS = [
  { key: 'internal-companies', label: 'Internal Company' },
  { key: 'categories', label: 'Category' },
  { key: 'dosage-forms', label: 'Dosage Form' },
  { key: 'divisions', label: 'Division' },
  { key: 'sources', label: 'Source' },
  { key: 'qty-units', label: 'Qty Unit' },
  { key: 'sf', label: 'SF (Product) Codes' },
];

export default function MastersPage({ masters }) {
  const [tab, setTab] = useState('internal-companies');

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Masters</h1>
        <p className="mt-1 text-sm text-ink/60">
          Every dropdown used elsewhere in the CRM pulls from these lists. Add new entries here — they appear immediately wherever that field is used.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sf' ? <SfMaster masters={masters} /> : <SimpleMaster key={tab} masterKey={tab} masters={masters} />}
    </div>
  );
}

function SimpleMaster({ masterKey, masters }) {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setRows(await api.get(`/masters/${masterKey}`));
    setLoading(false);
  };

  useEffect(() => { load(); }, [masterKey]);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.post(`/masters/${masterKey}`, { name });
      setName('');
      await load();
      masters.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (row) => {
    await api.patch(`/masters/${masterKey}/${row.id}`, { active: row.active ? 0 : 1 });
    await load();
    masters.reload();
  };

  return (
    <div className="max-w-lg">
      <form onSubmit={add} className="mb-5 flex items-end gap-2">
        <div className="flex-1">
          <TextInput label="Add new entry" value={name} onChange={setName} placeholder="e.g. New value" />
        </div>
        <button className="btn btn-primary">Add</button>
      </form>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-2.5">
              <span className={`text-sm ${r.active ? '' : 'text-ink/30 line-through'}`}>{r.name}</span>
              <button onClick={() => toggleActive(r)} className="text-xs font-medium text-teal-600 hover:underline">
                {r.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink/40">Nothing here yet.</li>}
        </ul>
      )}
    </div>
  );
}

function SfMaster({ masters }) {
  const [rows, setRows] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  const load = async () => setRows(await api.get('/masters/sf/list'));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.post('/masters/sf/list', { code: code || undefined, name, category_id: categoryId || null });
      setCode(''); setName(''); setCategoryId('');
      await load();
      masters.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (row) => {
    await api.patch(`/masters/sf/list/${row.id}`, { active: row.active ? 0 : 1 });
    await load();
    masters.reload();
  };

  return (
    <div>
      <form onSubmit={add} className="mb-5 grid max-w-2xl grid-cols-4 items-end gap-3">
        <TextInput label="SF Code (optional)" value={code} onChange={setCode} placeholder="auto-generated" />
        <div className="col-span-2">
          <TextInput label="Product / Formulation name" value={name} onChange={setName} placeholder="e.g. Paracetamol 500mg" required />
        </div>
        <Select label="Category" value={categoryId} onChange={setCategoryId} options={masters.categories} placeholder="Optional" />
        <div className="col-span-4">
          <button className="btn btn-primary">Add SF code</button>
        </div>
      </form>
      <ErrorText>{error}</ErrorText>

      <table className="w-full max-w-2xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/40">
            <th className="py-2">Code</th>
            <th className="py-2">Product</th>
            <th className="py-2">Category</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'text-ink/30'}>
              <td className="py-2 font-mono">{r.code}</td>
              <td className="py-2">{r.name}</td>
              <td className="py-2 text-ink/50">{r.category_name || '—'}</td>
              <td className="py-2 text-right">
                <button onClick={() => toggleActive(r)} className="text-xs font-medium text-teal-600 hover:underline">
                  {r.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-ink/40">No SF codes yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
