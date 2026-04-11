const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

function initDB() {
  const db = new Database(path.join(__dirname, 'mess.db'));
  
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Users with roles
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'manager', 'staff')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Categories for raw materials
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Raw material items
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      unit TEXT NOT NULL DEFAULT 'kg',
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock_level REAL NOT NULL DEFAULT 0,
      cost_per_unit REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Purchases
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      invoice_number TEXT,
      purchase_date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'credit')),
      payment_status TEXT DEFAULT 'paid' CHECK(payment_status IN ('paid', 'pending', 'partial')),
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Purchase line items
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    -- Inventory transactions
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('purchase', 'consumption', 'adjustment', 'wastage', 'return')),
      quantity REAL NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Menu items (dishes)
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
      description TEXT,
      cost_per_plate REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily menu planning
    CREATE TABLE IF NOT EXISTS daily_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
      menu_item_id INTEGER NOT NULL,
      planned_quantity INTEGER DEFAULT 0,
      actual_served INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    -- Meal collections / daily income
    CREATE TABLE IF NOT EXISTS meal_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
      total_members INTEGER NOT NULL DEFAULT 0,
      rate_per_head REAL NOT NULL DEFAULT 0,
      total_collected REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('salary', 'rent', 'utilities', 'maintenance', 'equipment', 'transport', 'gas', 'miscellaneous')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'upi', 'card', 'bank_transfer')),
      receipt_number TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Store Register (Items In / Items Out)
    CREATE TABLE IF NOT EXISTS store_register (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('in', 'out')),
      quantity REAL NOT NULL,
      rate REAL NOT NULL DEFAULT 0,
      total_value REAL NOT NULL DEFAULT 0,
      supplier_id INTEGER,
      purpose TEXT NOT NULL DEFAULT 'kitchen',
      issued_to TEXT,
      bill_number TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Change logs (audit trail)
    CREATE TABLE IF NOT EXISTS change_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
      old_values TEXT,
      new_values TEXT,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    -- Erasure logs
    CREATE TABLE IF NOT EXISTS erasure_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      erased_data TEXT NOT NULL,
      reason TEXT,
      erased_by INTEGER,
      erased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (erased_by) REFERENCES users(id)
    );

    -- User sessions (login history)
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      logout_at DATETIME,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Seed default admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)').run(
      'admin', hashedPassword, 'Administrator', 'admin@mess.com', 'admin'
    );
  }

  // Seed default categories
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const categories = [
      ['Vegetables', 'Fresh vegetables and greens'],
      ['Fruits', 'Fresh fruits'],
      ['Grains & Cereals', 'Rice, wheat, dal, etc.'],
      ['Dairy', 'Milk, curd, paneer, ghee'],
      ['Spices & Condiments', 'Masalas, salt, oil'],
      ['Meat & Poultry', 'Chicken, mutton, fish, eggs'],
      ['Beverages', 'Tea, coffee, juices'],
      ['Others', 'Miscellaneous items']
    ];
    const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    for (const [name, desc] of categories) {
      insertCat.run(name, desc);
    }
  }

  console.log('Database initialized successfully');
  return db;
}

// Audit logging helper
function logChange(db, tableName, recordId, action, oldValues, newValues, userId) {
  db.prepare(
    'INSERT INTO change_logs (table_name, record_id, action, old_values, new_values, changed_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(tableName, recordId, action, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, userId);
}

function logErasure(db, tableName, recordId, erasedData, reason, userId) {
  db.prepare(
    'INSERT INTO erasure_logs (table_name, record_id, erased_data, reason, erased_by) VALUES (?, ?, ?, ?, ?)'
  ).run(tableName, recordId, JSON.stringify(erasedData), reason, userId);
}

module.exports = { initDB, logChange, logErasure };
