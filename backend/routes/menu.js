const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

// --- Menu Items ---
router.get('/items', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { meal_type, active } = req.query;
  let query = 'SELECT * FROM menu_items WHERE 1=1';
  const params = [];
  if (meal_type) { query += ' AND meal_type = ?'; params.push(meal_type); }
  if (active !== undefined) { query += ' AND is_active = ?'; params.push(active === 'true' ? 1 : 0); }
  query += ' ORDER BY meal_type, name';
  res.json(db.prepare(query).all(...params));
});

router.post('/items', authenticateToken, (req, res) => {
  const { name, meal_type, description, cost_per_plate, selling_price } = req.body;
  if (!name || !meal_type) return res.status(400).json({ error: 'Name and meal type required' });

  const db = req.app.locals.db;
  const result = db.prepare(
    'INSERT INTO menu_items (name, meal_type, description, cost_per_plate, selling_price) VALUES (?, ?, ?, ?, ?)'
  ).run(name, meal_type, description || null, cost_per_plate || 0, selling_price || 0);

  logChange(db, 'menu_items', result.lastInsertRowid, 'create', null, req.body, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

router.put('/items/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Menu item not found' });

  const { name, meal_type, description, cost_per_plate, selling_price, is_active } = req.body;
  db.prepare(
    'UPDATE menu_items SET name=?, meal_type=?, description=?, cost_per_plate=?, selling_price=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(
    name || old.name, meal_type || old.meal_type, description !== undefined ? description : old.description,
    cost_per_plate !== undefined ? cost_per_plate : old.cost_per_plate,
    selling_price !== undefined ? selling_price : old.selling_price,
    is_active !== undefined ? is_active : old.is_active, req.params.id
  );

  logChange(db, 'menu_items', req.params.id, 'update', old, req.body, req.user.id);
  res.json({ message: 'Updated successfully' });
});

router.delete('/items/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Menu item not found' });

  db.prepare('UPDATE menu_items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  logErasure(db, 'menu_items', req.params.id, old, req.body.reason || 'Deactivated', req.user.id);
  res.json({ message: 'Menu item deactivated' });
});

// --- Daily Menu ---
router.get('/daily', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { date, from, to } = req.query;
  let query = `SELECT dm.*, mi.name as item_name, mi.cost_per_plate, mi.selling_price 
    FROM daily_menu dm JOIN menu_items mi ON dm.menu_item_id = mi.id WHERE 1=1`;
  const params = [];

  if (date) { query += ' AND dm.date = ?'; params.push(date); }
  if (from) { query += ' AND dm.date >= ?'; params.push(from); }
  if (to) { query += ' AND dm.date <= ?'; params.push(to); }

  query += ' ORDER BY dm.date DESC, dm.meal_type';
  res.json(db.prepare(query).all(...params));
});

router.post('/daily', authenticateToken, (req, res) => {
  const { date, meal_type, menu_item_id, planned_quantity, notes } = req.body;
  if (!date || !meal_type || !menu_item_id) {
    return res.status(400).json({ error: 'Date, meal type, and menu item required' });
  }

  const db = req.app.locals.db;
  const result = db.prepare(
    'INSERT INTO daily_menu (date, meal_type, menu_item_id, planned_quantity, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(date, meal_type, menu_item_id, planned_quantity || 0, notes || null);

  logChange(db, 'daily_menu', result.lastInsertRowid, 'create', null, req.body, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/daily/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM daily_menu WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Daily menu entry not found' });

  const { actual_served, notes } = req.body;
  db.prepare('UPDATE daily_menu SET actual_served=?, notes=? WHERE id=?')
    .run(actual_served !== undefined ? actual_served : old.actual_served, notes !== undefined ? notes : old.notes, req.params.id);

  logChange(db, 'daily_menu', req.params.id, 'update', old, req.body, req.user.id);
  res.json({ message: 'Updated successfully' });
});

// --- Meal Collections ---
router.get('/collections', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { from, to } = req.query;
  let query = `SELECT mc.*, u.full_name as collected_by_name FROM meal_collections mc 
    LEFT JOIN users u ON mc.created_by = u.id WHERE 1=1`;
  const params = [];
  if (from) { query += ' AND mc.date >= ?'; params.push(from); }
  if (to) { query += ' AND mc.date <= ?'; params.push(to); }
  query += ' ORDER BY mc.date DESC, mc.meal_type';
  res.json(db.prepare(query).all(...params));
});

router.post('/collections', authenticateToken, (req, res) => {
  const { date, meal_type, total_members, rate_per_head, payment_method, notes } = req.body;
  if (!date || !meal_type || !total_members || !rate_per_head) {
    return res.status(400).json({ error: 'Date, meal type, members, and rate required' });
  }

  const db = req.app.locals.db;
  const total_collected = total_members * rate_per_head;
  const result = db.prepare(
    'INSERT INTO meal_collections (date, meal_type, total_members, rate_per_head, total_collected, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(date, meal_type, total_members, rate_per_head, total_collected, payment_method || 'cash', notes || null, req.user.id);

  logChange(db, 'meal_collections', result.lastInsertRowid, 'create', null, { ...req.body, total_collected }, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, total_collected });
});

module.exports = router;
