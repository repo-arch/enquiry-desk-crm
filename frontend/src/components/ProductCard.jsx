import { useState } from 'react';
import { api } from '../api';
import { ErrorText, Money, StageBadge, TextArea, TextInput } from './ui';

const NEXT_STAGE = {
  Quotation: 'Negotiation',
  Negotiation: null, // Negotiation resolves to either P.O. Raised or Order Lost
};

export default function ProductCard({ product, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [followups, setFollowups] = useState(null);
  const [planned, setPlanned] = useState('');
  const [notes, setNotes] = useState('');
  const [showPoForm, setShowPoForm] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [poQty, setPoQty] = useState('');
  const [poRate, setPoRate] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadFollowups = async () => {
    const full = await api.get(`/enquiries/${product.id}`);
    setFollowups(full.followups);
  };

  const toggle = async () => {
    setExpanded((e) => !e);
    if (!followups) await loadFollowups();
  };

  const addFollowup = async (e) => {
    e.preventDefault();
    if (!planned && !notes.trim()) return;
    await api.post(`/enquiries/${product.id}/followups`, { planned_date: planned || null, notes });
    setPlanned(''); setNotes('');
    await loadFollowups();
  };

  const setStage = async (stage) => {
    setError('');
    setBusy(true);
    try {
      await api.post(`/enquiries/${product.id}/stage`, { stage });
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const raisePo = async (e) => {
    e.preventDefault();
    setError('');
    if (!poQty || !poRate) { setError('P.O. Qty and Rate are required.'); return; }
    setBusy(true);
    try {
      await api.post(`/enquiries/${product.id}/stage`, { stage: 'P.O. Raised', po_qty: poQty, po_rate: poRate });
      setShowPoForm(false);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const markLost = async (e) => {
    e.preventDefault();
    setError('');
    if (!lostReason.trim()) { setError('A reason is mandatory.'); return; }
    setBusy(true);
    try {
      await api.post(`/enquiries/${product.id}/stage`, { stage: 'Order Lost', lost_reason: lostReason });
      setShowLostForm(false);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stage = product.pipeline_stage;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-sm">{product.sf_code} <span className="font-sans text-ink/70">{product.sf_name}</span></div>
          <div className="mt-0.5 text-xs text-ink/50">
            {product.dosage_form_name || 'No dosage form'} · Qty {product.qty ?? '—'} {product.qty_unit_name || ''} @ <Money value={product.rate} /> = <Money value={product.amount} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StageBadge stage={stage} />
          <button onClick={toggle} className="text-xs font-medium text-teal-600 hover:underline">{expanded ? 'Hide' : 'Details'}</button>
        </div>
      </div>

      {stage === 'Order Lost' && product.lost_reason && (
        <p className="mt-2 text-sm text-rose-500">Lost — {product.lost_reason}</p>
      )}
      {stage === 'P.O. Raised' && (
        <p className="mt-2 text-sm text-teal-700">
          P.O.: Qty {product.po_qty} @ <Money value={product.po_rate} /> = <Money value={product.po_value} />
        </p>
      )}

      {(stage === 'Quotation' || stage === 'Negotiation') && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {stage === 'Quotation' && (
            <button className="btn btn-secondary" disabled={busy} onClick={() => setStage('Negotiation')}>Move to Negotiation</button>
          )}
          <button className="btn btn-primary" disabled={busy} onClick={() => { setShowPoForm((s) => !s); setShowLostForm(false); }}>Raise P.O.</button>
          <button className="btn btn-danger" disabled={busy} onClick={() => { setShowLostForm((s) => !s); setShowPoForm(false); }}>Mark Order Lost</button>
        </div>
      )}

      {showPoForm && (
        <form onSubmit={raisePo} className="mt-3 flex items-end gap-2 rounded-sm bg-paper p-3">
          <TextInput label="P.O. Qty" type="number" value={poQty} onChange={setPoQty} required />
          <TextInput label="P.O. Rate" type="number" value={poRate} onChange={setPoRate} required />
          <button className="btn btn-primary" disabled={busy}>Confirm P.O.</button>
        </form>
      )}
      {showLostForm && (
        <form onSubmit={markLost} className="mt-3 flex items-end gap-2 rounded-sm bg-paper p-3">
          <div className="flex-1"><TextInput label="Reason" value={lostReason} onChange={setLostReason} required /></div>
          <button className="btn btn-danger" disabled={busy}>Confirm lost</button>
        </form>
      )}
      <ErrorText>{error}</ErrorText>

      {expanded && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="mb-2 text-sm font-semibold">Follow-ups</h3>
          <ul className="mb-3 space-y-1.5">
            {(followups || []).map((f) => (
              <li key={f.id} className="rounded-sm border border-line px-3 py-1.5 text-sm">
                <span className="font-mono text-ink/50">{f.planned_date || '—'}</span> {f.notes}
              </li>
            ))}
            {followups && followups.length === 0 && <li className="text-sm text-ink/40">None logged yet.</li>}
          </ul>
          <form onSubmit={addFollowup} className="flex items-end gap-2">
            <TextInput type="date" label="Planned date" value={planned} onChange={setPlanned} />
            <div className="flex-1"><TextInput label="Note" value={notes} onChange={setNotes} /></div>
            <button className="btn btn-secondary">Log</button>
          </form>
        </div>
      )}
    </div>
  );
}
