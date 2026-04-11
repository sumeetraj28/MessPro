const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = req.app.locals.db;
  try {
    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
    logChange(db, 'categories', result.lastInsertRowid, 'create', null, { name, description }, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid, name, description });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Category not found' });

  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name || old.name, description !== undefined ? description : old.description, req.params.id);
  logChange(db, 'categories', req.params.id, 'update', old, { name, description }, req.user.id);
  res.json({ message: 'Updated successfully' });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Category not found' });

  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE category_id = ?').get(req.params.id).count;
  if (itemCount > 0) return res.status(409).json({ error: 'Category has items linked to it' });

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  logErasure(db, 'categories', req.params.id, old, req.body.reason || 'Deleted by user', req.user.id);
  res.json({ message: 'Deleted successfully' });
});

module.exports = router;
