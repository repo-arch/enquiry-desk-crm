import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ErrorText, Modal, Select, TextInput } from '../components/ui';

export default function CompaniesPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const load = async (query) => setRows(await api.get(`/companies${query ? `?q=${encodeURIComponent(query)}` : ''}`));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Company Master</h1>
          <p className="mt-1 text-sm text-ink/60">One-time record per company. Every lead and enquiry references this master.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New company</button>
      </header>

      <div className="mb-4 max-w-xs">
        <TextInput value={q} onChange={setQ} placeholder="Search company or code…" />
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/40">
            <th className="py-2">Code</th>
            <th className="py-2">Company</th>
            <th className="py-2">State</th>
            <th className="py-2">Country</th>
            <th className="py-2">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-teal-50/40">
              <td className="py-2.5 font-mono"><Link to={`/companies/${r.id}`} className="text-teal-700 hover:underline">{r.code}</Link></td>
              <td className="py-2.5"><Link to={`/companies/${r.id}`} className="hover:underline">{r.name}</Link></td>
              <td className="py-2.5 text-ink/60">{r.state || '—'}</td>
              <td className="py-2.5 text-ink/60">{r.country || '—'}</td>
              <td className="py-2.5 text-ink/60">{r.domestic_export}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="py-8 text-center text-ink/40">No companies yet — add the first one.</td></tr>
          )}
        </tbody>
      </table>

      <NewCompanyModal open={open} onClose={() => setOpen(false)} onCreated={() => load(q)} />
    </div>
  );
}

function NewCompanyModal({ open, onClose, onCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [de, setDe] = useState('Domestic');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setState(''); setCountry(''); setDe('Domestic'); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Company name is required'); return; }
    setSaving(true);
    try {
      const company = await api.post('/companies', { name, state, country, domestic_export: de });
      reset();
      onCreated();
      onClose();
      navigate(`/companies/${company.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="New company">
      <form onSubmit={submit} className="space-y-4">
        <TextInput label="Company name" value={name} onChange={setName} required />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="State" value={state} onChange={setState} />
          <TextInput label="Country" value={country} onChange={setCountry} />
        </div>
        <label className="block">
          <span className="label">Domestic / Export</span>
          <select className="input" value={de} onChange={(e) => setDe(e.target.value)}>
            <option value="Domestic">Domestic</option>
            <option value="Export">Export</option>
          </select>
        </label>
        <ErrorText>{error}</ErrorText>
        <p className="text-xs text-ink/40">A unique company code (C1, C2…) is generated automatically.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={() => { reset(); onClose(); }}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create company'}</button>
        </div>
      </form>
    </Modal>
  );
}
