# MessPro - Mess Management System

A comprehensive mess/canteen management system built with React + Express + SQLite.

## Features
- **Dashboard** - Overview of daily operations, income, expenses
- **Purchases** - Track purchase orders with supplier management
- **Inventory** - Real-time stock levels with low-stock alerts
- **Store Register** - Track items in/out with full ledger view
- **Menu Management** - Plan daily menus, track meal collections
- **Expenses** - Record and categorize operational expenses
- **Reports** - P&L statements, purchase reports, inventory reports
- **Audit Trail** - Complete change log, erasure log, login history
- **User Management** - Role-based access (admin, manager, staff)
- **Import/Export** - Bulk XLSX import, Excel/PDF report downloads

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js + better-sqlite3
- **Auth**: JWT-based authentication

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Build frontend
npm run build

# Start production server
npm start
```

For development:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Deploy to Render.com
1. Push to GitHub
2. Connect your repo on [Render](https://render.com)
3. Use the `render.yaml` blueprint for automatic configuration
4. The persistent disk stores your SQLite database

## Default Login
- Username: `admin`
- Password: `admin123`

> Change the default password after first login!
