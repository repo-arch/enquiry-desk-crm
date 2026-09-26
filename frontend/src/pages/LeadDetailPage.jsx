import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorText, LeadStatusBadge, Select, TextArea, TextInput } from '../components/ui';
import ProductCard from '../components/ProductCard';

export default function LeadDetailPage({ masters }) {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [products, setProducts] = useState([]);

  const load = async () => {
    const l = await api.get(`/leads/${id}`);
    setLead(l);
    if (l.status === 'enquiry_raised') {
      setProducts(await api.get(`/enquiries?lead_id=${id}`));
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!lead) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      <Link to={`/companies/${lead.company_id}`} className="text-xs text-teal-600 hover:underline">← {lead.company_name}</Link>

      <header className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {lead.entry_type === 'direct' ? 'Direct-to-Enquiry' : 'Lead'} — {lead.company_name}
          </h1>
          <p className="mt-1 font-mono text-sm text-ink/50">
            {lead.internal_company_name} · {lead.division_name || 'No division'} · {lead.source_name}
          </p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </header>

      {lead.status === 'open' && <OpenLeadPanel lead={lead} onChange={load} />}
      {lead.status === 'not_converted' && (
        <div className="card p-5">
          <p className="text-sm text-rose-500"><strong>Not converted.</strong> {lead.closure_reason}</p>
        </div>
      )}
      {lead.status === 'enquiry_raised' && (
        <EnquiryPanel lead={lead} masters={masters} products={products} reload={load} />
      )}
    </div>
  );
}

function OpenLeadPanel({ lead, onChange }) {
  const [followups, setFollowups] = useState(lead.followups || []);
  const [planned, setPlanned] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const addFollowup = async (e) => {
    e.preventDefault();
    if (!planned && !notes.trim()) return;
    await api.post(`/leads/${lead.id}/followups`, { planned_date: planned || null, notes });
    setPlanned(''); setNotes('');
    const fresh = await api.get(`/leads/${lead.id}`);
    setFollowups(fresh.followups);
  };

  const close = async (e) => {
    e.preventDefault();
    setError('');
    if (!outcome) { setError('Choose an outcome.'); return; }
    if (outcome === 'not_converted' && !reason.trim()) { setError('A reason is mandatory for Not Converted.'); return; }
    setBusy(true);
    try {
      await api.post(`/leads/${lead.id}/close`, { outcome, reason });
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <section className="card p-5">
        <h2 className="mb-3 text-[15px] font-semibold">Query</h2>
        <p className="text-sm text-ink/70">{lead.query_text || <span className="text-ink/30">No query text recorded.</span>}</p>

        <h2 className="mb-3 mt-6 text-[15px] font-semibold">Follow-ups</h2>
        <ul className="mb-3 space-y-2">
          {followups.map((f) => (
            <li key={f.id} className="rounded-sm border border-line px-3 py-2 text-sm">
              <span className="font-mono text-ink/50">{f.planned_date || '—'}</span> {f.notes}
            </li>
          ))}
          {followups.length === 0 && <li className="text-sm text-ink/40">No follow-ups logged yet.</li>}
        </ul>
        <form onSubmit={addFollowup} className="flex items-end gap-2">
          <TextInput type="date" label="Planned date" value={planned} onChange={setPlanned} />
          <div className="flex-1"><TextInput label="Note" value={notes} onChange={setNotes} placeholder="Called, awaiting response…" /></div>
          <button className="btn btn-secondary">Log</button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-[15px] font-semibold">Closure</h2>
        <p className="mb-4 text-sm text-ink/60">Record the outcome to move this lead forward or close it out.</p>
        <form onSubmit={close} className="space-y-4">
          <div className="flex gap-3">
            <label className={`flex-1 cursor-pointer rounded-sm border p-3 text-sm ${outcome === 'enquiry_raised' ? 'border-teal-600 bg-teal-50' : 'border-line'}`}>
              <input type="radio" name="outcome" className="mr-2" checked={outcome === 'enquiry_raised'} onChange={() => setOutcome('enquiry_raised')} />
              Enquiry Raised
            </label>
            <label className={`flex-1 cursor-pointer rounded-sm border p-3 text-sm ${outcome === 'not_converted' ? 'border-rose-500 bg-rose-100' : 'border-line'}`}>
              <input type="radio" name="outcome" className="mr-2" checked={outcome === 'not_converted'} onChange={() => setOutcome('not_converted')} />
              Not Converted
            </label>
          </div>
          {outcome === 'not_converted' && (
            <TextArea label="Reason" value={reason} onChange={setReason} placeholder="Why wasn't this converted?" required />
          )}
          <ErrorText>{error}</ErrorText>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Close lead'}</button>
        </form>
      </section>
    </div>
  );
}

function EnquiryPanel({ lead, masters, products, reload }) {
  const [showForm, setShowForm] = useState(products.length === 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Product-wise enquiry entry</h2>
        <button className="btn btn-secondary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Hide form' : '+ Add product line'}
        </button>
      </div>

      {showForm && <AddProductForm lead={lead} masters={masters} onAdded={() => { reload(); }} />}

      <div className="mt-5 space-y-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onChange={reload} />
        ))}
        {products.length === 0 && !showForm && (
          <p className="text-sm text-ink/40">No product lines yet — add one to begin tracking this enquiry.</p>
        )}
      </div>
    </div>
  );
}

