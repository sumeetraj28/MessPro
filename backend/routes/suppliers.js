const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.query;
  let query = 'SELECT * FROM suppliers';
  const params = [];
  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY name';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const purchases = db.prepare(
    'SELECT * FROM purchases WHERE supplier_id = ? ORDER BY purchase_date DESC LIMIT 10'
  ).all(req.params.id);

  res.json({ ...supplier, recentPurchases: purchases });
});

router.post('/', authenticateToken, (req, res) => {
  const { name, contact_person, phone, email, address, gst_number } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = req.app.locals.db;
  const result = db.prepare(
    'INSERT INTO suppliers (name, contact_person, phone, email, address, gst_number) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, contact_person || null, phone || null, email || null, address || null, gst_number || null);

  logChange(db, 'suppliers', result.lastInsertRowid, 'create', null, req.body, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

router.put('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Supplier not found' });

  const { name, contact_person, phone, email, address, gst_number, status } = req.body;
  db.prepare(
    'UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, address=?, gst_number=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(
    name || old.name, contact_person !== undefined ? contact_person : old.contact_person,
    phone !== undefined ? phone : old.phone, email !== undefined ? email : old.email,
    address !== undefined ? address : old.address, gst_number !== undefined ? gst_number : old.gst_number,
    status || old.status, req.params.id
  );

  logChange(db, 'suppliers', req.params.id, 'update', old, req.body, req.user.id);
  res.json({ message: 'Updated successfully' });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Supplier not found' });

  db.prepare("UPDATE suppliers SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  logErasure(db, 'suppliers', req.params.id, old, req.body.reason || 'Deactivated by user', req.user.id);
  res.json({ message: 'Supplier deactivated' });
});

// Bulk import suppliers
router.post('/bulk-import', authenticateToken, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No suppliers provided' });

  const db = req.app.locals.db;
  const insert = db.prepare('INSERT INTO suppliers (name, contact_person, phone, email, address, gst_number) VALUES (?, ?, ?, ?, ?, ?)');

  let imported = 0, skipped = 0, errors = [];
  const txn = db.transaction(() => {
    for (const s of items) {
      try {
        if (!s.name || !s.name.trim()) { skipped++; continue; }
        const result = insert.run(s.name.trim(), s.contact_person || null, s.phone || null, s.email || null, s.address || null, s.gst_number || null);
        logChange(db, 'suppliers', result.lastInsertRowid, 'create', null, s, req.user.id);
        imported++;
      } catch (err) {
        errors.push(`Row "${s.name}": ${err.message}`);
        skipped++;
      }
    }
  });
  txn();
  res.json({ imported, skipped, errors });
});

module.exports = router;
