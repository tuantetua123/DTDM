require('dotenv').config();
const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

pool.query(`
  CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`)
  .then(() => pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE'))
  .catch(console.error);

// Lay danh sach (co tim kiem: /items?q=abc)
app.get('/items', async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    const { rows } = await pool.query(
      'SELECT * FROM items WHERE name ILIKE $1 ORDER BY id DESC', [q]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Them moi
app.post('/items', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const { rows } = await pool.query(
      'INSERT INTO items (name) VALUES ($1) RETURNING *', [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sua ten / danh dau hoan thanh
app.put('/items/:id', async (req, res) => {
  try {
    const { name, done } = req.body;
    const { rows } = await pool.query(
      `UPDATE items
       SET name = COALESCE($1, name), done = COALESCE($2, done)
       WHERE id = $3 RETURNING *`,
      [name ?? null, done ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Xoa
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
