const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

// List purchases with filters
router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { from, to, supplier_id, payment_status } = req.query;
  let query = `SELECT p.*, s.name as supplier_name, u.full_name as created_by_name
    FROM purchases p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    LEFT JOIN users u ON p.created_by = u.id WHERE 1=1`;
  const params = [];

  if (from) { query += ' AND p.purchase_date >= ?'; params.push(from); }
  if (to) { query += ' AND p.purchase_date <= ?'; params.push(to); }
  if (supplier_id) { query += ' AND p.supplier_id = ?'; params.push(supplier_id); }
  if (payment_status) { query += ' AND p.payment_status = ?'; params.push(payment_status); }

  query += ' ORDER BY p.purchase_date DESC, p.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// Get purchase detail with items
router.get('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const purchase = db.prepare(`
    SELECT p.*, s.name as supplier_name, u.full_name as created_by_name
    FROM purchases p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    LEFT JOIN users u ON p.created_by = u.id 
    WHERE p.id = ?
  `).get(req.params.id);

  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

  const items = db.prepare(`
    SELECT pi.*, i.name as item_name, i.unit 
    FROM purchase_items pi 
    JOIN items i ON pi.item_id = i.id 
    WHERE pi.purchase_id = ?
  `).all(req.params.id);

  res.json({ ...purchase, items });
});

// Create purchase with items
router.post('/', authenticateToken, (req, res) => {
  const { supplier_id, invoice_number, purchase_date, payment_method, payment_status, notes, items } = req.body;
  if (!purchase_date || !items || items.length === 0) {
    return res.status(400).json({ error: 'Purchase date and at least one item required' });
  }

  const db = req.app.locals.db;
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const insertPurchase = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO purchases (supplier_id, invoice_number, purchase_date, total_amount, payment_method, payment_status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(supplier_id || null, invoice_number || null, purchase_date, totalAmount, payment_method || 'cash', payment_status || 'paid', notes || null, req.user.id);

    const purchaseId = result.lastInsertRowid;

    for (const item of items) {
      const totalPrice = item.quantity * item.unit_price;
      db.prepare(
        'INSERT INTO purchase_items (purchase_id, item_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)'
      ).run(purchaseId, item.item_id, item.quantity, item.unit_price, totalPrice);

      // Update inventory stock
      db.prepare('UPDATE items SET current_stock = current_stock + ?, cost_per_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(item.quantity, item.unit_price, item.item_id);

      // Log inventory transaction
      db.prepare(
        'INSERT INTO inventory_transactions (item_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(item.item_id, 'purchase', item.quantity, 'purchase', purchaseId, `Purchase #${purchaseId}`, req.user.id);
    }

    logChange(db, 'purchases', purchaseId, 'create', null, { ...req.body, total_amount: totalAmount }, req.user.id);
    return purchaseId;
  });

  try {
    const purchaseId = insertPurchase();
    res.status(201).json({ id: purchaseId, total_amount: totalAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update purchase
router.put('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Purchase not found' });

  const { payment_status, payment_method, notes } = req.body;
  db.prepare('UPDATE purchases SET payment_status=?, payment_method=?, notes=? WHERE id=?')
    .run(payment_status || old.payment_status, payment_method || old.payment_method, notes !== undefined ? notes : old.notes, req.params.id);

  logChange(db, 'purchases', req.params.id, 'update', old, req.body, req.user.id);
  res.json({ message: 'Updated successfully' });
});

// Delete purchase
router.delete('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Purchase not found' });

  const deletePurchase = db.transaction(() => {
    // Reverse inventory changes
    const purchaseItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(req.params.id);
    for (const pi of purchaseItems) {
      db.prepare('UPDATE items SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(pi.quantity, pi.item_id);
      db.prepare(
        'INSERT INTO inventory_transactions (item_id, type, quantity, reference_type, reference_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(pi.item_id, 'return', -pi.quantity, 'purchase_delete', req.params.id, `Reversed from deleted Purchase #${req.params.id}`, req.user.id);
    }

    db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(req.params.id);
    db.prepare('DELETE FROM purchases WHERE id = ?').run(req.params.id);

    logErasure(db, 'purchases', req.params.id, { ...old, items: purchaseItems }, req.body.reason || 'Deleted by user', req.user.id);
  });

  try {
    deletePurchase();
    res.json({ message: 'Purchase deleted and inventory reversed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
