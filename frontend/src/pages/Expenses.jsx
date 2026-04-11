import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Plus, Edit2, Trash2, Receipt, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, importFromExcel, downloadTemplate } from '../utils/exportImport';

function formatCurrency(amt) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
}

const catColors = {
  salary: 'badge-blue', rent: 'badge-purple', utilities: 'badge-yellow',
  maintenance: 'badge-gray', equipment: 'badge-blue', transport: 'badge-green',
  gas: 'badge-red', miscellaneous: 'badge-gray'
};

export default function Expenses() {
  const { apiFetch } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', category: '' });

  const [form, setForm] = useState({ category: 'miscellaneous', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash', receipt_number: '', notes: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const exportColumns = [
    { header: 'Date', key: 'expense_date' },
    { header: 'Category', key: 'category' },
    { header: 'Description', key: 'description' },
    { header: 'Amount', key: 'amount' },
    { header: 'Payment Method', key: 'payment_method' },
    { header: 'Receipt Number', key: 'receipt_number' },
    { header: 'Notes', key: 'notes' },
  ];

  const importColumns = [
    { header: 'Date', key: 'expense_date', example: '2026-04-01' },
    { header: 'Category', key: 'category', example: 'gas' },
    { header: 'Description', key: 'description', example: 'LPG Cylinder' },
    { header: 'Amount', key: 'amount', example: '1200' },
    { header: 'Payment Method', key: 'payment_method', example: 'cash' },
    { header: 'Receipt Number', key: 'receipt_number', example: 'RCP-001' },
    { header: 'Notes', key: 'notes', example: '' },
  ];

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = await importFromExcel(file, importColumns);
      setImportData(parsed);
      setShowImportModal(true);
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    setImporting(true);
    try {
      const result = await apiFetch('/expenses/bulk-import', { method: 'POST', body: JSON.stringify({ items: importData }) });
      setToast({ message: `Imported ${result.imported} expenses${result.skipped ? `, ${result.skipped} skipped` : ''}`, type: result.imported > 0 ? 'success' : 'warning' });
      setShowImportModal(false);
      setImportData(null);
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setImporting(false);
  };

  const loadData = () => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category) params.set('category', filters.category);
    apiFetch(`/expenses?${params}`).then(setExpenses).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editItem) {
        await apiFetch(`/expenses/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setToast({ message: 'Expense updated!', type: 'success' });
      } else {
        await apiFetch('/expenses', { method: 'POST', body: JSON.stringify(payload) });
        setToast({ message: 'Expense recorded!', type: 'success' });
      }
      closeForm();
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await apiFetch(`/expenses/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
      setToast({ message: 'Expense deleted', type: 'success' });
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const startEdit = (item) => {
    setEditItem(item);
    setForm({ category: item.category, description: item.description, amount: item.amount, expense_date: item.expense_date, payment_method: item.payment_method, receipt_number: item.receipt_number || '', notes: item.notes || '' });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditItem(null); setForm({ category: 'miscellaneous', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash', receipt_number: '', notes: '' }); };

  const totalFiltered = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
          <p className="text-slate-500 text-sm mt-1">Track operational expenses</p>
        </div>
        <button onClick={() => { closeForm(); setShowForm(true); }} className="btn btn-primary"><Plus size={18} /> Add Expense</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => downloadTemplate(importColumns, 'expenses')} className="btn btn-secondary text-xs"><FileSpreadsheet size={16} /> Template</button>
        <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary text-xs"><Upload size={16} /> Import</button>
        <button onClick={() => exportToExcel(expenses, exportColumns, 'expenses', 'Expenses')} className="btn btn-secondary text-xs"><Download size={16} /> Export</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-slate-200/60 flex flex-wrap gap-3 items-end">
        <div><label className="form-label">From</label><input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="form-input" /></div>
        <div><label className="form-label">To</label><input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="form-input" /></div>
        <div><label className="form-label">Category</label>
          <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="form-select">
            <option value="">All</option>
            {['salary', 'rent', 'utilities', 'maintenance', 'equipment', 'transport', 'gas', 'miscellaneous'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
        <button onClick={() => setFilters({ from: '', to: '', category: '' })} className="btn btn-secondary text-xs">Clear</button>
        <div className="ml-auto bg-brand-50 px-4 py-2 rounded-lg">
          <span className="text-sm text-brand-600 font-medium">Total: {formatCurrency(totalFiltered)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Payment</th><th>Receipt</th><th>Actions</th></tr></thead>
          <tbody>
            {expenses.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-slate-400">No expenses found</td></tr>}
            {expenses.map(e => (
              <tr key={e.id}>
                <td className="font-medium">{e.expense_date}</td>
                <td><span className={`badge ${catColors[e.category] || 'badge-gray'}`}>{e.category}</span></td>
                <td>{e.description}</td>
                <td className="font-semibold">{formatCurrency(e.amount)}</td>
                <td className="capitalize">{e.payment_method}</td>
                <td className="text-slate-400">{e.receipt_number || '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(e)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Edit2 size={15} className="text-slate-500" /></button>
                    <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 size={15} className="text-rose-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={closeForm} title={editItem ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="form-select">
                {['salary', 'rent', 'utilities', 'maintenance', 'equipment', 'transport', 'gas', 'miscellaneous'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div><label className="form-label">Date *</label><input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} className="form-input" required /></div>
          </div>
          <div><label className="form-label">Description *</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="form-input" required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Amount (₹) *</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="form-input" required /></div>
            <div><label className="form-label">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="form-select">
                <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div><label className="form-label">Receipt Number</label><input type="text" value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} className="form-input" /></div>
          <div><label className="form-label">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-input" rows="2" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={closeForm} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add Expense'}</button>
          </div>
        </form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportData(null); }} title={`Import Expenses (${importData?.length || 0} rows)`} size="lg">
        <div className="max-h-64 overflow-auto mb-4">
          <table className="w-full data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Payment</th></tr></thead>
            <tbody>
              {importData?.map((r, i) => (
                <tr key={i}><td>{r.expense_date}</td><td>{r.category || 'miscellaneous'}</td><td>{r.description}</td><td>₹{r.amount}</td><td>{r.payment_method || 'cash'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setShowImportModal(false); setImportData(null); }} className="btn btn-secondary">Cancel</button>
          <button onClick={handleBulkImport} disabled={importing} className="btn btn-primary">{importing ? 'Importing...' : 'Confirm Import'}</button>
        </div>
      </Modal>
    </div>
  );
}
