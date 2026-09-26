const express = require('express');
const cors = require('cors');

require('./db'); // ensures schema + seed run on boot

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/masters', require('./routes/masters'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`CRM backend listening on port ${PORT}`));
