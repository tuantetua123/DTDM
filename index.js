const express = require('express');
const pool = require('./db');
const { performance } = require('node:perf_hooks');
const instance = require('node:crypto').randomUUID();

const app = express();
app.use(express.json());
app.disable('x-powered-by');
app.use(express.static(require('node:path').join(__dirname, 'public')));

const COLS = "id, name, done, priority, category, to_char(due_date,'YYYY-MM-DD') AS due_date, created_at";
const FIELDS = ['name', 'done', 'priority', 'due_date', 'category'];

let schemaReady;
function ensureSchema() {
  if (!schemaReady) schemaReady = (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(734210)');
      await client.query(`CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW())`);
      await client.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE');
      await client.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS priority INT DEFAULT 2');
      await client.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal'");
      await client.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS due_date DATE');
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally { client.release(); }
  })().catch(err => { schemaReady = undefined; throw err; });
  return schemaReady;
}
app.use('/items', async (req, res, next) => {
  try { await ensureSchema(); next(); }
  catch (err) { console.error(err.message); res.status(503).json({error:'Database unavailable'}); }
});

// Public demo metrics: no hostnames, credentials or environment variables.
app.get('/health', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const start = performance.now();
  let database = false;
  try { await pool.query({text:'SELECT 1', query_timeout:3000}); database = true; } catch (_) {}
  res.status(database ? 200 : 503).json({server:true, database, databaseMs:database ? Math.round(performance.now()-start) : null,
    uptime:Math.floor(process.uptime()),
    platform:process.env.VERCEL ? 'Vercel' : process.env.RENDER ? 'Render' : 'Local', instance:instance.slice(0,8), timestamp:new Date().toISOString()});
});

app.get('/items', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { rows } = await pool.query(`SELECT ${COLS} FROM items ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/items', async (req, res) => {
  try {
    const { name, priority, category, due_date } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const { rows } = await pool.query(
      `INSERT INTO items (name, priority, category, due_date)
       VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
      [name.trim(), priority || 2, category || 'personal', due_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Xoa tat ca viec da hoan thanh (phai dat truoc /items/:id)
app.delete('/items/done', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM items WHERE done = TRUE');
    res.json({ deleted: rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/items/:id', async (req, res) => {
  try {
    const sets = [], vals = [];
    FIELDS.forEach(f => {
      if (f in req.body) {
        vals.push(req.body[f] === '' ? null : req.body[f]);
        sets.push(`${f} = $${vals.length}`);
      }
    });
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE items SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING ${COLS}`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/items/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Running on port ${PORT}`));
}
module.exports = app;
