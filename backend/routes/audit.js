const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Change logs
router.get('/changes', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { table_name, record_id, from, to, limit } = req.query;
  let query = `SELECT cl.*, u.full_name as changed_by_name 
    FROM change_logs cl LEFT JOIN users u ON cl.changed_by = u.id WHERE 1=1`;
  const params = [];

  if (table_name) { query += ' AND cl.table_name = ?'; params.push(table_name); }
  if (record_id) { query += ' AND cl.record_id = ?'; params.push(record_id); }
  if (from) { query += ' AND cl.changed_at >= ?'; params.push(from); }
  if (to) { query += " AND cl.changed_at <= ? || ' 23:59:59'"; params.push(to); }

  query += ` ORDER BY cl.changed_at DESC LIMIT ?`;
  params.push(parseInt(limit) || 100);
  res.json(db.prepare(query).all(...params));
});

// Erasure logs
router.get('/erasures', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { table_name, from, to } = req.query;
  let query = `SELECT el.*, u.full_name as erased_by_name 
    FROM erasure_logs el LEFT JOIN users u ON el.erased_by = u.id WHERE 1=1`;
  const params = [];

  if (table_name) { query += ' AND el.table_name = ?'; params.push(table_name); }
  if (from) { query += ' AND el.erased_at >= ?'; params.push(from); }
  if (to) { query += " AND el.erased_at <= ? || ' 23:59:59'"; params.push(to); }

  query += ' ORDER BY el.erased_at DESC LIMIT 100';
  res.json(db.prepare(query).all(...params));
});

// User sessions (login history)
router.get('/sessions', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { user_id, from, to } = req.query;
  let query = `SELECT us.*, u.full_name, u.username 
    FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE 1=1`;
  const params = [];

  if (user_id) { query += ' AND us.user_id = ?'; params.push(user_id); }
  if (from) { query += ' AND us.login_at >= ?'; params.push(from); }
  if (to) { query += " AND us.login_at <= ? || ' 23:59:59'"; params.push(to); }

  query += ' ORDER BY us.login_at DESC LIMIT 100';
  res.json(db.prepare(query).all(...params));
});

// Version history for a specific record
router.get('/versions/:table/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const changes = db.prepare(`
    SELECT cl.*, u.full_name as changed_by_name 
    FROM change_logs cl LEFT JOIN users u ON cl.changed_by = u.id
    WHERE cl.table_name = ? AND cl.record_id = ?
    ORDER BY cl.changed_at ASC
  `).all(req.params.table, req.params.id);
  res.json(changes);
});

module.exports = router;
