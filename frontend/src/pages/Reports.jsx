import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, TrendingDown, IndianRupee, Calendar, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportReportToExcel } from '../utils/exportImport';

function formatCurrency(amt) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
}

function fmtNum(n) { return new Intl.NumberFormat('en-IN').format(n); }

const presets = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'fy', label: 'Financial Year' },
  { key: 'last_fy', label: 'Last FY' },
];

export default function Reports() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('pnl');
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (custom.from && custom.to) {
        params.set('from', custom.from);
        params.set('to', custom.to);
      } else {
        params.set('period', period);
      }
      const endpoint = activeTab === 'pnl' ? '/reports/pnl' : activeTab === 'purchases' ? '/reports/purchases' : '/reports/inventory';
      const result = await apiFetch(`${endpoint}?${params}`);
      setData(result);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadReport(); }, [activeTab, period]);

  const getPeriodLabel = () => {
    if (custom.from && custom.to) return `${custom.from} to ${custom.to}`;
    const p = presets.find(pr => pr.key === period);
    return p ? p.label : period;
  };

  const downloadPnlExcel = () => {
    if (!data) return;
    const summaryRows = [
      { label: 'Total Income', value: formatCurrency(data.summary.totalIncome) },
      { label: 'Total Purchases', value: formatCurrency(data.summary.totalPurchases) },
      { label: 'Total Expenses', value: formatCurrency(data.summary.totalExpenses) },
      { label: 'Gross Profit', value: formatCurrency(data.summary.grossProfit) },
      { label: 'Net Profit', value: formatCurrency(data.summary.netProfit) },
      { label: 'Profit Margin', value: data.summary.profitMargin + '%' },
    ];
    const tables = [];
    if (data.incomeByMeal?.length) tables.push({ title: 'Income by Meal', headers: ['Meal Type', 'Members', 'Total'], rows: data.incomeByMeal.map(m => [m.meal_type, m.members, formatCurrency(m.total)]) });
    if (data.purchaseBreakdown?.length) tables.push({ title: 'Purchase Breakdown', headers: ['Category', 'Total'], rows: data.purchaseBreakdown.map(p => [p.category || 'Uncategorized', formatCurrency(p.total)]) });
    if (data.expenseBreakdown?.length) tables.push({ title: 'Expense Breakdown', headers: ['Category', 'Total'], rows: data.expenseBreakdown.map(e => [e.category, formatCurrency(e.total)]) });
    if (data.dailyBreakdown?.length) tables.push({ title: 'Daily Breakdown', headers: ['Date', 'Income', 'Purchases', 'Expenses', 'Net'], rows: data.dailyBreakdown.map(d => [d.date, formatCurrency(d.income), formatCurrency(d.purchases), formatCurrency(d.expenses), formatCurrency(d.income - d.purchases - d.expenses)]) });
    exportReportToExcel({ title: `Profit & Loss - ${getPeriodLabel()}`, summaryRows, tables, filename: `pnl_report_${period}` });
  };

  const downloadPnlPdf = () => {
    if (!data) return;
    const summaryRows = [
      { label: 'Total Income', value: formatCurrency(data.summary.totalIncome) },
      { label: 'Total Purchases', value: formatCurrency(data.summary.totalPurchases) },
      { label: 'Total Expenses', value: formatCurrency(data.summary.totalExpenses) },
      { label: 'Net Profit', value: formatCurrency(data.summary.netProfit) },
      { label: 'Profit Margin', value: data.summary.profitMargin + '%' },
    ];
    const tables = [];
    if (data.dailyBreakdown?.length) tables.push({ title: 'Daily Breakdown', headers: ['Date', 'Income', 'Purchases', 'Expenses', 'Net'], rows: data.dailyBreakdown.map(d => [d.date, formatCurrency(d.income), formatCurrency(d.purchases), formatCurrency(d.expenses), formatCurrency(d.income - d.purchases - d.expenses)]) });
    if (data.incomeByMeal?.length) tables.push({ title: 'Income by Meal Type', headers: ['Meal Type', 'Members', 'Total'], rows: data.incomeByMeal.map(m => [m.meal_type, fmtNum(m.members), formatCurrency(m.total)]) });
    if (data.purchaseBreakdown?.length) tables.push({ title: 'Purchase Breakdown', headers: ['Category', 'Total'], rows: data.purchaseBreakdown.map(p => [p.category || 'Uncategorized', formatCurrency(p.total)]) });
    if (data.expenseBreakdown?.length) tables.push({ title: 'Expense Breakdown', headers: ['Category', 'Total'], rows: data.expenseBreakdown.map(e => [e.category, formatCurrency(e.total)]) });
    exportToPDF({ title: 'Profit & Loss Statement', subtitle: `Period: ${getPeriodLabel()}`, summaryRows, tables, filename: `pnl_report_${period}` });
  };

  const downloadPurchaseExcel = () => {
    if (!data) return;
    const summaryRows = [
      { label: 'Total Orders', value: fmtNum(data.summary.total_orders) },
      { label: 'Total Amount', value: formatCurrency(data.summary.total_amount) },
      { label: 'Avg Order Value', value: formatCurrency(data.summary.avg_order_value) },
    ];
    const tables = [];
    if (data.bySupplier?.length) tables.push({ title: 'By Supplier', headers: ['Supplier', 'Orders', 'Total'], rows: data.bySupplier.map(s => [s.supplier || 'Direct', s.orders, formatCurrency(s.total)]) });
    if (data.topItems?.length) tables.push({ title: 'Top Items by Value', headers: ['Item', 'Quantity', 'Value'], rows: data.topItems.map(i => [i.name, `${i.total_qty} ${i.unit}`, formatCurrency(i.total_value)]) });
    exportReportToExcel({ title: `Purchase Report - ${getPeriodLabel()}`, summaryRows, tables, filename: `purchase_report_${period}` });
  };

  const downloadPurchasePdf = () => {
    if (!data) return;
    const summaryRows = [
      { label: 'Total Orders', value: fmtNum(data.summary.total_orders) },
      { label: 'Total Amount', value: formatCurrency(data.summary.total_amount) },
      { label: 'Avg Order Value', value: formatCurrency(data.summary.avg_order_value) },
    ];
    const tables = [];
    if (data.bySupplier?.length) tables.push({ title: 'By Supplier', headers: ['Supplier', 'Orders', 'Total'], rows: data.bySupplier.map(s => [s.supplier || 'Direct', s.orders, formatCurrency(s.total)]) });
    if (data.topItems?.length) tables.push({ title: 'Top Items', headers: ['Item', 'Qty', 'Value'], rows: data.topItems.map(i => [i.name, `${i.total_qty} ${i.unit}`, formatCurrency(i.total_value)]) });
    exportToPDF({ title: 'Purchase Report', subtitle: `Period: ${getPeriodLabel()}`, summaryRows, tables, filename: `purchase_report_${period}` });
  };

  const downloadInventoryExcel = () => {
    if (!data) return;
    const summaryRows = [
      { label: 'Total Items', value: fmtNum(data.summary.totalItems) },
      { label: 'Stock Value', value: formatCurrency(data.summary.totalStockValue) },
      { label: 'Low Stock Items', value: fmtNum(data.summary.lowStockCount) },
    ];
    const tables = [];
    if (data.categoryBreakdown?.length) tables.push({ title: 'Stock by Category', headers: ['Category', 'Items', 'Value'], rows: data.categoryBreakdown.map(c => [c.category || 'Uncategorized', c.item_count, formatCurrency(c.total_value)]) });
    if (data.items?.length) tables.push({ title: 'Detailed Stock', headers: ['Item', 'Category', 'Stock', 'Unit', 'Value', 'Status'], rows: data.items.map(i => [i.name, i.category_name || '—', i.current_stock, i.unit, formatCurrency(i.stock_value), i.stock_status]) });
    exportReportToExcel({ title: 'Inventory Report', summaryRows, tables, filename: 'inventory_report' });
  };

  const downloadInventoryPdf = () => {
    if (!data) return;
    const summaryRows = [
      { label: 'Total Items', value: fmtNum(data.summary.totalItems) },
      { label: 'Stock Value', value: formatCurrency(data.summary.totalStockValue) },
      { label: 'Low Stock Items', value: fmtNum(data.summary.lowStockCount) },
    ];
    const tables = [];
    if (data.items?.length) tables.push({ title: 'Stock Details', headers: ['Item', 'Category', 'Stock', 'Unit', 'Value', 'Status'], rows: data.items.map(i => [i.name, i.category_name || '—', i.current_stock, i.unit, formatCurrency(i.stock_value), i.stock_status]) });
    exportToPDF({ title: 'Inventory Report', subtitle: `Generated ${new Date().toLocaleDateString('en-IN')}`, summaryRows, tables, filename: 'inventory_report' });
  };

  const tabs = [
    { key: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
    { key: 'purchases', label: 'Purchase Report', icon: BarChart3 },
    { key: 'inventory', label: 'Inventory Report', icon: IndianRupee },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Detailed financial and operational reports</p>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setData(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Period Selection */}
      {activeTab !== 'inventory' && (
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-slate-200/60">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-500 font-medium mr-2">Period:</span>
            {presets.map(p => (
              <button key={p.key} onClick={() => { setPeriod(p.key); setCustom({ from: '', to: '' }); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.key && !custom.from ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {p.label}
              </button>
            ))}
            <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 sm:ml-4">
              <input type="date" value={custom.from} onChange={e => setCustom({ ...custom, from: e.target.value })} className="form-input text-xs py-1.5" />
              <span className="text-slate-400">to</span>
              <input type="date" value={custom.to} onChange={e => setCustom({ ...custom, to: e.target.value })} className="form-input text-xs py-1.5" />
              {custom.from && custom.to && (
                <button onClick={loadReport} className="btn btn-primary text-xs py-1.5">Apply</button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}

      {/* Download Buttons */}
      {data && !loading && (
        <div className="flex gap-2 mb-6">
          <button onClick={() => {
            if (activeTab === 'pnl') downloadPnlExcel();
            else if (activeTab === 'purchases') downloadPurchaseExcel();
            else downloadInventoryExcel();
          }} className="btn btn-secondary text-xs flex items-center gap-1.5">
            <FileSpreadsheet size={16} /> Download Excel
          </button>
          <button onClick={() => {
            if (activeTab === 'pnl') downloadPnlPdf();
            else if (activeTab === 'purchases') downloadPurchasePdf();
            else downloadInventoryPdf();
          }} className="btn btn-secondary text-xs flex items-center gap-1.5">
            <FileText size={16} /> Download PDF
          </button>
        </div>
      )}

      {/* P&L Report */}
      {activeTab === 'pnl' && data && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Total Income</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(data.summary.totalIncome)}</p>
            </div>
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
              <p className="text-xs text-sky-600 font-medium">Total Purchases</p>
              <p className="text-xl font-bold text-sky-700 mt-1">{formatCurrency(data.summary.totalPurchases)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs text-amber-600 font-medium">Total Expenses</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(data.summary.totalExpenses)}</p>
            </div>
            <div className={`${data.summary.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} rounded-xl p-4 border`}>
              <p className={`text-xs font-medium ${data.summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Net Profit</p>
              <p className={`text-xl font-bold mt-1 ${data.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(data.summary.netProfit)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Margin: {data.summary.profitMargin}%</p>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Profit & Loss Statement</h3>
              <p className="text-xs text-slate-400">{data.period.start} to {data.period.end}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="font-semibold text-emerald-700">Revenue (Meal Collections)</span>
                <span className="font-bold text-emerald-700">{formatCurrency(data.summary.totalIncome)}</span>
              </div>

              {data.incomeByMeal?.map(m => (
                <div key={m.meal_type} className="flex justify-between text-sm py-1 pl-4">
                  <span className="text-slate-500 capitalize">{m.meal_type} ({m.members} members)</span>
                  <span className="text-slate-600">{formatCurrency(m.total)}</span>
                </div>
              ))}

              <div className="flex justify-between text-sm py-2 border-b border-slate-100 mt-4">
                <span className="font-semibold text-sky-700">Cost of Goods (Purchases)</span>
                <span className="font-bold text-sky-700">-{formatCurrency(data.summary.totalPurchases)}</span>
              </div>

              {data.purchaseBreakdown?.map(p => (
                <div key={p.category} className="flex justify-between text-sm py-1 pl-4">
                  <span className="text-slate-500">{p.category || 'Uncategorized'}</span>
                  <span className="text-slate-600">{formatCurrency(p.total)}</span>
                </div>
              ))}

              <div className="flex justify-between text-sm py-2 border-b border-brand-100 bg-brand-50/50 px-3 rounded-lg mt-4">
                <span className="font-semibold text-brand-700">Gross Profit</span>
                <span className="font-bold text-brand-700">{formatCurrency(data.summary.grossProfit)}</span>
              </div>

              <div className="flex justify-between text-sm py-2 border-b border-slate-100 mt-4">
                <span className="font-semibold text-amber-700">Operating Expenses</span>
                <span className="font-bold text-amber-700">-{formatCurrency(data.summary.totalExpenses)}</span>
              </div>

              {data.expenseBreakdown?.map(e => (
                <div key={e.category} className="flex justify-between text-sm py-1 pl-4">
                  <span className="text-slate-500 capitalize">{e.category}</span>
                  <span className="text-slate-600">{formatCurrency(e.total)}</span>
                </div>
              ))}

              <div className={`flex justify-between text-base py-3 mt-4 rounded-lg px-3 ${data.summary.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <span className={`font-bold ${data.summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>Net Profit / (Loss)</span>
                <span className={`font-bold ${data.summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{formatCurrency(data.summary.netProfit)}</span>
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          {data.dailyBreakdown?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead><tr><th>Date</th><th>Income</th><th>Purchases</th><th>Expenses</th><th>Net</th></tr></thead>
                  <tbody>
                    {data.dailyBreakdown.map(d => {
                      const net = d.income - d.purchases - d.expenses;
                      return (
                        <tr key={d.date}>
                          <td className="font-medium">{d.date}</td>
                          <td className="text-emerald-600">{formatCurrency(d.income)}</td>
                          <td className="text-sky-600">{formatCurrency(d.purchases)}</td>
                          <td className="text-amber-600">{formatCurrency(d.expenses)}</td>
                          <td className={`font-semibold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Purchase Report */}
      {activeTab === 'purchases' && data && !loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
              <p className="text-xs text-slate-500 font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{data.summary.total_orders}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
              <p className="text-xs text-slate-500 font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(data.summary.total_amount)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
              <p className="text-xs text-slate-500 font-medium">Avg Order Value</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(data.summary.avg_order_value)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Supplier */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">By Supplier</h3></div>
              <div className="p-5 space-y-2">
                {data.bySupplier?.map(s => {
                  const max = Math.max(...data.bySupplier.map(x => x.total), 1);
                  return (
                    <div key={s.supplier}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{s.supplier || 'Direct'} ({s.orders})</span>
                        <span className="font-medium">{formatCurrency(s.total)}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.total / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Top Items by Value</h3></div>
              <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead><tr><th>Item</th><th>Quantity</th><th>Value</th></tr></thead>
                <tbody>
                  {data.topItems?.map(i => (
                    <tr key={i.name}>
                      <td className="font-medium">{i.name}</td>
                      <td>{i.total_qty} {i.unit}</td>
                      <td className="font-semibold">{formatCurrency(i.total_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Report */}
      {activeTab === 'inventory' && data && !loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
              <p className="text-xs text-slate-500 font-medium">Total Items</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{data.summary.totalItems}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
              <p className="text-xs text-slate-500 font-medium">Stock Value</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(data.summary.totalStockValue)}</p>
            </div>
            <div className={`rounded-xl p-4 shadow-sm border ${data.summary.lowStockCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-xs font-medium text-slate-500">Low Stock</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{data.summary.lowStockCount}</p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Stock by Category</h3></div>
            <div className="p-5 space-y-2">
              {data.categoryBreakdown?.map(c => {
                const max = Math.max(...data.categoryBreakdown.map(x => x.total_value), 1);
                return (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{c.category || 'Uncategorized'} ({c.item_count} items)</span>
                      <span className="font-medium">{formatCurrency(c.total_value)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${(c.total_value / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full stock table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Detailed Stock</h3></div>
            <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Unit</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                {data.items?.map(i => (
                  <tr key={i.id}>
                    <td className="font-medium">{i.name}</td>
                    <td>{i.category_name || '—'}</td>
                    <td className={`font-semibold ${i.stock_status === 'low' ? 'text-rose-600' : i.stock_status === 'medium' ? 'text-amber-600' : 'text-slate-700'}`}>{i.current_stock}</td>
                    <td>{i.unit}</td>
                    <td>{formatCurrency(i.stock_value)}</td>
                    <td><span className={`badge ${i.stock_status === 'good' ? 'badge-green' : i.stock_status === 'medium' ? 'badge-yellow' : 'badge-red'}`}>{i.stock_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
