const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logChange, logErasure } = require('../db/init');

const router = express.Router();

router.get('/', authenticateToken, requireRole('admin', 'manager'), (req, res) => {
  const db = req.app.locals.db;
  const users = db.prepare('SELECT id, username, full_name, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  const { username, password, full_name, email, role } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name required' });
  }

  const db = req.app.locals.db;
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hashedPassword, full_name, email || null, role || 'staff');

    logChange(db, 'users', result.lastInsertRowid, 'create', null, { username, full_name, email, role }, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid, username, full_name, email, role: role || 'staff' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  const old = db.prepare('SELECT id, username, full_name, email, role, status FROM users WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'User not found' });

  const { full_name, email, role, status, password } = req.body;
  
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);
  }

  db.prepare(
    'UPDATE users SET full_name=?, email=?, role=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(
    full_name || old.full_name, email !== undefined ? email : old.email,
    role || old.role, status || old.status, req.params.id
  );

  logChange(db, 'users', req.params.id, 'update', old, { full_name, email, role, status }, req.user.id);
  res.json({ message: 'Updated successfully' });
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const db = req.app.locals.db;
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  const old = db.prepare('SELECT id, username, full_name, email, role, status FROM users WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'User not found' });

  db.prepare("UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  logErasure(db, 'users', req.params.id, old, req.body.reason || 'Deactivated by admin', req.user.id);
  res.json({ message: 'User deactivated' });
});

module.exports = router;
