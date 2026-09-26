const express = require('express');
const db = require('../db');

const router = express.Router();

function leadWithJoins(id) {
  return db.prepare(`
    SELECT l.*, c.name as company_name, c.code as company_code,
           ic.name as internal_company_name, d.name as division_name, s.name as source_name
    FROM leads l
    JOIN companies c ON c.id = l.company_id
    LEFT JOIN internal_companies ic ON ic.id = l.internal_company_id
    LEFT JOIN divisions d ON d.id = l.division_id
    LEFT JOIN sources s ON s.id = l.source_id
    WHERE l.id = ?
  `).get(id);
}

router.get('/', (req, res) => {
  const { status, company_id } = req.query;
  let sql = `
    SELECT l.*, c.name as company_name, c.code as company_code,
           ic.name as internal_company_name, d.name as division_name, s.name as source_name
    FROM leads l
    JOIN companies c ON c.id = l.company_id
    LEFT JOIN internal_companies ic ON ic.id = l.internal_company_id
    LEFT JOIN divisions d ON d.id = l.division_id
    LEFT JOIN sources s ON s.id = l.source_id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ` AND l.status = ?`; params.push(status); }
  if (company_id) { sql += ` AND l.company_id = ?`; params.push(company_id); }
  sql += ` ORDER BY l.created_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = leadWithJoins(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const followups = db.prepare(`SELECT * FROM followups WHERE parent_type='lead' AND parent_id=? ORDER BY created_at DESC`).all(req.params.id);
  res.json({ ...row, followups });
});

// Create a lead (entry_type = 'lead', status starts 'open')
// or Direct-to-Enquiry (entry_type = 'direct', status immediately 'enquiry_raised')
router.post('/', (req, res) => {
  const { company_id, internal_company_id, division_id, source_id, query_text, entry_type } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id is required' });
  if (!internal_company_id) return res.status(400).json({ error: 'internal_company_id is mandatory' });
  if (!source_id) return res.status(400).json({ error: 'source_id is mandatory' });

  const type = entry_type === 'direct' ? 'direct' : 'lead';
  const status = type === 'direct' ? 'enquiry_raised' : 'open';
  const closedAt = type === 'direct' ? new Date().toISOString() : null;

  const info = db.prepare(`
    INSERT INTO leads (company_id, internal_company_id, division_id, source_id, query_text, status, entry_type, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(company_id, internal_company_id, division_id || null, source_id, query_text || null, status, type, closedAt);

  res.status(201).json(leadWithJoins(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== 'open') return res.status(400).json({ error: 'Lead is already closed' });
  const { internal_company_id, division_id, source_id, query_text } = req.body;
  db.prepare(`UPDATE leads SET internal_company_id=?, division_id=?, source_id=?, query_text=? WHERE id=?`).run(
    internal_company_id !== undefined ? internal_company_id : existing.internal_company_id,
    division_id !== undefined ? division_id : existing.division_id,
    source_id !== undefined ? source_id : existing.source_id,
    query_text !== undefined ? query_text : existing.query_text,
    req.params.id
  );
  res.json(leadWithJoins(req.params.id));
});

// Close a lead: Enquiry Raised or Not Converted (with mandatory reason)
router.post('/:id/close', (req, res) => {
  const existing = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== 'open') return res.status(400).json({ error: 'Lead is already closed' });
  const { outcome, reason } = req.body;
  if (!['enquiry_raised', 'not_converted'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be enquiry_raised or not_converted' });
  }
  if (outcome === 'not_converted' && (!reason || !reason.trim())) {
    return res.status(400).json({ error: 'reason is mandatory for Not Converted' });
  }
  db.prepare(`UPDATE leads SET status=?, closure_reason=?, closed_at=datetime('now') WHERE id=?`).run(
    outcome, outcome === 'not_converted' ? reason.trim() : null, req.params.id
  );
  res.json(leadWithJoins(req.params.id));
});

// Follow-ups against the lead itself (pre-enquiry stage)
router.post('/:id/followups', (req, res) => {
  const existing = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { planned_date, actual_date, notes } = req.body;
  const info = db.prepare(`
    INSERT INTO followups (parent_type, parent_id, planned_date, actual_date, notes)
    VALUES ('lead', ?, ?, ?, ?)
  `).run(req.params.id, planned_date || null, actual_date || null, notes || null);
  res.status(201).json(db.prepare(`SELECT * FROM followups WHERE id=?`).get(info.lastInsertRowid));
});

module.exports = router;
