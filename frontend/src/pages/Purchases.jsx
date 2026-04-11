import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Plus, Eye, Trash2, Search, Filter, Download } from 'lucide-react';
import { exportToExcel } from '../utils/exportImport';

function formatCurrency(amt) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
}

export default function Purchases() {
  const { apiFetch } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', supplier_id: '' });

  const [form, setForm] = useState({
    supplier_id: '', invoice_number: '', purchase_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash', payment_status: 'paid', notes: '',
    items: [{ item_id: '', quantity: '', unit_price: '' }]
  });

  const loadData = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.supplier_id) params.set('supplier_id', filters.supplier_id);

    Promise.all([
      apiFetch(`/purchases?${params}`),
      apiFetch('/suppliers?status=active'),
      apiFetch('/items?status=active')
    ]).then(([p, s, i]) => {
      setPurchases(p);
      setSuppliers(s);
      setItems(i);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filters]);

  const addItemRow = () => {
    setForm({ ...form, items: [...form.items, { item_id: '', quantity: '', unit_price: '' }] });
  };

  const removeItemRow = (index) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItemRow = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const getTotal = () => form.items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        items: form.items.filter(i => i.item_id && i.quantity && i.unit_price).map(i => ({
          item_id: parseInt(i.item_id),
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price)
        }))
      };
      if (payload.items.length === 0) throw new Error('Add at least one item');

      await apiFetch('/purchases', { method: 'POST', body: JSON.stringify(payload) });
      setToast({ message: 'Purchase recorded successfully!', type: 'success' });
      setShowForm(false);
      setForm({
        supplier_id: '', invoice_number: '', purchase_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash', payment_status: 'paid', notes: '',
        items: [{ item_id: '', quantity: '', unit_price: '' }]
      });
      loadData();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this purchase? This will reverse inventory changes.')) return;
    try {
      await apiFetch(`/purchases/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
      setToast({ message: 'Purchase deleted', type: 'success' });
      loadData();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const viewDetail = async (id) => {
    const detail = await apiFetch(`/purchases/${id}`);
    setShowDetail(detail);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
          <p className="text-slate-500 text-sm mt-1">Track all your purchasing records</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus size={18} /> New Purchase
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => exportToExcel(purchases, [
          { header: 'Date', key: 'purchase_date' },
          { header: 'Supplier', key: 'supplier_name' },
          { header: 'Invoice', key: 'invoice_number' },
          { header: 'Amount', key: 'total_amount' },
          { header: 'Payment Method', key: 'payment_method' },
          { header: 'Payment Status', key: 'payment_status' },
        ], 'purchases', 'Purchases')} className="btn btn-secondary text-xs"><Download size={16} /> Export to Excel</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-slate-200/60 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label">From</label>
          <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="form-input" />
        </div>
        <div>
          <label className="form-label">To</label>
          <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="form-input" />
        </div>
        <div>
          <label className="form-label">Supplier</label>
          <select value={filters.supplier_id} onChange={e => setFilters({ ...filters, supplier_id: e.target.value })} className="form-select">
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={() => setFilters({ from: '', to: '', supplier_id: '' })} className="btn btn-secondary text-xs">Clear</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr><td colSpan="7" className="text-center py-8 text-slate-400">No purchases found</td></tr>
            )}
            {purchases.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.purchase_date}</td>
                <td>{p.supplier_name || '—'}</td>
                <td>{p.invoice_number || '—'}</td>
                <td className="font-semibold">{formatCurrency(p.total_amount)}</td>
                <td className="capitalize">{p.payment_method}</td>
                <td>
                  <span className={`badge ${p.payment_status === 'paid' ? 'badge-green' : p.payment_status === 'pending' ? 'badge-yellow' : 'badge-blue'}`}>
                    {p.payment_status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => viewDetail(p.id)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye size={15} className="text-slate-500" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 size={15} className="text-rose-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Purchase" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Supplier</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="form-select">
                <option value="">Select Supplier (Optional)</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Invoice Number</label>
              <input type="text" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} className="form-input" placeholder="INV-001" />
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="form-select">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Payment Status</label>
            <div className="flex gap-3">
              {['paid', 'pending', 'partial'].map(s => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="payment_status" value={s} checked={form.payment_status === s} onChange={e => setForm({ ...form, payment_status: e.target.value })} className="accent-brand-600" />
                  <span className="text-sm capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Items *</label>
              <button type="button" onClick={addItemRow} className="text-brand-600 text-sm font-medium hover:text-brand-700">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={item.item_id} onChange={e => updateItemRow(i, 'item_id', e.target.value)} className="form-select col-span-5">
                    <option value="">Select Item</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                  </select>
                  <input type="number" step="0.01" placeholder="Qty" value={item.quantity} onChange={e => updateItemRow(i, 'quantity', e.target.value)} className="form-input col-span-2" />
                  <input type="number" step="0.01" placeholder="Price/unit" value={item.unit_price} onChange={e => updateItemRow(i, 'unit_price', e.target.value)} className="form-input col-span-3" />
                  <span className="text-sm font-medium text-slate-600 col-span-1 text-right">
                    {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                  </span>
                  <button type="button" onClick={() => removeItemRow(i)} className="text-rose-500 hover:text-rose-700 col-span-1 text-center">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-lg font-bold text-slate-800">Total: {formatCurrency(getTotal())}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Purchase</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title={`Purchase #${showDetail?.id || ''}`} size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Supplier:</span> <span className="font-medium">{showDetail.supplier_name || 'Direct'}</span></div>
              <div><span className="text-slate-500">Date:</span> <span className="font-medium">{showDetail.purchase_date}</span></div>
              <div><span className="text-slate-500">Invoice:</span> <span className="font-medium">{showDetail.invoice_number || '—'}</span></div>
              <div><span className="text-slate-500">Payment:</span> <span className="font-medium capitalize">{showDetail.payment_method} · {showDetail.payment_status}</span></div>
              <div><span className="text-slate-500">Recorded by:</span> <span className="font-medium">{showDetail.created_by_name}</span></div>
              {showDetail.notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span className="font-medium">{showDetail.notes}</span></div>}
            </div>

            <table className="w-full data-table mt-4">
              <thead>
                <tr><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                {showDetail.items?.map(item => (
                  <tr key={item.id}>
                    <td>{item.item_name}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td className="font-semibold">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-lg font-bold text-slate-800 pt-2">
              Total: {formatCurrency(showDetail.total_amount)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
