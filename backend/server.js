const express = require('express');
const cors = require('cors');

require('./db'); // ensures schema + seed run on boot

const { requireAuth } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Public
app.use('/api/auth', require('./routes/auth'));

// Everything below requires a valid login
app.use('/api/masters', requireAuth, require('./routes/masters'));
app.use('/api/companies', requireAuth, require('./routes/companies'));
app.use('/api/leads', requireAuth, require('./routes/leads'));
app.use('/api/enquiries', requireAuth, require('./routes/enquiries'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`CRM backend listening on port ${PORT}`));
