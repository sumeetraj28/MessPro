import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Package, AlertTriangle, ArrowDown, ArrowUp, Minus, Trash, Download } from 'lucide-react';
import { exportToExcel } from '../utils/exportImport';

function formatCurrency(amt) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
}

export default function Inventory() {
  const { apiFetch } = useAuth();
  const [stockItems, setStockItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');
  const [showAction, setShowAction] = useState(null); // { type: 'consume'|'adjust'|'wastage', item: null }
  const [actionForm, setActionForm] = useState({ quantity: '', notes: '' });
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const loadData = () => {
    Promise.all([
      apiFetch('/inventory'),
      apiFetch('/inventory/transactions')
    ]).then(([stock, txns]) => {
      setStockItems(stock);
      setTransactions(txns);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (e) => {
    e.preventDefault();
    try {
      const endpoint = showAction.type === 'consume' ? '/inventory/consume'
        : showAction.type === 'wastage' ? '/inventory/wastage'
        : '/inventory/adjust';

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          item_id: showAction.item.id,
          quantity: parseFloat(actionForm.quantity),
          notes: actionForm.notes,
          type: showAction.type === 'adjust' ? 'adjustment' : undefined
        })
      });
      setToast({ message: `${showAction.type} recorded successfully!`, type: 'success' });
      setShowAction(null);
      setActionForm({ quantity: '', notes: '' });
      loadData();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const filteredItems = stockItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = stockItems.filter(i => i.is_low_stock).length;

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor stock levels and movements</p>
        </div>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-700">{lowStockCount} items low on stock</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {activeTab === 'stock' && (
          <button onClick={() => exportToExcel(stockItems, [
            { header: 'Name', key: 'name' },
            { header: 'Category', key: 'category_name' },
            { header: 'Current Stock', key: 'current_stock' },
            { header: 'Unit', key: 'unit' },
            { header: 'Min Stock Level', key: 'min_stock_level' },
            { header: 'Cost Per Unit', key: 'cost_per_unit' },
            { header: 'Low Stock', key: 'is_low_stock', format: (v) => v ? 'Yes' : 'No' },
          ], 'inventory_stock', 'Stock Levels')} className="btn btn-secondary text-xs"><Download size={16} /> Export Stock</button>
        )}
        {activeTab === 'transactions' && (
          <button onClick={() => exportToExcel(transactions, [
            { header: 'Date', key: 'created_at', format: (v) => new Date(v).toLocaleDateString('en-IN') },
            { header: 'Item', key: 'item_name' },
            { header: 'Type', key: 'type' },
            { header: 'Quantity', key: 'quantity' },
            { header: 'Unit', key: 'unit' },
            { header: 'Notes', key: 'notes' },
            { header: 'By', key: 'created_by_name' },
          ], 'inventory_transactions', 'Transactions')} className="btn btn-secondary text-xs"><Download size={16} /> Export Transactions</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
        <button onClick={() => setActiveTab('stock')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'stock' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
          Stock Levels
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
          Transactions
        </button>
      </div>

      {activeTab === 'stock' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input max-w-sm"
            />
          </div>

          <div className="grid gap-3">
            {filteredItems.map(item => {
              const stockPercent = item.min_stock_level > 0 ? (item.current_stock / (item.min_stock_level * 3)) * 100 : 50;
              const stockColor = item.is_low_stock ? 'bg-rose-500' : stockPercent > 50 ? 'bg-emerald-500' : 'bg-amber-500';

              return (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.is_low_stock ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                    <Package size={20} className={item.is_low_stock ? 'text-rose-600' : 'text-emerald-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">{item.name}</h3>
                      {item.category_name && <span className="badge badge-purple">{item.category_name}</span>}
                      {item.is_low_stock ? <span className="badge badge-red">Low Stock</span> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex-1 max-w-xs">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${stockColor} transition-all`} style={{ width: `${Math.min(stockPercent, 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.current_stock} {item.unit}</span>
                      <span className="text-xs text-slate-400">min: {item.min_stock_level} {item.unit}</span>
                      <span className="text-xs text-slate-400">{formatCurrency(item.cost_per_unit)}/{item.unit}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => { setShowAction({ type: 'consume', item }); setActionForm({ quantity: '', notes: '' }); }}
                      className="btn btn-secondary text-xs py-1.5 px-2.5" title="Record Consumption">
                      <ArrowDown size={14} /> Use
                    </button>
                    <button onClick={() => { setShowAction({ type: 'adjust', item }); setActionForm({ quantity: '', notes: '' }); }}
                      className="btn btn-secondary text-xs py-1.5 px-2.5" title="Adjust Stock">
                      <Minus size={14} /> Adjust
                    </button>
                    <button onClick={() => { setShowAction({ type: 'wastage', item }); setActionForm({ quantity: '', notes: '' }); }}
                      className="p-1.5 hover:bg-rose-50 rounded-lg" title="Record Wastage">
                      <Trash size={14} className="text-rose-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr><th>Date</th><th>Item</th><th>Type</th><th>Quantity</th><th>Notes</th><th>By</th></tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan="6" className="text-center py-8 text-slate-400">No transactions yet</td></tr>
              )}
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="font-medium">{t.item_name}</td>
                  <td>
                    <span className={`badge ${t.type === 'purchase' ? 'badge-green' : t.type === 'consumption' ? 'badge-blue' : t.type === 'wastage' ? 'badge-red' : 'badge-yellow'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`font-medium ${t.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.quantity > 0 ? '+' : ''}{t.quantity} {t.unit}
                  </td>
                  <td className="text-slate-500">{t.notes || '—'}</td>
                  <td>{t.created_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <Modal isOpen={!!showAction} onClose={() => setShowAction(null)} title={`${showAction?.type === 'consume' ? 'Record Consumption' : showAction?.type === 'wastage' ? 'Record Wastage' : 'Adjust Stock'} - ${showAction?.item?.name || ''}`}>
        <form onSubmit={handleAction} className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <span className="text-slate-500">Current Stock:</span>{' '}
            <span className="font-semibold">{showAction?.item?.current_stock} {showAction?.item?.unit}</span>
          </div>
          <div>
            <label className="form-label">Quantity ({showAction?.item?.unit}) *</label>
            <input type="number" step="0.01" value={actionForm.quantity} onChange={e => setActionForm({ ...actionForm, quantity: e.target.value })} className="form-input" required min="0.01" />
            {showAction?.type === 'adjust' && <p className="text-xs text-slate-400 mt-1">Use negative value to reduce stock</p>}
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea value={actionForm.notes} onChange={e => setActionForm({ ...actionForm, notes: e.target.value })} className="form-input" rows="2" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAction(null)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className={`btn ${showAction?.type === 'wastage' ? 'btn-danger' : 'btn-primary'}`}>
              {showAction?.type === 'consume' ? 'Record Consumption' : showAction?.type === 'wastage' ? 'Record Wastage' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
