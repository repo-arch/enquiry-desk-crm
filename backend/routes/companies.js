const express = require('express');
const db = require('../db');

const router = express.Router();

function nextCompanyCode() {
  const max = db.prepare(`SELECT code FROM companies WHERE code LIKE 'C%' AND code NOT LIKE '%-%' ORDER BY id DESC LIMIT 1`).get();
  let n = 1;
  if (max && /^C(\d+)$/.test(max.code)) n = parseInt(max.code.slice(1), 10) + 1;
  return `C${n}`;
}

router.get('/', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = db.prepare(`SELECT * FROM companies WHERE name LIKE ? OR code LIKE ? ORDER BY name`).all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`SELECT * FROM companies ORDER BY name`).all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM companies WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// Account roll-up view: all leads + enquiries + products per company
router.get('/:id/rollup', (req, res) => {
  const company = db.prepare(`SELECT * FROM companies WHERE id = ?`).get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Not found' });

  const leads = db.prepare(`
    SELECT l.*, ic.name as internal_company_name, d.name as division_name, s.name as source_name
    FROM leads l
    LEFT JOIN internal_companies ic ON ic.id = l.internal_company_id
    LEFT JOIN divisions d ON d.id = l.division_id
    LEFT JOIN sources s ON s.id = l.source_id
    WHERE l.company_id = ?
    ORDER BY l.created_at DESC
  `).all(req.params.id);

  const leadIds = leads.map((l) => l.id);
  let products = [];
  if (leadIds.length) {
    const placeholders = leadIds.map(() => '?').join(',');
    products = db.prepare(`
      SELECT ep.*, sf.code as sf_code, sf.name as sf_name, ic.name as internal_company_name, s.name as source_name, df.name as dosage_form_name
      FROM enquiry_products ep
      LEFT JOIN sf_codes sf ON sf.id = ep.sf_id
      LEFT JOIN internal_companies ic ON ic.id = ep.internal_company_id
      LEFT JOIN sources s ON s.id = ep.source_id
      LEFT JOIN dosage_forms df ON df.id = ep.dosage_form_id
      WHERE ep.lead_id IN (${placeholders})
      ORDER BY ep.created_at DESC
    `).all(...leadIds);
  }

  const byLead = {};
  products.forEach((p) => {
    if (!byLead[p.lead_id]) byLead[p.lead_id] = [];
    byLead[p.lead_id].push(p);
  });
  leads.forEach((l) => { l.products = byLead[l.id] || []; });

  res.json({ company, leads });
});

router.post('/', (req, res) => {
  const { name, state, country, domestic_export } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  const code = nextCompanyCode();
  const info = db.prepare(`
    INSERT INTO companies (code, name, state, country, domestic_export)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, name.trim(), state || null, country || null, domestic_export || 'Domestic');
  res.status(201).json(db.prepare(`SELECT * FROM companies WHERE id = ?`).get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare(`SELECT * FROM companies WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, state, country, domestic_export } = req.body;
  db.prepare(`UPDATE companies SET name=?, state=?, country=?, domestic_export=? WHERE id=?`).run(
    name !== undefined ? name : existing.name,
    state !== undefined ? state : existing.state,
    country !== undefined ? country : existing.country,
    domestic_export !== undefined ? domestic_export : existing.domestic_export,
    req.params.id
  );
  res.json(db.prepare(`SELECT * FROM companies WHERE id = ?`).get(req.params.id));
});

module.exports = router;
