import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Money } from '../components/ui';

const STAGES = ['Quotation', 'Negotiation', 'P.O. Raised', 'Order Lost'];

const COLUMN_STYLE = {
  Quotation: 'border-t-teal-300',
  Negotiation: 'border-t-clay-400',
  'P.O. Raised': 'border-t-teal-600',
  'Order Lost': 'border-t-rose-500',
};

export default function PipelinePage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/enquiries').then(setProducts);
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Pipeline</h1>
        <p className="mt-1 text-sm text-ink/60">Every product line, across every company, by sales stage.</p>
      </header>

      <div className="grid grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const items = products.filter((p) => p.pipeline_stage === stage);
          const total = items.reduce((s, p) => s + (p.po_value ?? p.amount ?? 0), 0);
          return (
            <div key={stage} className={`border-t-4 ${COLUMN_STYLE[stage]} card`}>
              <div className="border-b border-line px-3 py-2.5">
                <div className="text-sm font-semibold">{stage}</div>
                <div className="text-xs text-ink/50">{items.length} · <Money value={total} /></div>
              </div>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
                {items.map((p) => (
                  <Link key={p.id} to={`/leads/${p.lead_id}`} className="block rounded-sm border border-line bg-paper p-2.5 text-sm hover:border-teal-300">
                    <div className="font-medium">{p.company_name}</div>
                    <div className="font-mono text-xs text-ink/50">{p.sf_code} — {p.sf_name}</div>
                    <div className="mt-1 text-xs text-ink/50"><Money value={p.po_value ?? p.amount} /></div>
                  </Link>
                ))}
                {items.length === 0 && <p className="py-4 text-center text-xs text-ink/30">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
