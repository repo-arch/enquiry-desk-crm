const express = require('express');
const db = require('../db');

const router = express.Router();

// Fields the dashboard can be built on, and where each comes from
const FIELDS = [
  { key: 'internal_company_id', label: 'Internal Company', master: 'internal_companies' },
  { key: 'division_id', label: 'Division', master: 'divisions', viaLead: true },
  { key: 'source_id', label: 'Source', master: 'sources' },
  { key: 'sf_id', label: 'Product / SF', master: 'sf_codes' },
  { key: 'category_id', label: 'Category', master: 'categories', viaSf: true },
  { key: 'dosage_form_id', label: 'Dosage Form', master: 'dosage_forms' },
  { key: 'company_id', label: 'Customer / Company', master: 'companies' },
];

router.get('/fields', (req, res) => {
  const out = FIELDS.map((f) => {
    const table = f.master === 'sf_codes' ? 'sf_codes' : f.master;
    const nameCol = f.master === 'sf_codes' ? "code || ' - ' || name" : 'name';
    const options = db.prepare(`SELECT id, ${nameCol} as label FROM ${table} WHERE active = 1 ORDER BY label`).all();
    return { key: f.key, label: f.label, options };
  });
  res.json(out);
});

function periodBounds(period_type, period_value) {
  // period_value formats: monthly "YYYY-MM", quarterly "YYYY-Q1".."Q4", yearly "YYYY"
  if (period_type === 'monthly') {
    const [y, m] = period_value.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    return [start.toISOString(), end.toISOString()];
  }
  if (period_type === 'quarterly') {
    const [y, q] = period_value.split('-Q').map(Number);
    const startMonth = (q - 1) * 3;
    const start = new Date(Date.UTC(y, startMonth, 1));
    const end = new Date(Date.UTC(y, startMonth + 3, 1));
    return [start.toISOString(), end.toISOString()];
  }
  const y = Number(period_value);
  return [new Date(Date.UTC(y, 0, 1)).toISOString(), new Date(Date.UTC(y + 1, 0, 1)).toISOString()];
}

function computeAchieved(metric, filters, period_type, period_value) {
  const [start, end] = periodBounds(period_type, period_value);
  const rows = db.prepare(`
    SELECT ep.qty, ep.po_qty, ep.po_value, ep.updated_at, ep.internal_company_id, ep.source_id,
           ep.sf_id, ep.dosage_form_id, ep.company_id, l.division_id as division_id, sf.category_id as category_id
    FROM enquiry_products ep
    JOIN leads l ON l.id = ep.lead_id
    LEFT JOIN sf_codes sf ON sf.id = ep.sf_id
    WHERE ep.pipeline_stage = 'P.O. Raised' AND ep.updated_at >= ? AND ep.updated_at < ?
  `).all(start, end);

  const filtered = rows.filter((r) => {
    return Object.entries(filters || {}).every(([key, val]) => {
      if (val === undefined || val === null || val === '') return true;
      return String(r[key]) === String(val);
    });
  });

  if (metric === 'qty') {
    return filtered.reduce((sum, r) => sum + (r.po_qty || 0), 0);
  }
  return filtered.reduce((sum, r) => sum + (r.po_value || 0), 0);
}

router.get('/targets', (req, res) => {
  const rows = db.prepare(`SELECT * FROM targets ORDER BY created_at DESC`).all();
  res.json(rows.map((r) => ({ ...r, filters: JSON.parse(r.filters_json) })));
});

router.post('/targets', (req, res) => {
  const { name, metric, period_type, period_value, target_amount, filters } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!['value', 'qty'].includes(metric)) return res.status(400).json({ error: 'metric must be value or qty' });
  if (!['monthly', 'quarterly', 'yearly'].includes(period_type)) return res.status(400).json({ error: 'invalid period_type' });
  if (!period_value) return res.status(400).json({ error: 'period_value is required' });
  if (target_amount === undefined || target_amount === '') return res.status(400).json({ error: 'target_amount is required' });

  const info = db.prepare(`
    INSERT INTO targets (name, metric, period_type, period_value, target_amount, filters_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), metric, period_type, period_value, Number(target_amount), JSON.stringify(filters || {}));
  const row = db.prepare(`SELECT * FROM targets WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ ...row, filters: JSON.parse(row.filters_json) });
});

router.delete('/targets/:id', (req, res) => {
  db.prepare(`DELETE FROM targets WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

router.get('/targets/:id/report', (req, res) => {
  const row = db.prepare(`SELECT * FROM targets WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const filters = JSON.parse(row.filters_json);
  const achieved = computeAchieved(row.metric, filters, row.period_type, row.period_value);
  const variance = achieved - row.target_amount;
  const pct = row.target_amount ? (achieved / row.target_amount) * 100 : 0;
  res.json({
    target: { ...row, filters },
    achieved,
    variance,
    pct_achieved: Math.round(pct * 10) / 10,
  });
});

// Ad-hoc preview without saving (used while building a target)
router.post('/preview', (req, res) => {
  const { metric, period_type, period_value, filters } = req.body;
  const achieved = computeAchieved(metric, filters, period_type, period_value);
  res.json({ achieved });
});

// Overall summary stats for the top of the dashboard
router.get('/summary', (req, res) => {
  const stageCounts = db.prepare(`SELECT pipeline_stage, COUNT(*) c, COALESCE(SUM(amount),0) enquiry_total, COALESCE(SUM(po_value),0) po_total FROM enquiry_products GROUP BY pipeline_stage`).all();
  const leadStatus = db.prepare(`SELECT status, COUNT(*) c FROM leads GROUP BY status`).all();
  const totalCompanies = db.prepare(`SELECT COUNT(*) c FROM companies`).get().c;
  res.json({ stageCounts, leadStatus, totalCompanies });
});

module.exports = router;
