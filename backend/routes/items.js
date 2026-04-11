const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { status, category_id, low_stock } = req.query;
  let query = 'SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE 1=1';
  const params = [];

  if (status) { query += ' AND i.status = ?'; params.push(status); }
  if (category_id) { query += ' AND i.category_id = ?'; params.push(category_id); }
  if (low_stock === 'true') { query += ' AND i.current_stock <= i.min_stock_level'; }

  query += ' ORDER BY i.name';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const item = db.prepare('SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

router.post('/', authenticateToken, (req, res) => {
  const { name, category_id, unit, min_stock_level, cost_per_unit } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = req.app.locals.db;
  const result = db.prepare(
    'INSERT INTO items (name, category_id, unit, min_stock_level, cost_per_unit) VALUES (?, ?, ?, ?, ?)'
  ).run(name, category_id || null, unit || 'kg', min_stock_level || 0, cost_per_unit || 0);

  logChange(db, 'items', result.lastInsertRowid, 'create', null, req.body, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

router.put('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Item not found' });

  const { name, category_id, unit, min_stock_level, cost_per_unit, status } = req.body;
  db.prepare(
    'UPDATE items SET name=?, category_id=?, unit=?, min_stock_level=?, cost_per_unit=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(
    name || old.name, category_id !== undefined ? category_id : old.category_id,
    unit || old.unit, min_stock_level !== undefined ? min_stock_level : old.min_stock_level,
    cost_per_unit !== undefined ? cost_per_unit : old.cost_per_unit,
    status || old.status, req.params.id
  );

  logChange(db, 'items', req.params.id, 'update', old, req.body, req.user.id);
  res.json({ message: 'Updated successfully' });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Item not found' });

  db.prepare("UPDATE items SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  logErasure(db, 'items', req.params.id, old, req.body.reason || 'Deactivated by user', req.user.id);
  res.json({ message: 'Item deactivated' });
});

// Bulk import items
router.post('/bulk-import', authenticateToken, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items provided' });

  const db = req.app.locals.db;
  const insert = db.prepare('INSERT INTO items (name, category_id, unit, min_stock_level, cost_per_unit) VALUES (?, ?, ?, ?, ?)');
  const catLookup = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)');

  let imported = 0, skipped = 0, errors = [];
  const txn = db.transaction(() => {
    for (const item of items) {
      try {
        if (!item.name || !item.name.trim()) { skipped++; continue; }
        let catId = null;
        if (item.category) {
          const cat = catLookup.get(item.category.trim());
          if (cat) catId = cat.id;
        }
        const result = insert.run(item.name.trim(), catId, item.unit || 'kg', parseFloat(item.min_stock_level) || 0, parseFloat(item.cost_per_unit) || 0);
        logChange(db, 'items', result.lastInsertRowid, 'create', null, item, req.user.id);
        imported++;
      } catch (err) {
        errors.push(`Row "${item.name}": ${err.message}`);
        skipped++;
      }
    }
  });
  txn();
  res.json({ imported, skipped, errors });
});

module.exports = router;
