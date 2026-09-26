const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'crm.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS internal_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS dosage_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sf_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS divisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS qty_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1
);

-- Pipeline stages are fixed by the spec, but kept as a table for consistency/reporting
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  state TEXT,
  country TEXT,
  domestic_export TEXT CHECK(domestic_export IN ('Domestic','Export')) NOT NULL DEFAULT 'Domestic',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  internal_company_id INTEGER NOT NULL REFERENCES internal_companies(id),
  division_id INTEGER REFERENCES divisions(id),
  source_id INTEGER NOT NULL REFERENCES sources(id),
  query_text TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','enquiry_raised','not_converted')),
  closure_reason TEXT,
  entry_type TEXT NOT NULL DEFAULT 'lead' CHECK(entry_type IN ('lead','direct')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS enquiry_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  internal_company_id INTEGER NOT NULL REFERENCES internal_companies(id),
  source_id INTEGER NOT NULL REFERENCES sources(id),
  sf_id INTEGER NOT NULL REFERENCES sf_codes(id),
  dosage_form_id INTEGER REFERENCES dosage_forms(id),
  qty REAL,
  rate REAL,
  amount REAL,
  qty_unit_id INTEGER REFERENCES qty_units(id),
  pipeline_stage TEXT NOT NULL DEFAULT 'Quotation' CHECK(pipeline_stage IN ('Quotation','Negotiation','P.O. Raised','Order Lost')),
  po_qty REAL,
  po_rate REAL,
  po_value REAL,
  lost_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_type TEXT NOT NULL CHECK(parent_type IN ('lead','enquiry_product')),
  parent_id INTEGER NOT NULL,
  planned_date TEXT,
  actual_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  metric TEXT NOT NULL CHECK(metric IN ('value','qty')),
  period_type TEXT NOT NULL CHECK(period_type IN ('monthly','quarterly','yearly')),
  period_value TEXT NOT NULL,
  target_amount REAL NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function seedIfEmpty(table, rows, col = 'name') {
  const count = db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c;
  if (count === 0) {
    const stmt = db.prepare(`INSERT INTO ${table} (${col}) VALUES (?)`);
    const tx = db.transaction((items) => items.forEach((i) => stmt.run(i)));
    tx(rows);
  }
}

seedIfEmpty('internal_companies', ['Chimak', 'Syskem', 'Marskem', 'Crius', 'Chiros Unit 1', 'Chiros Unit 2', 'Signova-I', 'Signova-II', 'Sozin', 'Anuttama', 'Samson']);
seedIfEmpty('categories', ['Drug', 'Food', 'Ayurvedic']);
seedIfEmpty('dosage_forms', ['Tablets', 'Tablets-Effervescent', 'Veg Softgel', 'Non-Veg Softgel']);
seedIfEmpty('divisions', ['Domestic', 'Export']);
seedIfEmpty('sources', ['Email', 'Referral', 'Exhibition', 'Website', 'Cold Call']);
seedIfEmpty('qty_units', ['Strip', 'Bottle', 'Sachet']);

if (db.prepare('SELECT COUNT(*) c FROM pipeline_stages').get().c === 0) {
  const stmt = db.prepare('INSERT INTO pipeline_stages (name, sort_order) VALUES (?, ?)');
  [['Quotation', 1], ['Negotiation', 2], ['P.O. Raised', 3], ['Order Lost', 4]].forEach(([n, o]) => stmt.run(n, o));
}

module.exports = db;
