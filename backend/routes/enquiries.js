const express = require('express');
const db = require('../db');

const router = express.Router();

function productWithJoins(id) {
  return db.prepare(`
    SELECT ep.*, sf.code as sf_code, sf.name as sf_name,
           ic.name as internal_company_name, s.name as source_name,
           df.name as dosage_form_name, qu.name as qty_unit_name,
           c.name as company_name, c.code as company_code
    FROM enquiry_products ep
    LEFT JOIN sf_codes sf ON sf.id = ep.sf_id
    LEFT JOIN internal_companies ic ON ic.id = ep.internal_company_id
    LEFT JOIN sources s ON s.id = ep.source_id
    LEFT JOIN dosage_forms df ON df.id = ep.dosage_form_id
    LEFT JOIN qty_units qu ON qu.id = ep.qty_unit_id
    LEFT JOIN companies c ON c.id = ep.company_id
    WHERE ep.id = ?
  `).get(id);
}

// List product lines, filterable by lead_id, company_id, pipeline_stage, sf_id
router.get('/', (req, res) => {
  const { lead_id, company_id, pipeline_stage, sf_id } = req.query;
  let sql = `
    SELECT ep.*, sf.code as sf_code, sf.name as sf_name,
           ic.name as internal_company_name, s.name as source_name,
           df.name as dosage_form_name, qu.name as qty_unit_name,
           c.name as company_name, c.code as company_code
    FROM enquiry_products ep
    LEFT JOIN sf_codes sf ON sf.id = ep.sf_id
    LEFT JOIN internal_companies ic ON ic.id = ep.internal_company_id
    LEFT JOIN sources s ON s.id = ep.source_id
    LEFT JOIN dosage_forms df ON df.id = ep.dosage_form_id
    LEFT JOIN qty_units qu ON qu.id = ep.qty_unit_id
    LEFT JOIN companies c ON c.id = ep.company_id
    WHERE 1=1
  `;
  const params = [];
  if (lead_id) { sql += ` AND ep.lead_id = ?`; params.push(lead_id); }
  if (company_id) { sql += ` AND ep.company_id = ?`; params.push(company_id); }
  if (pipeline_stage) { sql += ` AND ep.pipeline_stage = ?`; params.push(pipeline_stage); }
  if (sf_id) { sql += ` AND ep.sf_id = ?`; params.push(sf_id); }
  sql += ` ORDER BY ep.created_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = productWithJoins(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const followups = db.prepare(`SELECT * FROM followups WHERE parent_type='enquiry_product' AND parent_id=? ORDER BY created_at DESC`).all(req.params.id);
  res.json({ ...row, followups });
});

// Add a product line to a lead that is in 'enquiry_raised' status
router.post('/', (req, res) => {
  const { lead_id, internal_company_id, source_id, sf_id, dosage_form_id, qty, rate, qty_unit_id } = req.body;
  const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(lead_id);
  if (!lead) return res.status(400).json({ error: 'lead_id not found' });
  if (lead.status !== 'enquiry_raised') return res.status(400).json({ error: 'Lead must be in Enquiry Raised status' });
  if (!internal_company_id) return res.status(400).json({ error: 'internal_company_id is mandatory' });
  if (!source_id) return res.status(400).json({ error: 'source_id is mandatory' });
  if (!sf_id) return res.status(400).json({ error: 'sf_id is mandatory' });

  const q = qty !== undefined && qty !== null && qty !== '' ? Number(qty) : null;
  const r = rate !== undefined && rate !== null && rate !== '' ? Number(rate) : null;
  const amount = (q !== null && r !== null) ? q * r : null;

  const info = db.prepare(`
    INSERT INTO enquiry_products
      (lead_id, company_id, internal_company_id, source_id, sf_id, dosage_form_id, qty, rate, amount, qty_unit_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(lead_id, lead.company_id, internal_company_id, source_id, sf_id, dosage_form_id || null, q, r, amount, qty_unit_id || null);

  res.status(201).json(productWithJoins(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare(`SELECT * FROM enquiry_products WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { internal_company_id, source_id, sf_id, dosage_form_id, qty, rate, qty_unit_id } = req.body;
  const q = qty !== undefined ? (qty === '' ? null : Number(qty)) : existing.qty;
  const r = rate !== undefined ? (rate === '' ? null : Number(rate)) : existing.rate;
  const amount = (q !== null && r !== null) ? q * r : null;
  db.prepare(`
    UPDATE enquiry_products SET
      internal_company_id=?, source_id=?, sf_id=?, dosage_form_id=?, qty=?, rate=?, amount=?, qty_unit_id=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    internal_company_id !== undefined ? internal_company_id : existing.internal_company_id,
    source_id !== undefined ? source_id : existing.source_id,
    sf_id !== undefined ? sf_id : existing.sf_id,
    dosage_form_id !== undefined ? dosage_form_id : existing.dosage_form_id,
    q, r, amount,
    qty_unit_id !== undefined ? qty_unit_id : existing.qty_unit_id,
    req.params.id
  );
  res.json(productWithJoins(req.params.id));
});

// Move a product line through the pipeline
router.post('/:id/stage', (req, res) => {
  const existing = db.prepare(`SELECT * FROM enquiry_products WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { stage, po_qty, po_rate, lost_reason } = req.body;
  const valid = ['Quotation', 'Negotiation', 'P.O. Raised', 'Order Lost'];
  if (!valid.includes(stage)) return res.status(400).json({ error: `stage must be one of ${valid.join(', ')}` });

  if (stage === 'P.O. Raised') {
    if (po_qty === undefined || po_rate === undefined || po_qty === '' || po_rate === '') {
      return res.status(400).json({ error: 'po_qty and po_rate are required to raise a P.O.' });
    }
    const poQty = Number(po_qty);
    const poRate = Number(po_rate);
    db.prepare(`
      UPDATE enquiry_products SET pipeline_stage=?, po_qty=?, po_rate=?, po_value=?, lost_reason=NULL, updated_at=datetime('now')
      WHERE id=?
    `).run(stage, poQty, poRate, poQty * poRate, req.params.id);
  } else if (stage === 'Order Lost') {
    if (!lost_reason || !lost_reason.trim()) return res.status(400).json({ error: 'lost_reason is mandatory' });
    db.prepare(`UPDATE enquiry_products SET pipeline_stage=?, lost_reason=?, updated_at=datetime('now') WHERE id=?`).run(stage, lost_reason.trim(), req.params.id);
  } else {
    db.prepare(`UPDATE enquiry_products SET pipeline_stage=?, updated_at=datetime('now') WHERE id=?`).run(stage, req.params.id);
  }
  res.json(productWithJoins(req.params.id));
});

router.post('/:id/followups', (req, res) => {
  const existing = db.prepare(`SELECT * FROM enquiry_products WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { planned_date, actual_date, notes } = req.body;
  const info = db.prepare(`
    INSERT INTO followups (parent_type, parent_id, planned_date, actual_date, notes)
    VALUES ('enquiry_product', ?, ?, ?, ?)
  `).run(req.params.id, planned_date || null, actual_date || null, notes || null);
  res.status(201).json(db.prepare(`SELECT * FROM followups WHERE id=?`).get(info.lastInsertRowid));
});

module.exports = router;
