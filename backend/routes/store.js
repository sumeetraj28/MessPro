const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

// Get store register entries with filters
router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { type, item_id, from, to, purpose, limit: lim } = req.query;
  let query = `SELECT sr.*, i.name as item_name, i.unit, s.name as supplier_name, u.full_name as created_by_name
    FROM store_register sr
    JOIN items i ON sr.item_id = i.id
    LEFT JOIN suppliers s ON sr.supplier_id = s.id
    LEFT JOIN users u ON sr.created_by = u.id WHERE 1=1`;
  const params = [];

  if (type) { query += ' AND sr.type = ?'; params.push(type); }
  if (item_id) { query += ' AND sr.item_id = ?'; params.push(item_id); }
  if (from) { query += ' AND sr.date >= ?'; params.push(from); }
  if (to) { query += ' AND sr.date <= ?'; params.push(to); }
  if (purpose) { query += ' AND sr.purpose = ?'; params.push(purpose); }

  query += ' ORDER BY sr.date DESC, sr.created_at DESC';
  if (lim) query += ` LIMIT ${parseInt(lim) || 200}`;
  else query += ' LIMIT 500';

  res.json(db.prepare(query).all(...params));
});

// Get ledger (item-wise summary with running totals)
router.get('/ledger', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { item_id, from, to } = req.query;

  let query = `SELECT sr.*, i.name as item_name, i.unit, s.name as supplier_name, u.full_name as created_by_name
    FROM store_register sr
    JOIN items i ON sr.item_id = i.id
    LEFT JOIN suppliers s ON sr.supplier_id = s.id
    LEFT JOIN users u ON sr.created_by = u.id WHERE 1=1`;
  const params = [];

  if (item_id) { query += ' AND sr.item_id = ?'; params.push(item_id); }
  if (from) { query += ' AND sr.date >= ?'; params.push(from); }
  if (to) { query += ' AND sr.date <= ?'; params.push(to); }
  query += ' ORDER BY sr.date ASC, sr.created_at ASC';

  const entries = db.prepare(query).all(...params);

  // Get opening balance (stock before the 'from' date)
  let openingBalance = 0;
  if (from && item_id) {
    const before = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type='in' THEN quantity ELSE -quantity END), 0) as balance
      FROM store_register WHERE item_id = ? AND date < ?
    `).get(item_id, from);
    openingBalance = before.balance;
  } else if (item_id && !from) {
    openingBalance = 0; // from the beginning
  }

  // Summary
  const totalIn = entries.filter(e => e.type === 'in').reduce((s, e) => s + e.quantity, 0);
  const totalOut = entries.filter(e => e.type === 'out').reduce((s, e) => s + e.quantity, 0);
  const totalInValue = entries.filter(e => e.type === 'in').reduce((s, e) => s + e.total_value, 0);
  const totalOutValue = entries.filter(e => e.type === 'out').reduce((s, e) => s + e.total_value, 0);

  res.json({
    entries,
    openingBalance,
    summary: { totalIn, totalOut, totalInValue, totalOutValue, closingBalance: openingBalance + totalIn - totalOut }
  });
});

// Get item-wise summary
router.get('/summary', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { from, to } = req.query;

  let dateFilter = '';
  const params = [];
  if (from) { dateFilter += ' AND sr.date >= ?'; params.push(from); }
  if (to) { dateFilter += ' AND sr.date <= ?'; params.push(to); }

  const summary = db.prepare(`
    SELECT i.id, i.name, i.unit, i.current_stock,
      COALESCE(SUM(CASE WHEN sr.type='in' THEN sr.quantity ELSE 0 END), 0) as total_in,
      COALESCE(SUM(CASE WHEN sr.type='out' THEN sr.quantity ELSE 0 END), 0) as total_out,
      COALESCE(SUM(CASE WHEN sr.type='in' THEN sr.total_value ELSE 0 END), 0) as value_in,
      COALESCE(SUM(CASE WHEN sr.type='out' THEN sr.total_value ELSE 0 END), 0) as value_out,
      COUNT(sr.id) as total_entries
    FROM items i
    LEFT JOIN store_register sr ON i.id = sr.item_id ${dateFilter}
    WHERE i.status = 'active'
    GROUP BY i.id
    HAVING total_entries > 0
    ORDER BY i.name
  `).all(...params);

  res.json(summary);
});

// Record Items In
router.post('/in', authenticateToken, (req, res) => {
  const { date, item_id, quantity, rate, supplier_id, purpose, bill_number, notes } = req.body;
  if (!date || !item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Date, item, and positive quantity required' });
  }

  const db = req.app.locals.db;
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const totalValue = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);

  const txn = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO store_register (date, item_id, type, quantity, rate, total_value, supplier_id, purpose, bill_number, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(date, item_id, 'in', quantity, rate || 0, totalValue, supplier_id || null, purpose || 'purchase', bill_number || null, notes || null, req.user.id);

    // Update stock
    db.prepare('UPDATE items SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, item_id);

    // Create inventory transaction for consistency
    db.prepare(
      'INSERT INTO inventory_transactions (item_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(item_id, 'purchase', quantity, 'store_register', result.lastInsertRowid, `Store In: ${purpose || 'purchase'}`, req.user.id);

    logChange(db, 'store_register', result.lastInsertRowid, 'create', null, req.body, req.user.id);
    return result;
  });

  const result = txn();
  res.status(201).json({ id: result.lastInsertRowid, message: 'Items received into store', new_stock: item.current_stock + quantity });
});

// Record Items Out
router.post('/out', authenticateToken, (req, res) => {
  const { date, item_id, quantity, rate, purpose, issued_to, notes } = req.body;
  if (!date || !item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Date, item, and positive quantity required' });
  }

  const db = req.app.locals.db;
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.current_stock < quantity) {
    return res.status(400).json({ error: `Insufficient stock. Available: ${item.current_stock} ${item.unit}` });
  }

  const totalValue = (parseFloat(quantity) || 0) * (parseFloat(rate) || item.cost_per_unit || 0);

  const txn = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO store_register (date, item_id, type, quantity, rate, total_value, purpose, issued_to, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(date, item_id, 'out', quantity, rate || item.cost_per_unit || 0, totalValue, purpose || 'kitchen', issued_to || null, notes || null, req.user.id);

    // Update stock
    db.prepare('UPDATE items SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, item_id);

    // Create inventory transaction
    db.prepare(
      'INSERT INTO inventory_transactions (item_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(item_id, 'consumption', -quantity, 'store_register', result.lastInsertRowid, `Store Out: ${purpose || 'kitchen'} - ${issued_to || ''}`, req.user.id);

    logChange(db, 'store_register', result.lastInsertRowid, 'create', null, req.body, req.user.id);
    return result;
  });

  const result = txn();
  res.status(201).json({ id: result.lastInsertRowid, message: 'Items issued from store', new_stock: item.current_stock - quantity });
});

// Delete entry (reverse stock)
router.delete('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const entry = db.prepare('SELECT * FROM store_register WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const txn = db.transaction(() => {
    // Reverse stock change
    const stockChange = entry.type === 'in' ? -entry.quantity : entry.quantity;
    db.prepare('UPDATE items SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stockChange, entry.item_id);

    db.prepare('DELETE FROM store_register WHERE id = ?').run(req.params.id);
    logErasure(db, 'store_register', req.params.id, entry, req.body.reason || 'Deleted by user', req.user.id);
  });
  txn();

  res.json({ message: 'Entry deleted and stock reversed' });
});

module.exports = router;
