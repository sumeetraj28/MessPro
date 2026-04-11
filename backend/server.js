const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/init');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const categoriesRoutes = require('./routes/categories');
const suppliersRoutes = require('./routes/suppliers');
const itemsRoutes = require('./routes/items');
const purchasesRoutes = require('./routes/purchases');
const inventoryRoutes = require('./routes/inventory');
const menuRoutes = require('./routes/menu');
const expensesRoutes = require('./routes/expenses');
const reportsRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const usersRoutes = require('./routes/users');
const storeRoutes = require('./routes/store');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS - allow all origins in production (served from same domain) or specific in dev
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : allowedOrigins
}));
app.use(express.json());

const db = initDB();
app.locals.db = db;

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/store', storeRoutes);

// Serve frontend in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDist, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mess Management Server running on port ${PORT}`);
});
