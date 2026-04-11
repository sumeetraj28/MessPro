const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active');

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Log session
  const ip = req.ip || req.connection.remoteAddress;
  const ua = req.headers['user-agent'] || '';
  db.prepare('INSERT INTO user_sessions (user_id, ip_address, user_agent) VALUES (?, ?, ?)').run(user.id, ip, ua);

  res.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, email: user.email }
  });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const user = db.prepare('SELECT id, username, full_name, email, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Change password
router.put('/password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.user.id);
  res.json({ message: 'Password updated successfully' });
});

// Logout (update session)
router.post('/logout', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  db.prepare(
    'UPDATE user_sessions SET logout_at = CURRENT_TIMESTAMP WHERE user_id = ? AND logout_at IS NULL ORDER BY login_at DESC LIMIT 1'
  ).run(req.user.id);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
