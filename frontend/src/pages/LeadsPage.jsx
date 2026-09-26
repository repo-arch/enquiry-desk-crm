import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { LeadStatusBadge } from '../components/ui';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open leads' },
  { key: 'enquiry_raised', label: 'Enquiry raised' },
  { key: 'not_converted', label: 'Not converted' },
];

export default function LeadsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [companies, setCompanies] = useState([]);
  const [q, setQ] = useState('');

  const load = async (status) => setRows(await api.get(`/leads${status ? `?status=${status}` : ''}`));
  useEffect(() => { load(filter); }, [filter]);

  useEffect(() => {
    if (!q.trim()) { setCompanies([]); return; }
    const t = setTimeout(async () => setCompanies(await api.get(`/companies?q=${encodeURIComponent(q)}`)), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold">Leads &amp; Enquiries</h1>
          <p className="mt-1 text-sm text-ink/60">A lead can only be started against a company already in the Company Master.</p>
        </div>
        <div className="w-72">
          <input
            className="input"
            placeholder="Find a company to start a new lead…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {companies.length > 0 && (
            <div className="mt-1 max-h-56 overflow-y-auto rounded-sm border border-line bg-surface shadow-sm">
              {companies.map((c) => (
                <Link key={c.id} to={`/companies/${c.id}`} className="block px-3 py-2 text-sm hover:bg-teal-50">
                  <span className="font-mono text-ink/50">{c.code}</span> {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mb-5 flex gap-1 border-b border-line">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              filter === f.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/40">
            <th className="py-2">Company</th>
            <th className="py-2">Type</th>
            <th className="py-2">Internal Co.</th>
            <th className="py-2">Source</th>
            <th className="py-2">Status</th>
            <th className="py-2">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-teal-50/40">
              <td className="py-2.5"><Link to={`/leads/${r.id}`} className="font-medium hover:underline">{r.company_name}</Link> <span className="font-mono text-xs text-ink/40">{r.company_code}</span></td>
              <td className="py-2.5 text-ink/60">{r.entry_type === 'direct' ? 'Direct' : 'Lead'}</td>
              <td className="py-2.5 text-ink/60">{r.internal_company_name}</td>
              <td className="py-2.5 text-ink/60">{r.source_name}</td>
              <td className="py-2.5"><LeadStatusBadge status={r.status} /></td>
              <td className="py-2.5 text-ink/40">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="py-8 text-center text-ink/40">Nothing here yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
