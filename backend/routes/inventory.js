const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange } = require('../db/init');

const router = express.Router();

// Get stock levels
router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const items = db.prepare(`
    SELECT i.*, c.name as category_name,
      CASE WHEN i.current_stock <= i.min_stock_level THEN 1 ELSE 0 END as is_low_stock
    FROM items i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE i.status = 'active'
    ORDER BY is_low_stock DESC, i.name
  `).all();
  res.json(items);
});

// Get transactions history
router.get('/transactions', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { item_id, type, from, to } = req.query;
  let query = `SELECT it.*, i.name as item_name, i.unit, u.full_name as created_by_name
    FROM inventory_transactions it
    JOIN items i ON it.item_id = i.id
    LEFT JOIN users u ON it.created_by = u.id WHERE 1=1`;
  const params = [];

  if (item_id) { query += ' AND it.item_id = ?'; params.push(item_id); }
  if (type) { query += ' AND it.type = ?'; params.push(type); }
  if (from) { query += ' AND it.created_at >= ?'; params.push(from); }
  if (to) { query += " AND it.created_at <= ? || ' 23:59:59'"; params.push(to); }

  query += ' ORDER BY it.created_at DESC LIMIT 200';
  res.json(db.prepare(query).all(...params));
});

// Record consumption
router.post('/consume', authenticateToken, (req, res) => {
  const { item_id, quantity, notes } = req.body;
  if (!item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Item ID and positive quantity required' });
  }

  const db = req.app.locals.db;
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.current_stock < quantity) {
    return res.status(400).json({ error: `Insufficient stock. Available: ${item.current_stock} ${item.unit}` });
  }

  db.prepare('UPDATE items SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, item_id);
  db.prepare(
    'INSERT INTO inventory_transactions (item_id, type, quantity, notes, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(item_id, 'consumption', -quantity, notes || 'Daily consumption', req.user.id);

  logChange(db, 'items', item_id, 'update', { current_stock: item.current_stock }, { current_stock: item.current_stock - quantity, action: 'consumption' }, req.user.id);
  res.json({ message: 'Consumption recorded', new_stock: item.current_stock - quantity });
});

// Stock adjustment
router.post('/adjust', authenticateToken, (req, res) => {
  const { item_id, quantity, type, notes } = req.body;
  if (!item_id || quantity === undefined) {
    return res.status(400).json({ error: 'Item ID and quantity required' });
  }

  const db = req.app.locals.db;
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const adjustType = type || 'adjustment';
  db.prepare('UPDATE items SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, item_id);
  db.prepare(
    'INSERT INTO inventory_transactions (item_id, type, quantity, notes, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(item_id, adjustType, quantity, notes || 'Manual adjustment', req.user.id);

  logChange(db, 'items', item_id, 'update', { current_stock: item.current_stock }, { current_stock: item.current_stock + quantity, action: adjustType }, req.user.id);
  res.json({ message: 'Stock adjusted', new_stock: item.current_stock + quantity });
});

// Record wastage
router.post('/wastage', authenticateToken, (req, res) => {
  const { item_id, quantity, notes } = req.body;
  if (!item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Item ID and positive quantity required' });
  }

  const db = req.app.locals.db;
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  db.prepare('UPDATE items SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, item_id);
  db.prepare(
    'INSERT INTO inventory_transactions (item_id, type, quantity, notes, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(item_id, 'wastage', -quantity, notes || 'Wastage recorded', req.user.id);

  logChange(db, 'items', item_id, 'update', { current_stock: item.current_stock }, { current_stock: item.current_stock - quantity, action: 'wastage' }, req.user.id);
  res.json({ message: 'Wastage recorded', new_stock: item.current_stock - quantity });
});

module.exports = router;
