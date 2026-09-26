# Enquiry Desk — CRM

Full-stack implementation of the "Masters, Company, Lead, and Product-wise Enquiry Flow" spec: master data setup, company master with auto-coding, lead entry / direct-to-enquiry, product-wise enquiry tracking through a sales pipeline (Quotation → Negotiation → P.O. Raised / Order Lost), account roll-up view, and a field-agnostic target dashboard.

**Stack:** Node.js + Express + SQLite (`better-sqlite3`) on the backend, React + Vite + Tailwind on the frontend. Plain SQL, no ORM, so the schema in `backend/db.js` is easy to read and extend.

## Run it locally

**Backend** (starts on port 4000, creates and seeds `crm.db` on first run):
```bash
cd backend
npm install
npm start
```

**Frontend** (starts on port 5173):
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend talks to the backend at `http://localhost:4000/api` by default — override with a `VITE_API_BASE` env var (e.g. in `frontend/.env`) if you deploy the backend elsewhere.

## How the flow maps to the code

| Spec step | Where |
|---|---|
| Step 1 — Master Data Setup | `backend/routes/masters.js`, UI at `/masters` |
| Step 2 — Company Master (auto-code C1, C2…) | `backend/routes/companies.js` |
| Step 2A — Select Internal Company (mandatory gate) | `frontend/src/pages/CompanyDetailPage.jsx` |
| Step 3 — Lead Entry / Direct-to-Enquiry | `backend/routes/leads.js`, `frontend/src/pages/LeadDetailPage.jsx` |
| Step 4 — Product-wise Enquiry Entry + Pipeline | `backend/routes/enquiries.js`, `frontend/src/components/ProductCard.jsx` |
| Account roll-up view | `GET /api/companies/:id/rollup`, `CompanyDetailPage.jsx` |
| Step 5 — Target-Based Dashboard | `backend/routes/dashboard.js`, `frontend/src/pages/DashboardPage.jsx` |

Business rules enforced server-side (not just in the UI): Internal Company and Source are mandatory at both lead and product-line level; a lead can only be entered against a company already in the Company Master; product lines can only be added once a lead's status is `enquiry_raised`; raising a P.O. requires qty + rate; marking Order Lost requires a reason; SF codes can be picked from the master or minted on the fly (auto-generated `SF0001`, `SF0002`…) and persist for reuse.

## Deploying so others can use it

This needs two things hosted: the Node/Express API (with its SQLite file on a persistent disk) and the static React build.

- **Backend:** any Node host with persistent storage — Render, Railway, Fly.io, or a small VPS. Run `npm install && npm start` (set `PORT` if the host requires it).
- **Frontend:** `npm run build` produces `frontend/dist` — deploy that as a static site (Vercel, Netlify, Render static site, or behind the same server as the API). Set `VITE_API_BASE` to your deployed backend's `/api` URL before building.
- For a single-server deploy, have Express serve `frontend/dist` as static files and keep the API under `/api` — ask if you want that variant wired up.

SQLite is file-based, so if you outgrow a single instance (multiple backend replicas, heavier concurrent write load), swap `better-sqlite3` for Postgres — the SQL in `backend/db.js` and the route files is close enough to standard SQL that the port is mostly mechanical.

## Extending

- New master values (a new Internal Company, Dosage Form, etc.) are added from the `/masters` screen — no code changes needed, they appear in every dropdown immediately.
- Pipeline stages are currently fixed to the four in the spec (Quotation, Negotiation, P.O. Raised, Order Lost); add more by extending the `CHECK` constraint in `enquiry_products.pipeline_stage` and the `STAGE_STYLES` map in `frontend/src/components/ui.jsx`.
- The dashboard's filterable fields are declared in `backend/routes/dashboard.js` (`FIELDS` array) — add an entry there to expose a new filter axis.
