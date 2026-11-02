require('dotenv').config();
const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const COLS = "id, name, done, priority, category, to_char(due_date,'YYYY-MM-DD') AS due_date, created_at";
const FIELDS = ['name', 'done', 'priority', 'due_date', 'category'];

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS priority INT DEFAULT 2');
    await pool.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal'");
    await pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS due_date DATE');
    console.log('Database ready');
  } catch (e) { console.error(e); }
})();

app.get('/items', async (req, res) => {
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
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
