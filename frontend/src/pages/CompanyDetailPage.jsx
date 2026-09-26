import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorText, LeadStatusBadge, Money, Select, StageBadge } from '../components/ui';

export default function CompanyDetailPage({ masters }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rollup, setRollup] = useState(null);
  const [internalCompanyId, setInternalCompanyId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const load = async () => setRollup(await api.get(`/companies/${id}/rollup`));
  useEffect(() => { load(); }, [id]);

  const start = async (entryType) => {
    setError('');
    if (!internalCompanyId) { setError('Select Internal Company first — this is mandatory before Lead / Direct-to-Enquiry.'); return; }
    if (!sourceId) { setError('Source is mandatory.'); return; }
    setStarting(true);
    try {
      const lead = await api.post('/leads', {
        company_id: Number(id),
        internal_company_id: internalCompanyId,
        division_id: divisionId || null,
        source_id: sourceId,
        entry_type: entryType,
      });
      navigate(`/leads/${lead.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (!rollup) return <p className="text-sm text-ink/40">Loading…</p>;
  const { company, leads } = rollup;

  return (
    <div>
      <Link to="/companies" className="text-xs text-teal-600 hover:underline">← All companies</Link>
      <header className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{company.name}</h1>
          <p className="mt-1 font-mono text-sm text-ink/50">{company.code} · {company.state || '—'}, {company.country || '—'} · {company.domestic_export}</p>
        </div>
      </header>

      <section className="card mb-8 p-5">
        <h2 className="mb-1 text-[15px] font-semibold">★ Select Internal Company</h2>
        <p className="mb-4 text-sm text-ink/60">Mandatory before starting a Lead or Direct-to-Enquiry. Carries forward as the default and stays editable per-record.</p>
        <div className="grid grid-cols-3 gap-3">
          <Select label="Internal Company" value={internalCompanyId} onChange={setInternalCompanyId} options={masters.internalCompanies} required />
          <Select label="Division" value={divisionId} onChange={setDivisionId} options={masters.divisions} />
          <Select label="Source" value={sourceId} onChange={setSourceId} options={masters.sources} required />
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-4 flex gap-3">
          <button className="btn btn-secondary" disabled={starting} onClick={() => start('lead')}>
            Start as Lead <span className="text-ink/40">(general contact)</span>
          </button>
          <button className="btn btn-primary" disabled={starting} onClick={() => start('direct')}>
            Direct-to-Enquiry <span className="text-white/70">(clear product enquiry)</span>
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Account roll-up — all leads, enquiries &amp; products</h2>
        {leads.length === 0 && <p className="text-sm text-ink/40">No leads or enquiries recorded yet.</p>}
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{l.entry_type === 'direct' ? 'Direct-to-Enquiry' : 'Lead'}</span>
                  <span className="text-ink/40">·</span>
                  <span className="text-ink/60">{l.internal_company_name}</span>
                  <span className="text-ink/40">·</span>
                  <span className="text-ink/60">{l.source_name}</span>
                  <span className="text-ink/40">·</span>
                  <span className="text-ink/40">{new Date(l.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <LeadStatusBadge status={l.status} />
                  <Link to={`/leads/${l.id}`} className="text-xs font-medium text-teal-600 hover:underline">Open →</Link>
                </div>
              </div>

              {l.query_text && <p className="mt-2 text-sm text-ink/60">"{l.query_text}"</p>}
              {l.status === 'not_converted' && <p className="mt-2 text-sm text-rose-500">Not converted — {l.closure_reason}</p>}

              {l.products?.length > 0 && (
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/40">
                      <th className="py-1.5">SF</th>
                      <th className="py-1.5">Enquiry Amt</th>
                      <th className="py-1.5">P.O. Amt</th>
                      <th className="py-1.5">Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {l.products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-1.5 font-mono">{p.sf_code} <span className="font-sans text-ink/50">{p.sf_name}</span></td>
                        <td className="py-1.5"><Money value={p.amount} /></td>
                        <td className="py-1.5"><Money value={p.po_value} /></td>
                        <td className="py-1.5"><StageBadge stage={p.pipeline_stage} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
