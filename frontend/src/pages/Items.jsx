import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Plus, Edit2, Boxes, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, importFromExcel, downloadTemplate } from '../utils/exportImport';

function formatCurrency(amt) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amt);
}

export default function Items() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ name: '', category_id: '', unit: 'kg', min_stock_level: '', cost_per_unit: '' });
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const exportColumns = [
    { header: 'Name', key: 'name' },
    { header: 'Category', key: 'category_name' },
    { header: 'Unit', key: 'unit' },
    { header: 'Current Stock', key: 'current_stock' },
    { header: 'Min Stock Level', key: 'min_stock_level' },
    { header: 'Cost Per Unit', key: 'cost_per_unit' },
    { header: 'Status', key: 'status' },
  ];

  const importColumns = [
    { header: 'Name', key: 'name', example: 'Onion' },
    { header: 'Category', key: 'category', example: 'Vegetables' },
    { header: 'Unit', key: 'unit', example: 'kg' },
    { header: 'Min Stock Level', key: 'min_stock_level', example: '10' },
    { header: 'Cost Per Unit', key: 'cost_per_unit', example: '40' },
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
      const result = await apiFetch('/items/bulk-import', { method: 'POST', body: JSON.stringify({ items: importData }) });
      setToast({ message: `Imported ${result.imported} items${result.skipped ? `, ${result.skipped} skipped` : ''}`, type: result.imported > 0 ? 'success' : 'warning' });
      setShowImportModal(false);
      setImportData(null);
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setImporting(false);
  };

  const loadData = () => {
    Promise.all([apiFetch('/items'), apiFetch('/categories')])
      .then(([i, c]) => { setItems(i); setCategories(c); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, category_id: form.category_id ? parseInt(form.category_id) : null, min_stock_level: parseFloat(form.min_stock_level) || 0, cost_per_unit: parseFloat(form.cost_per_unit) || 0 };
      if (editItem) {
        await apiFetch(`/items/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setToast({ message: 'Item updated!', type: 'success' });
      } else {
        await apiFetch('/items', { method: 'POST', body: JSON.stringify(payload) });
        setToast({ message: 'Item added!', type: 'success' });
      }
      closeForm();
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/categories', { method: 'POST', body: JSON.stringify(catForm) });
      setToast({ message: 'Category added!', type: 'success' });
      setShowCatForm(false);
      setCatForm({ name: '', description: '' });
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const startEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, category_id: item.category_id || '', unit: item.unit, min_stock_level: item.min_stock_level, cost_per_unit: item.cost_per_unit });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditItem(null); setForm({ name: '', category_id: '', unit: 'kg', min_stock_level: '', cost_per_unit: '' }); };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.category_name || '').toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Raw Materials</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your inventory items and categories</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => downloadTemplate(importColumns, 'items')} className="btn btn-secondary text-xs" title="Download Template"><FileSpreadsheet size={16} /> Template</button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary text-xs" title="Import from Excel"><Upload size={16} /> Import</button>
          <button onClick={() => exportToExcel(filtered, exportColumns, 'items', 'Items')} className="btn btn-secondary text-xs" title="Export to Excel"><Download size={16} /> Export</button>
          <button onClick={() => setShowCatForm(true)} className="btn btn-secondary"><Plus size={18} /> Category</button>
          <button onClick={() => { closeForm(); setShowForm(true); }} className="btn btn-primary"><Plus size={18} /> Add Item</button>
        </div>
      </div>

      {/* Categories quick view */}
      <div className="flex gap-2 flex-wrap mb-4">
        {categories.map(c => (
          <span key={c.id} className="badge badge-purple cursor-default">{c.name}</span>
        ))}
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="form-input max-w-sm" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Unit</th><th>Stock</th><th>Min Level</th><th>Cost/Unit</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-slate-400">No items found</td></tr>}
            {filtered.map(item => (
              <tr key={item.id} className={item.status === 'inactive' ? 'opacity-50' : ''}>
                <td className="font-medium">{item.name}</td>
                <td>{item.category_name || '—'}</td>
                <td>{item.unit}</td>
                <td>
                  <span className={`font-semibold ${item.current_stock <= item.min_stock_level ? 'text-rose-600' : 'text-slate-700'}`}>
                    {item.current_stock}
                  </span>
                </td>
                <td>{item.min_stock_level}</td>
                <td>{formatCurrency(item.cost_per_unit)}</td>
                <td>
                  <span className={`badge ${item.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{item.status}</span>
                </td>
                <td>
                  <button onClick={() => startEdit(item)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Edit2 size={15} className="text-slate-500" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Item Form */}
      <Modal isOpen={showForm} onClose={closeForm} title={editItem ? 'Edit Item' : 'Add Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="form-label">Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Category</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="form-select">
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Unit</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="form-select">
                {['kg', 'g', 'ltr', 'ml', 'pcs', 'dozen', 'packet', 'bundle', 'box'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Min Stock Level</label><input type="number" step="0.01" value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Cost per Unit (₹)</label><input type="number" step="0.01" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} className="form-input" /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={closeForm} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add Item'}</button>
          </div>
        </form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportData(null); }} title={`Import Items (${importData?.length || 0} rows)`} size="lg">
        <div className="max-h-64 overflow-auto mb-4">
          <table className="w-full data-table">
            <thead><tr><th>Name</th><th>Category</th><th>Unit</th><th>Min Stock</th><th>Cost/Unit</th></tr></thead>
            <tbody>
              {importData?.map((r, i) => (
                <tr key={i}><td>{r.name}</td><td>{r.category || '—'}</td><td>{r.unit || 'kg'}</td><td>{r.min_stock_level || 0}</td><td>{r.cost_per_unit || 0}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setShowImportModal(false); setImportData(null); }} className="btn btn-secondary">Cancel</button>
          <button onClick={handleBulkImport} disabled={importing} className="btn btn-primary">{importing ? 'Importing...' : 'Confirm Import'}</button>
        </div>
      </Modal>

      {/* Category Form */}
      <Modal isOpen={showCatForm} onClose={() => setShowCatForm(false)} title="Add Category" size="sm">
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <div><label className="form-label">Name *</label><input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="form-input" required /></div>
          <div><label className="form-label">Description</label><textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} className="form-input" rows="2" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowCatForm(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Add Category</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
