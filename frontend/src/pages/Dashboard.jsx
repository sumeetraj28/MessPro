import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, TrendingDown, ShoppingCart, IndianRupee, Package,
  AlertTriangle, Truck, UtensilsCrossed, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function StatCard({ title, value, icon: Icon, color, trend, trendLabel }) {
  const colorMap = {
    blue: 'from-sky-500 to-blue-600',
    green: 'from-emerald-500 to-green-600',
    purple: 'from-violet-500 to-purple-600',
    orange: 'from-orange-500 to-amber-500',
    rose: 'from-rose-500 to-pink-600',
    indigo: 'from-indigo-500 to-brand-600'
  };
  const bgMap = {
    blue: 'bg-sky-50', green: 'bg-emerald-50', purple: 'bg-violet-50',
    orange: 'bg-orange-50', rose: 'bg-rose-50', indigo: 'bg-indigo-50'
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {trendLabel && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <ArrowUpRight size={14} className="text-emerald-500" />
              ) : (
                <ArrowDownRight size={14} className="text-rose-500" />
              )}
              <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trendLabel}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgMap[color]}`}>
          <div className={`w-8 h-8 bg-gradient-to-br ${colorMap[color]} rounded-lg flex items-center justify-center`}>
            <Icon size={18} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ data, dataKey, color }) {
  if (!data || data.length === 0) return <div className="text-slate-400 text-sm text-center py-8">No data</div>;
  const max = Math.max(...data.map(d => d[dataKey] || 0), 1);

  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-md ${color} transition-all duration-300`}
            style={{ height: `${((d[dataKey] || 0) / max) * 100}%`, minHeight: d[dataKey] ? '4px' : '0px' }}
          />
          <span className="text-[10px] text-slate-400 truncate w-full text-center">
            {d.date?.slice(-2) || d.month?.slice(-2) || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/dashboard').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="text-slate-500">Failed to load dashboard</div>;

  const { stats, recentPurchases, purchaseTrend, expenseBreakdown, monthlyTrend } = data;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your mess performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Monthly Income" value={formatCurrency(stats.monthlyIncome)} icon={IndianRupee} color="green" />
        <StatCard title="Monthly Purchases" value={formatCurrency(stats.monthlyPurchases)} icon={ShoppingCart} color="blue" />
        <StatCard title="Monthly Expenses" value={formatCurrency(stats.monthlyExpenses)} icon={TrendingDown} color="orange" />
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.monthlyProfit)}
          icon={stats.monthlyProfit >= 0 ? TrendingUp : TrendingDown}
          color={stats.monthlyProfit >= 0 ? 'green' : 'rose'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Low Stock Items" value={stats.lowStockItems} icon={AlertTriangle} color={stats.lowStockItems > 0 ? 'rose' : 'green'} />
        <StatCard title="Total Items" value={stats.totalItems} icon={Package} color="purple" />
        <StatCard title="Active Suppliers" value={stats.totalSuppliers} icon={Truck} color="indigo" />
        <StatCard title="Menu Items" value={stats.activeMenuItems} icon={UtensilsCrossed} color="orange" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Purchase Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Purchase Trend (Last 7 Days)</h3>
          <MiniBarChart data={purchaseTrend} dataKey="total" color="bg-brand-500" />
        </div>

        {/* Monthly P&L */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly P&L Trend</h3>
          <div className="flex items-end gap-2 h-32">
            {monthlyTrend?.map((m, i) => {
              const maxVal = Math.max(...monthlyTrend.map(x => Math.max(x.income, x.purchases + x.expenses)), 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5">
                    <div className="flex-1 flex flex-col justify-end h-24">
                      <div className="bg-emerald-400 rounded-t-sm" style={{ height: `${(m.income / maxVal) * 100}%`, minHeight: m.income ? '2px' : 0 }} />
                    </div>
                    <div className="flex-1 flex flex-col justify-end h-24">
                      <div className="bg-rose-400 rounded-t-sm" style={{ height: `${((m.purchases + m.expenses) / maxVal) * 100}%`, minHeight: (m.purchases + m.expenses) ? '2px' : 0 }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">{m.month?.slice(-2)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-xs text-slate-500">Income</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-400" /><span className="text-xs text-slate-500">Costs</span></div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Recent Purchases</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPurchases?.length === 0 && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No purchases yet</div>
            )}
            {recentPurchases?.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-700">{p.supplier_name || 'Direct Purchase'}</p>
                  <p className="text-xs text-slate-400">{p.purchase_date} · {p.invoice_number || 'No invoice'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{formatCurrency(p.total_amount)}</p>
                  <span className={`badge ${p.payment_status === 'paid' ? 'badge-green' : p.payment_status === 'pending' ? 'badge-yellow' : 'badge-blue'}`}>
                    {p.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Expense Breakdown (This Month)</h3>
          </div>
          <div className="p-5 space-y-3">
            {expenseBreakdown?.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-4">No expenses this month</div>
            )}
            {expenseBreakdown?.map((e, i) => {
              const maxE = Math.max(...expenseBreakdown.map(x => x.total), 1);
              const colors = ['bg-brand-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-slate-500', 'bg-amber-500'];
              return (
                <div key={e.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 capitalize">{e.category}</span>
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(e.total)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`} style={{ width: `${(e.total / maxE) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FY Summary */}
      <div className="mt-6 bg-gradient-to-r from-brand-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <h3 className="text-sm font-medium text-white/80 mb-3">Financial Year Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-white/60 text-xs">Total Income</p>
            <p className="text-xl font-bold">{formatCurrency(stats.fyIncome)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Total Purchases</p>
            <p className="text-xl font-bold">{formatCurrency(stats.fyPurchases)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Total Expenses</p>
            <p className="text-xl font-bold">{formatCurrency(stats.fyExpenses)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Net Profit</p>
            <p className="text-xl font-bold">{formatCurrency(stats.fyProfit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
