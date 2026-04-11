const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to get date range
function getDateRange(period, from, to) {
  const now = new Date();
  if (from && to) return { start: from, end: to };

  switch (period) {
    case 'today':
      const today = now.toISOString().split('T')[0];
      return { start: today, end: today };
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return { start: weekStart.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    case 'month': {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { start: monthStart, end: now.toISOString().split('T')[0] };
    }
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = `${now.getFullYear()}-${String(qMonth + 1).padStart(2, '0')}-01`;
      return { start: qStart, end: now.toISOString().split('T')[0] };
    }
    case 'fy': {
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { start: `${fyYear}-04-01`, end: `${fyYear + 1}-03-31` };
    }
    case 'last_fy': {
      const lfyYear = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      return { start: `${lfyYear}-04-01`, end: `${lfyYear + 1}-03-31` };
    }
    default: {
      // Default: current month
      const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { start: mStart, end: now.toISOString().split('T')[0] };
    }
  }
}

// P&L Report
router.get('/pnl', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { period, from, to } = req.query;
  const range = getDateRange(period, from, to);

  const income = db.prepare(
    'SELECT COALESCE(SUM(total_collected), 0) as total FROM meal_collections WHERE date >= ? AND date <= ?'
  ).get(range.start, range.end).total;

  const purchases = db.prepare(
    'SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE purchase_date >= ? AND purchase_date <= ?'
  ).get(range.start, range.end).total;

  const expenses = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ?'
  ).get(range.start, range.end).total;

  // Expense breakdown
  const expenseBreakdown = db.prepare(
    'SELECT category, SUM(amount) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ? GROUP BY category ORDER BY total DESC'
  ).all(range.start, range.end);

  // Purchase breakdown by category
  const purchaseBreakdown = db.prepare(`
    SELECT c.name as category, COALESCE(SUM(pi.total_price), 0) as total
    FROM purchase_items pi
    JOIN items i ON pi.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    JOIN purchases p ON pi.purchase_id = p.id
    WHERE p.purchase_date >= ? AND p.purchase_date <= ?
    GROUP BY c.name ORDER BY total DESC
  `).all(range.start, range.end);

  // Income by meal type
  const incomeByMeal = db.prepare(
    'SELECT meal_type, SUM(total_collected) as total, SUM(total_members) as members FROM meal_collections WHERE date >= ? AND date <= ? GROUP BY meal_type'
  ).all(range.start, range.end);

  // Daily breakdown for the period
  const dailyBreakdown = db.prepare(`
    SELECT d.date,
      COALESCE((SELECT SUM(total_collected) FROM meal_collections WHERE date = d.date), 0) as income,
      COALESCE((SELECT SUM(total_amount) FROM purchases WHERE purchase_date = d.date), 0) as purchases,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE expense_date = d.date), 0) as expenses
    FROM (
      SELECT DISTINCT date FROM (
        SELECT date FROM meal_collections WHERE date >= ? AND date <= ?
        UNION SELECT purchase_date as date FROM purchases WHERE purchase_date >= ? AND purchase_date <= ?
        UNION SELECT expense_date as date FROM expenses WHERE expense_date >= ? AND expense_date <= ?
      )
    ) d ORDER BY d.date
  `).all(range.start, range.end, range.start, range.end, range.start, range.end);

  res.json({
    period: range,
    summary: {
      totalIncome: income,
      totalPurchases: purchases,
      totalExpenses: expenses,
      totalCost: purchases + expenses,
      grossProfit: income - purchases,
      netProfit: income - purchases - expenses,
      profitMargin: income > 0 ? ((income - purchases - expenses) / income * 100).toFixed(1) : 0
    },
    expenseBreakdown,
    purchaseBreakdown,
    incomeByMeal,
    dailyBreakdown
  });
});

// Purchase report
router.get('/purchases', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { period, from, to } = req.query;
  const range = getDateRange(period, from, to);

  const summary = db.prepare(`
    SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount,
      COALESCE(AVG(total_amount), 0) as avg_order_value
    FROM purchases WHERE purchase_date >= ? AND purchase_date <= ?
  `).get(range.start, range.end);

  const bySupplier = db.prepare(`
    SELECT s.name as supplier, COUNT(*) as orders, SUM(p.total_amount) as total
    FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.purchase_date >= ? AND p.purchase_date <= ?
    GROUP BY p.supplier_id ORDER BY total DESC
  `).all(range.start, range.end);

  const byPaymentStatus = db.prepare(`
    SELECT payment_status, COUNT(*) as count, SUM(total_amount) as total
    FROM purchases WHERE purchase_date >= ? AND purchase_date <= ?
    GROUP BY payment_status
  `).all(range.start, range.end);

  const topItems = db.prepare(`
    SELECT i.name, i.unit, SUM(pi.quantity) as total_qty, SUM(pi.total_price) as total_value
    FROM purchase_items pi
    JOIN items i ON pi.item_id = i.id
    JOIN purchases p ON pi.purchase_id = p.id
    WHERE p.purchase_date >= ? AND p.purchase_date <= ?
    GROUP BY pi.item_id ORDER BY total_value DESC LIMIT 10
  `).all(range.start, range.end);

  res.json({ period: range, summary, bySupplier, byPaymentStatus, topItems });
});

// Inventory report
router.get('/inventory', authenticateToken, (req, res) => {
  const db = req.app.locals.db;

  const stockSummary = db.prepare(`
    SELECT i.*, c.name as category_name,
      (i.current_stock * i.cost_per_unit) as stock_value,
      CASE WHEN i.current_stock <= i.min_stock_level THEN 'low' 
           WHEN i.current_stock <= i.min_stock_level * 2 THEN 'medium'
           ELSE 'good' END as stock_status
    FROM items i LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.status = 'active' ORDER BY stock_status, i.name
  `).all();

  const totalStockValue = stockSummary.reduce((sum, item) => sum + item.stock_value, 0);
  const lowStockCount = stockSummary.filter(i => i.stock_status === 'low').length;
  const categoryBreakdown = db.prepare(`
    SELECT c.name as category, COUNT(*) as item_count, 
      COALESCE(SUM(i.current_stock * i.cost_per_unit), 0) as total_value
    FROM items i LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.status = 'active' GROUP BY c.name ORDER BY total_value DESC
  `).all();

  res.json({
    summary: { totalItems: stockSummary.length, totalStockValue, lowStockCount },
    items: stockSummary,
    categoryBreakdown
  });
});

module.exports = router;
