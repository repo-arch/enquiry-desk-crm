export function Select({ label, value, onChange, options, placeholder, required }) {
  return (
    <label className="block">
      {label && <span className="label">{label}{required && <span className="text-clay-500"> *</span>}</span>}
      <select
        className="input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">{placeholder || 'Select…'}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name || o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function TextInput({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <label className="block">
      {label && <span className="label">{label}{required && <span className="text-clay-500"> *</span>}</span>}
      <input
        className="input"
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <textarea
        className="input"
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

const STAGE_STYLES = {
  Quotation: 'bg-teal-50 text-teal-700 border border-teal-100',
  Negotiation: 'bg-clay-100 text-clay-500 border border-clay-100',
  'P.O. Raised': 'bg-teal-600 text-white',
  'Order Lost': 'bg-rose-100 text-rose-500 border border-rose-100',
};

export function StageBadge({ stage }) {
  return <span className={`badge ${STAGE_STYLES[stage] || 'bg-line text-ink'}`}>{stage}</span>;
}

const LEAD_STATUS_STYLES = {
  open: 'bg-teal-50 text-teal-700 border border-teal-100',
  enquiry_raised: 'bg-teal-600 text-white',
  not_converted: 'bg-rose-100 text-rose-500 border border-rose-100',
};
const LEAD_STATUS_LABEL = {
  open: 'Open',
  enquiry_raised: 'Enquiry Raised',
  not_converted: 'Not Converted',
};

export function LeadStatusBadge({ status }) {
  return <span className={`badge ${LEAD_STATUS_STYLES[status]}`}>{LEAD_STATUS_LABEL[status]}</span>;
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10">
      <div className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Money({ value }) {
  if (value === null || value === undefined) return <span className="text-ink/30">—</span>;
  return <span className="font-mono">{Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>;
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p className="rounded-sm bg-rose-100 px-3 py-2 text-sm text-rose-500">{children}</p>;
}
