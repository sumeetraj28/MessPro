const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  
  // Get financial year dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const fyEnd = now.getMonth() >= 3
    ? `${now.getFullYear() + 1}-03-31`
    : `${now.getFullYear()}-03-31`;

  // Total purchases this month
  const monthlyPurchases = db.prepare(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE purchase_date LIKE ? || '%'"
  ).get(thisMonth).total;

  // Total purchases today
  const todayPurchases = db.prepare(
    'SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE purchase_date = ?'
  ).get(today).total;

  // Total income this month (meal collections)
  const monthlyIncome = db.prepare(
    "SELECT COALESCE(SUM(total_collected), 0) as total FROM meal_collections WHERE date LIKE ? || '%'"
  ).get(thisMonth).total;

  // Total expenses this month
  const monthlyExpenses = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ? || '%'"
  ).get(thisMonth).total;

  // FY totals
  const fyPurchases = db.prepare(
    'SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE purchase_date >= ? AND purchase_date <= ?'
  ).get(fyStart, fyEnd).total;

  const fyIncome = db.prepare(
    'SELECT COALESCE(SUM(total_collected), 0) as total FROM meal_collections WHERE date >= ? AND date <= ?'
  ).get(fyStart, fyEnd).total;

  const fyExpenses = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?'
  ).get(fyStart, fyEnd).total;

  // Low stock items
  const lowStockItems = db.prepare(
    'SELECT COUNT(*) as count FROM items WHERE current_stock <= min_stock_level AND status = ?'
  ).get('active').count;

  // Total items in inventory
  const totalItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE status = ?').get('active').count;

  // Pending payments
  const pendingPayments = db.prepare(
    "SELECT COUNT(*) as count FROM purchases WHERE payment_status IN ('pending', 'partial')"
  ).get().count;

  // Total suppliers
  const totalSuppliers = db.prepare("SELECT COUNT(*) as count FROM suppliers WHERE status = 'active'").get().count;

  // Active menu items
  const activeMenuItems = db.prepare('SELECT COUNT(*) as count FROM menu_items WHERE is_active = 1').get().count;

  // Recent purchases (last 5)
  const recentPurchases = db.prepare(`
    SELECT p.*, s.name as supplier_name 
    FROM purchases p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    ORDER BY p.created_at DESC LIMIT 5
  `).all();

  // Purchase trend (last 7 days)
  const purchaseTrend = db.prepare(`
    SELECT purchase_date as date, SUM(total_amount) as total 
    FROM purchases 
    WHERE purchase_date >= date('now', '-7 days')
    GROUP BY purchase_date 
    ORDER BY purchase_date
  `).all();

  // Expense breakdown this month
  const expenseBreakdown = db.prepare(`
    SELECT category, SUM(amount) as total 
    FROM expenses 
    WHERE expense_date LIKE ? || '%'
    GROUP BY category 
    ORDER BY total DESC
  `).all(thisMonth);

  // Monthly P&L trend (last 6 months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const income = db.prepare(
      "SELECT COALESCE(SUM(total_collected), 0) as total FROM meal_collections WHERE date LIKE ? || '%'"
    ).get(m).total;
    const purchases = db.prepare(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE purchase_date LIKE ? || '%'"
    ).get(m).total;
    const expenses = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ? || '%'"
    ).get(m).total;
    months.push({ month: m, income, purchases, expenses, profit: income - purchases - expenses });
  }

  res.json({
    stats: {
      todayPurchases,
      monthlyPurchases,
      monthlyIncome,
      monthlyExpenses,
      monthlyProfit: monthlyIncome - monthlyPurchases - monthlyExpenses,
      fyPurchases,
      fyIncome,
      fyExpenses,
      fyProfit: fyIncome - fyPurchases - fyExpenses,
      lowStockItems,
      totalItems,
      pendingPayments,
      totalSuppliers,
      activeMenuItems
    },
    recentPurchases,
    purchaseTrend,
    expenseBreakdown,
    monthlyTrend: months
  });
});

module.exports = router;
