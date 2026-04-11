const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { from, to, category } = req.query;
  let query = `SELECT e.*, u.full_name as created_by_name FROM expenses e 
    LEFT JOIN users u ON e.created_by = u.id WHERE 1=1`;
  const params = [];

  if (from) { query += ' AND e.expense_date >= ?'; params.push(from); }
  if (to) { query += ' AND e.expense_date <= ?'; params.push(to); }
  if (category) { query += ' AND e.category = ?'; params.push(category); }

  query += ' ORDER BY e.expense_date DESC, e.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', authenticateToken, (req, res) => {
  const { category, description, amount, expense_date, payment_method, receipt_number, notes } = req.body;
  if (!category || !description || !amount || !expense_date) {
    return res.status(400).json({ error: 'Category, description, amount, and date required' });
  }

  const db = req.app.locals.db;
  const result = db.prepare(
    'INSERT INTO expenses (category, description, amount, expense_date, payment_method, receipt_number, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(category, description, amount, expense_date, payment_method || 'cash', receipt_number || null, notes || null, req.user.id);

  logChange(db, 'expenses', result.lastInsertRowid, 'create', null, req.body, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Expense not found' });

  const { category, description, amount, expense_date, payment_method, receipt_number, notes } = req.body;
  db.prepare(
    'UPDATE expenses SET category=?, description=?, amount=?, expense_date=?, payment_method=?, receipt_number=?, notes=? WHERE id=?'
  ).run(
    category || old.category, description || old.description, amount !== undefined ? amount : old.amount,
    expense_date || old.expense_date, payment_method || old.payment_method,
    receipt_number !== undefined ? receipt_number : old.receipt_number,
    notes !== undefined ? notes : old.notes, req.params.id
  );

  logChange(db, 'expenses', req.params.id, 'update', old, req.body, req.user.id);
  res.json({ message: 'Updated successfully' });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Expense not found' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  logErasure(db, 'expenses', req.params.id, old, req.body.reason || 'Deleted by user', req.user.id);
  res.json({ message: 'Expense deleted' });
});

// Bulk import expenses
router.post('/bulk-import', authenticateToken, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No expenses provided' });

  const db = req.app.locals.db;
  const insert = db.prepare('INSERT INTO expenses (category, description, amount, expense_date, payment_method, receipt_number, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const validCats = ['salary', 'rent', 'utilities', 'maintenance', 'equipment', 'transport', 'gas', 'miscellaneous'];

  let imported = 0, skipped = 0, errors = [];
  const txn = db.transaction(() => {
    for (const e of items) {
      try {
        if (!e.description || !e.amount || !e.expense_date) { skipped++; continue; }
        const cat = validCats.includes((e.category || '').toLowerCase()) ? e.category.toLowerCase() : 'miscellaneous';
        const result = insert.run(cat, e.description, parseFloat(e.amount), e.expense_date, e.payment_method || 'cash', e.receipt_number || null, e.notes || null, req.user.id);
        logChange(db, 'expenses', result.lastInsertRowid, 'create', null, e, req.user.id);
        imported++;
      } catch (err) {
        errors.push(`Row "${e.description}": ${err.message}`);
        skipped++;
      }
    }
  });
  txn();
  res.json({ imported, skipped, errors });
});

module.exports = router;
