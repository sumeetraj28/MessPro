import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { ArrowDownToLine, ArrowUpFromLine, BookOpen, Plus, Trash2, Download, Upload, FileSpreadsheet, Search } from 'lucide-react';
import { exportToExcel, importFromExcel, downloadTemplate } from '../utils/exportImport';

function formatCurrency(amt) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amt);
}

const purposeIn = ['purchase', 'return', 'donation', 'opening_stock', 'transfer_in', 'other'];
const purposeOut = ['kitchen', 'wastage', 'spoilage', 'transfer_out', 'sample', 'other'];

const purposeColors = {
  purchase: 'badge-green', return: 'badge-blue', donation: 'badge-purple',
  opening_stock: 'badge-yellow', transfer_in: 'badge-blue',
  kitchen: 'badge-blue', wastage: 'badge-red', spoilage: 'badge-red',
  transfer_out: 'badge-yellow', sample: 'badge-purple', other: 'badge-gray'
};

export default function Store() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('in');
  const [entries, setEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', item_id: '', purpose: '' });
  const [search, setSearch] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today, item_id: '', quantity: '', rate: '', supplier_id: '', purpose: 'purchase', issued_to: '', bill_number: '', notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, suppliersRes] = await Promise.all([
        apiFetch('/items?status=active'),
        apiFetch('/suppliers?status=active')
      ]);
      setItems(itemsRes);
      setSuppliers(suppliersRes);

      if (activeTab === 'ledger') {
        await loadLedger();
      } else {
        await loadEntries();
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadEntries = async () => {
    const params = new URLSearchParams();
    if (activeTab !== 'ledger') params.set('type', activeTab);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.item_id) params.set('item_id', filters.item_id);
    if (filters.purpose) params.set('purpose', filters.purpose);
    try {
      const data = await apiFetch(`/store?${params}`);
      setEntries(data);
    } catch (err) { console.error(err); }
  };

  const loadLedger = async () => {
    const params = new URLSearchParams();
    if (filters.item_id) params.set('item_id', filters.item_id);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    try {
      if (filters.item_id) {
        const data = await apiFetch(`/store/ledger?${params}`);
        setLedgerData(data);
      } else {
        const data = await apiFetch(`/store/summary?${params}`);
        setLedgerData({ summary: data });
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, [activeTab]);
  useEffect(() => {
    if (!loading) {
      if (activeTab === 'ledger') loadLedger();
      else loadEntries();
    }
  }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'in' ? '/store/in' : '/store/out';
      const payload = {
        date: form.date,
        item_id: parseInt(form.item_id),
        quantity: parseFloat(form.quantity),
        rate: parseFloat(form.rate) || 0,
        ...(activeTab === 'in' && { supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null, bill_number: form.bill_number }),
        purpose: form.purpose,
        ...(activeTab === 'out' && { issued_to: form.issued_to }),
        notes: form.notes
      };
      await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setToast({ type: 'success', message: activeTab === 'in' ? 'Items received into store' : 'Items issued from store' });
      setShowForm(false);
      resetForm();
      loadEntries();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry? Stock will be reversed.')) return;
    try {
      await apiFetch(`/store/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
      setToast({ type: 'success', message: 'Entry deleted' });
      loadEntries();
    } catch (err) { setToast({ type: 'error', message: err.message }); }
  };

  const resetForm = () => {
    setForm({
      date: today, item_id: '', quantity: '', rate: '', supplier_id: '',
      purpose: activeTab === 'in' ? 'purchase' : 'kitchen',
      issued_to: '', bill_number: '', notes: ''
    });
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  // Auto-fill rate when item changes
  const handleItemChange = (val) => {
    setForm(prev => {
      const item = items.find(i => i.id === parseInt(val));
      return { ...prev, item_id: val, rate: item ? item.cost_per_unit : '' };
    });
  };

  const totalValue = (parseFloat(form.quantity) || 0) * (parseFloat(form.rate) || 0);

  // Export
  const exportColumns = [
    { header: 'Date', key: 'date' },
    { header: 'Type', key: 'type' },
    { header: 'Item', key: 'item_name' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Unit', key: 'unit' },
    { header: 'Rate', key: 'rate' },
    { header: 'Total Value', key: 'total_value' },
    { header: 'Purpose', key: 'purpose' },
    { header: 'Supplier', key: 'supplier_name' },
    { header: 'Issued To', key: 'issued_to' },
    { header: 'Bill Number', key: 'bill_number' },
    { header: 'Notes', key: 'notes' },
    { header: 'By', key: 'created_by_name' },
  ];

  const importColumnsIn = [
    { header: 'Date', key: 'date', example: '2026-04-01' },
    { header: 'Item', key: 'item_name', example: 'Rice' },
    { header: 'Quantity', key: 'quantity', example: '50' },
    { header: 'Rate', key: 'rate', example: '55' },
    { header: 'Supplier', key: 'supplier_name', example: 'Fresh Farms' },
    { header: 'Purpose', key: 'purpose', example: 'purchase' },
    { header: 'Bill Number', key: 'bill_number', example: 'INV-001' },
    { header: 'Notes', key: 'notes', example: '' },
  ];

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = await importFromExcel(file, importColumnsIn);
      setImportData(parsed);
      setShowImportModal(true);
    } catch (err) { setToast({ type: 'error', message: err.message }); }
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    setImporting(true);
    let imported = 0, errors = [];
    for (const row of importData) {
      try {
        const item = items.find(i => i.name.toLowerCase() === (row.item_name || '').toLowerCase());
        if (!item) { errors.push(`Item not found: ${row.item_name}`); continue; }
        const supplier = row.supplier_name ? suppliers.find(s => s.name.toLowerCase() === row.supplier_name.toLowerCase()) : null;
        await apiFetch('/store/in', {
          method: 'POST',
          body: JSON.stringify({
            date: row.date || today,
            item_id: item.id,
            quantity: parseFloat(row.quantity) || 0,
            rate: parseFloat(row.rate) || 0,
            supplier_id: supplier?.id || null,
            purpose: row.purpose || 'purchase',
            bill_number: row.bill_number || null,
            notes: row.notes || null
          })
        });
        imported++;
      } catch (err) { errors.push(`${row.item_name}: ${err.message}`); }
    }
    setToast({ type: imported > 0 ? 'success' : 'error', message: `Imported ${imported} entries${errors.length ? `, ${errors.length} failed` : ''}` });
    setShowImportModal(false);
    setImportData(null);
    loadEntries();
    setImporting(false);
  };

  const filteredEntries = entries.filter(e =>
    !search || e.item_name?.toLowerCase().includes(search.toLowerCase()) || e.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: 'in', label: 'Items In', icon: ArrowDownToLine, color: 'text-emerald-600' },
    { key: 'out', label: 'Items Out', icon: ArrowUpFromLine, color: 'text-rose-600' },
    { key: 'ledger', label: 'Ledger', icon: BookOpen, color: 'text-brand-600' },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Store Register</h1>
          <p className="text-slate-500 text-sm mt-1">Track items coming in and going out of the store</p>
        </div>
        {activeTab !== 'ledger' && (
          <button onClick={openForm} className="btn btn-primary">
            <Plus size={18} /> {activeTab === 'in' ? 'Receive Items' : 'Issue Items'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setEntries([]); setLedgerData(null); }}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={16} className={activeTab === t.key ? t.color : ''} /> {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 shadow-sm border border-slate-200/60">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-full sm:w-auto">
            <label className="form-label">Item</label>
            <select value={filters.item_id} onChange={e => setFilters({ ...filters, item_id: e.target.value })} className="form-select">
              <option value="">All Items</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]"><label className="form-label">From</label><input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="form-input" /></div>
          <div className="flex-1 min-w-[120px]"><label className="form-label">To</label><input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="form-input" /></div>
          {activeTab !== 'ledger' && (
            <div className="w-full sm:w-auto">
              <label className="form-label">Purpose</label>
              <select value={filters.purpose} onChange={e => setFilters({ ...filters, purpose: e.target.value })} className="form-select">
                <option value="">All</option>
                {(activeTab === 'in' ? purposeIn : purposeOut).map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
          )}
          <button onClick={() => setFilters({ from: '', to: '', item_id: '', purpose: '' })} className="btn btn-secondary text-xs">Clear</button>
        </div>
      </div>

      {/* Action Bar */}
      {activeTab !== 'ledger' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="form-input pl-9 text-sm" />
          </div>
          <div className="flex gap-2 ml-auto">
            {activeTab === 'in' && <>
              <button onClick={() => downloadTemplate(importColumnsIn, 'store_items_in')} className="btn btn-secondary text-xs"><FileSpreadsheet size={16} /> Template</button>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary text-xs"><Upload size={16} /> Import</button>
            </>}
            <button onClick={() => exportToExcel(filteredEntries, exportColumns, `store_${activeTab}`, `Store ${activeTab === 'in' ? 'In' : 'Out'}`)} className="btn btn-secondary text-xs"><Download size={16} /> Export</button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}

      {/* Items In / Items Out Table */}
      {activeTab !== 'ledger' && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Value</th>
                  <th>{activeTab === 'in' ? 'Supplier' : 'Issued To'}</th>
                  <th>Purpose</th>
                  <th className="hidden sm:table-cell">Bill #</th>
                  <th className="hidden md:table-cell">By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 && (
                  <tr><td colSpan="10" className="text-center py-8 text-slate-400">No entries found</td></tr>
                )}
                {filteredEntries.map(e => (
                  <tr key={e.id}>
                    <td className="font-medium whitespace-nowrap">{e.date}</td>
                    <td>
                      <span className="font-medium">{e.item_name}</span>
                      <span className="text-slate-400 text-xs ml-1">({e.unit})</span>
                    </td>
                    <td className={`font-semibold ${e.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {e.type === 'in' ? '+' : '-'}{e.quantity}
                    </td>
                    <td>{formatCurrency(e.rate)}</td>
                    <td className="font-semibold">{formatCurrency(e.total_value)}</td>
                    <td>{activeTab === 'in' ? (e.supplier_name || '—') : (e.issued_to || '—')}</td>
                    <td><span className={`badge ${purposeColors[e.purpose] || 'badge-gray'}`}>{(e.purpose || '').replace('_', ' ')}</span></td>
                    <td className="hidden sm:table-cell text-slate-400">{e.bill_number || '—'}</td>
                    <td className="hidden md:table-cell text-slate-500">{e.created_by_name}</td>
                    <td>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 size={15} className="text-rose-500" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger View */}
      {activeTab === 'ledger' && !loading && ledgerData && (
        <div className="space-y-6 animate-fade-in">
          {/* If specific item selected - show detailed ledger */}
          {filters.item_id && ledgerData.entries ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200/60">
                  <p className="text-xs text-slate-500">Opening Balance</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-700 mt-1">{ledgerData.openingBalance.toFixed(2)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 sm:p-4 border border-emerald-100">
                  <p className="text-xs text-emerald-600">Total In</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">{ledgerData.summary.totalIn.toFixed(2)}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">{formatCurrency(ledgerData.summary.totalInValue)}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 sm:p-4 border border-rose-100">
                  <p className="text-xs text-rose-600">Total Out</p>
                  <p className="text-lg sm:text-xl font-bold text-rose-700 mt-1">{ledgerData.summary.totalOut.toFixed(2)}</p>
                  <p className="text-xs text-rose-500 mt-0.5">{formatCurrency(ledgerData.summary.totalOutValue)}</p>
                </div>
                <div className="bg-brand-50 rounded-xl p-3 sm:p-4 border border-brand-100">
                  <p className="text-xs text-brand-600">Closing Balance</p>
                  <p className="text-lg sm:text-xl font-bold text-brand-700 mt-1">{ledgerData.summary.closingBalance.toFixed(2)}</p>
                </div>
              </div>

              {/* Detailed Ledger Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Particulars</th>
                        <th className="text-right text-emerald-700">In</th>
                        <th className="text-right text-rose-700">Out</th>
                        <th className="text-right">Balance</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-slate-50">
                        <td colSpan="4" className="font-semibold text-slate-600">Opening Balance</td>
                        <td className="text-right font-bold">{ledgerData.openingBalance.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      {(() => {
                        let running = ledgerData.openingBalance;
                        return ledgerData.entries.map(e => {
                          running = e.type === 'in' ? running + e.quantity : running - e.quantity;
                          return (
                            <tr key={e.id}>
                              <td className="whitespace-nowrap">{e.date}</td>
                              <td>
                                <span className={`badge ${purposeColors[e.purpose] || 'badge-gray'} mr-1`}>{(e.purpose || '').replace('_', ' ')}</span>
                                <span className="text-xs text-slate-500">{e.supplier_name || e.issued_to || ''}</span>
                                {e.bill_number && <span className="text-xs text-slate-400 ml-1">#{e.bill_number}</span>}
                              </td>
                              <td className="text-right text-emerald-600 font-medium">{e.type === 'in' ? e.quantity.toFixed(2) : ''}</td>
                              <td className="text-right text-rose-600 font-medium">{e.type === 'out' ? e.quantity.toFixed(2) : ''}</td>
                              <td className="text-right font-semibold">{running.toFixed(2)}</td>
                              <td className="text-slate-500">{formatCurrency(e.total_value)}</td>
                            </tr>
                          );
                        });
                      })()}
                      <tr className="bg-brand-50">
                        <td colSpan="4" className="font-bold text-brand-700">Closing Balance</td>
                        <td className="text-right font-bold text-brand-700">{ledgerData.summary.closingBalance.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* Item-wise Summary */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Item-wise Summary</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select an item from filter above to view detailed ledger</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Unit</th>
                      <th className="text-right text-emerald-700">Total In</th>
                      <th className="text-right text-rose-700">Total Out</th>
                      <th className="text-right">Current Stock</th>
                      <th className="text-right text-emerald-700">Value In</th>
                      <th className="text-right text-rose-700">Value Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!ledgerData.summary || ledgerData.summary.length === 0) && (
                      <tr><td colSpan="7" className="text-center py-8 text-slate-400">No store transactions yet</td></tr>
                    )}
                    {ledgerData.summary?.map(s => (
                      <tr key={s.id} className="cursor-pointer hover:bg-brand-50/50" onClick={() => setFilters({ ...filters, item_id: String(s.id) })}>
                        <td className="font-medium">{s.name}</td>
                        <td>{s.unit}</td>
                        <td className="text-right text-emerald-600 font-medium">{s.total_in.toFixed(2)}</td>
                        <td className="text-right text-rose-600 font-medium">{s.total_out.toFixed(2)}</td>
                        <td className="text-right font-bold">{s.current_stock.toFixed(2)}</td>
                        <td className="text-right text-emerald-600">{formatCurrency(s.value_in)}</td>
                        <td className="text-right text-rose-600">{formatCurrency(s.value_out)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ledger' && !loading && !ledgerData && (
        <div className="text-center text-slate-400 py-16 bg-white rounded-2xl">Select a date range or item to view ledger</div>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={activeTab === 'in' ? 'Receive Items (Store In)' : 'Issue Items (Store Out)'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Item *</label>
              <select value={form.item_id} onChange={e => handleItemChange(e.target.value)} className="form-select" required>
                <option value="">Select Item</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit}) — Stock: {i.current_stock}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Quantity *</label>
              <input type="number" step="0.01" min="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Rate per Unit (₹)</label>
              <input type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Total Value</label>
              <div className="form-input bg-slate-50 font-semibold text-brand-600">{formatCurrency(totalValue)}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Purpose *</label>
              <select value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="form-select" required>
                {(activeTab === 'in' ? purposeIn : purposeOut).map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
            {activeTab === 'in' ? (
              <div>
                <label className="form-label">Supplier</label>
                <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="form-select">
                  <option value="">None</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="form-label">Issued To</label>
                <input type="text" value={form.issued_to} onChange={e => setForm({ ...form, issued_to: e.target.value })} className="form-input" placeholder="Kitchen, Staff, etc." />
              </div>
            )}
          </div>
          {activeTab === 'in' && (
            <div>
              <label className="form-label">Bill / Invoice Number</label>
              <input type="text" value={form.bill_number} onChange={e => setForm({ ...form, bill_number: e.target.value })} className="form-input" placeholder="INV-001" />
            </div>
          )}
          <div>
            <label className="form-label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-input" rows="2" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className={`btn ${activeTab === 'in' ? 'btn-success' : 'btn-primary'}`}>
              {activeTab === 'in' ? 'Receive Items' : 'Issue Items'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportData(null); }} title={`Import Store In (${importData?.length || 0} rows)`} size="lg">
        <div className="max-h-64 overflow-auto mb-4">
          <table className="w-full data-table">
            <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Rate</th><th>Supplier</th><th>Purpose</th></tr></thead>
            <tbody>
              {importData?.map((r, i) => (
                <tr key={i}><td>{r.date}</td><td>{r.item_name}</td><td>{r.quantity}</td><td>₹{r.rate}</td><td>{r.supplier_name || '—'}</td><td>{r.purpose || 'purchase'}</td></tr>
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
