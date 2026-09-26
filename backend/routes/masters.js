const express = require('express');
const db = require('../db');

const router = express.Router();

// Table name -> { hasCategory: bool } config
const MASTERS = {
  'internal-companies': { table: 'internal_companies' },
  'categories': { table: 'categories' },
  'dosage-forms': { table: 'dosage_forms' },
  'divisions': { table: 'divisions' },
  'sources': { table: 'sources' },
  'qty-units': { table: 'qty_units' },
};

function assertMaster(key, res) {
  const cfg = MASTERS[key];
  if (!cfg) {
    res.status(404).json({ error: `Unknown master: ${key}` });
    return null;
  }
  return cfg;
}

router.get('/', (req, res) => {
  res.json(Object.keys(MASTERS));
});

router.get('/:key', (req, res) => {
  const cfg = assertMaster(req.params.key, res);
  if (!cfg) return;
  const rows = db.prepare(`SELECT * FROM ${cfg.table} ORDER BY active DESC, name ASC`).all();
  res.json(rows);
});

router.post('/:key', (req, res) => {
  const cfg = assertMaster(req.params.key, res);
  if (!cfg) return;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const info = db.prepare(`INSERT INTO ${cfg.table} (name) VALUES (?)`).run(name.trim());
    const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:key/:id', (req, res) => {
  const cfg = assertMaster(req.params.key, res);
  if (!cfg) return;
  const { name, active } = req.body;
  const existing = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const newName = name !== undefined ? name : existing.name;
  const newActive = active !== undefined ? (active ? 1 : 0) : existing.active;
  db.prepare(`UPDATE ${cfg.table} SET name = ?, active = ? WHERE id = ?`).run(newName, newActive, req.params.id);
  res.json(db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(req.params.id));
});

router.delete('/:key/:id', (req, res) => {
  const cfg = assertMaster(req.params.key, res);
  if (!cfg) return;
  db.prepare(`UPDATE ${cfg.table} SET active = 0 WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// SF codes: has extra fields (code, category)
router.get('/sf/list', (req, res) => {
  const rows = db.prepare(`
    SELECT sf.*, c.name as category_name FROM sf_codes sf
    LEFT JOIN categories c ON c.id = sf.category_id
    ORDER BY sf.active DESC, sf.code ASC
  `).all();
  res.json(rows);
});

router.post('/sf/list', (req, res) => {
  const { code, name, category_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  let finalCode = code && code.trim();
  if (!finalCode) {
    const max = db.prepare(`SELECT code FROM sf_codes WHERE code LIKE 'SF%' ORDER BY id DESC LIMIT 1`).get();
    let n = 1;
    if (max && /^SF(\d+)$/.test(max.code)) n = parseInt(max.code.slice(2), 10) + 1;
    finalCode = `SF${String(n).padStart(4, '0')}`;
  }
  try {
    const info = db.prepare(`INSERT INTO sf_codes (code, name, category_id) VALUES (?, ?, ?)`).run(finalCode, name.trim(), category_id || null);
    res.status(201).json(db.prepare(`SELECT * FROM sf_codes WHERE id = ?`).get(info.lastInsertRowid));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'SF code already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.patch('/sf/list/:id', (req, res) => {
  const existing = db.prepare(`SELECT * FROM sf_codes WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { code, name, category_id, active } = req.body;
  db.prepare(`UPDATE sf_codes SET code=?, name=?, category_id=?, active=? WHERE id=?`).run(
    code !== undefined ? code : existing.code,
    name !== undefined ? name : existing.name,
    category_id !== undefined ? category_id : existing.category_id,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id
  );
  res.json(db.prepare(`SELECT * FROM sf_codes WHERE id = ?`).get(req.params.id));
});

module.exports = router;