function AddProductForm({ lead, masters, onAdded }) {
  const [internalCompanyId, setInternalCompanyId] = useState(lead.internal_company_id);
  const [sourceId, setSourceId] = useState(lead.source_id);
  const [sfId, setSfId] = useState('');
  const [newSfName, setNewSfName] = useState('');
  const [creatingNewSf, setCreatingNewSf] = useState(false);
  const [dosageFormId, setDosageFormId] = useState('');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [qtyUnitId, setQtyUnitId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const amount = qty && rate ? (Number(qty) * Number(rate)).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!internalCompanyId || !sourceId) { setError('Internal Company and Source are mandatory.'); return; }
    setSaving(true);
    try {
      let finalSfId = sfId;
      if (creatingNewSf) {
        if (!newSfName.trim()) { setError('Enter the new product name.'); setSaving(false); return; }
        const sf = await api.post('/masters/sf/list', { name: newSfName });
        finalSfId = sf.id;
        masters.reload();
      }
      if (!finalSfId) { setError('Select or create an SF (product) code.'); setSaving(false); return; }

      await api.post('/enquiries', {
        lead_id: lead.id,
        internal_company_id: internalCompanyId,
        source_id: sourceId,
        sf_id: finalSfId,
        dosage_form_id: dosageFormId || null,
        qty: qty || null,
        rate: rate || null,
        qty_unit_id: qtyUnitId || null,
      });
      setSfId(''); setNewSfName(''); setCreatingNewSf(false); setDosageFormId(''); setQty(''); setRate(''); setQtyUnitId('');
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Internal Company" value={internalCompanyId} onChange={setInternalCompanyId} options={masters.internalCompanies} required />
        <Select label="Source" value={sourceId} onChange={setSourceId} options={masters.sources} required />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label mb-0">Select SF <span className="text-clay-500">*</span></span>
          <button type="button" className="text-xs font-medium text-teal-600 hover:underline" onClick={() => setCreatingNewSf((s) => !s)}>
            {creatingNewSf ? 'Pick existing instead' : "Product doesn't exist yet →"}
          </button>
        </div>
        {creatingNewSf ? (
          <TextInput value={newSfName} onChange={setNewSfName} placeholder="New product / formulation name" />
        ) : (
          <Select value={sfId} onChange={setSfId} options={masters.sfCodes.map((s) => ({ id: s.id, name: `${s.code} — ${s.name}` }))} placeholder="Choose SF code" />
        )}
      </div>

      <Select label="Dosage Form" value={dosageFormId} onChange={setDosageFormId} options={masters.dosageForms} />

      <div className="grid grid-cols-4 gap-3">
        <TextInput label="Enquiry Qty" type="number" value={qty} onChange={setQty} />
        <Select label="Qty Unit" value={qtyUnitId} onChange={setQtyUnitId} options={masters.qtyUnits} />
        <TextInput label="Rate" type="number" value={rate} onChange={setRate} />
        <label className="block">
          <span className="label">Amount</span>
          <div className="input flex items-center bg-paper font-mono text-ink/60">{amount}</div>
        </label>
      </div>

      <ErrorText>{error}</ErrorText>
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add product line'}</button>
    </form>
  );
}
