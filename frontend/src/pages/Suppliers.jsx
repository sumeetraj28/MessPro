import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Plus, Edit2, Truck, Phone, Mail, MapPin, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, importFromExcel, downloadTemplate } from '../utils/exportImport';

export default function Suppliers() {
  const { apiFetch } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', gst_number: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const exportColumns = [
    { header: 'Name', key: 'name' },
    { header: 'Contact Person', key: 'contact_person' },
    { header: 'Phone', key: 'phone' },
    { header: 'Email', key: 'email' },
    { header: 'Address', key: 'address' },
    { header: 'GST Number', key: 'gst_number' },
    { header: 'Status', key: 'status' },
  ];

  const importColumns = [
    { header: 'Name', key: 'name', example: 'Fresh Farms Pvt Ltd' },
    { header: 'Contact Person', key: 'contact_person', example: 'Ramesh Kumar' },
    { header: 'Phone', key: 'phone', example: '9876543210' },
    { header: 'Email', key: 'email', example: 'ramesh@freshfarms.com' },
    { header: 'Address', key: 'address', example: '123 Market Road, Delhi' },
    { header: 'GST Number', key: 'gst_number', example: '07AABCU9603R1ZM' },
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
      const result = await apiFetch('/suppliers/bulk-import', { method: 'POST', body: JSON.stringify({ items: importData }) });
      setToast({ message: `Imported ${result.imported} suppliers${result.skipped ? `, ${result.skipped} skipped` : ''}`, type: result.imported > 0 ? 'success' : 'warning' });
      setShowImportModal(false);
      setImportData(null);
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
    setImporting(false);
  };

  const loadData = () => {
    apiFetch('/suppliers').then(setSuppliers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await apiFetch(`/suppliers/${editItem.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setToast({ message: 'Supplier updated!', type: 'success' });
      } else {
        await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(form) });
        setToast({ message: 'Supplier added!', type: 'success' });
      }
      closeForm();
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const startEdit = (s) => {
    setEditItem(s);
    setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', gst_number: s.gst_number || '' });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditItem(null); setForm({ name: '', contact_person: '', phone: '', email: '', address: '', gst_number: '' }); };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your vendor relationships</p>
        </div>
        <button onClick={() => { closeForm(); setShowForm(true); }} className="btn btn-primary"><Plus size={18} /> Add Supplier</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => downloadTemplate(importColumns, 'suppliers')} className="btn btn-secondary text-xs"><FileSpreadsheet size={16} /> Template</button>
        <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary text-xs"><Upload size={16} /> Import</button>
        <button onClick={() => exportToExcel(suppliers, exportColumns, 'suppliers', 'Suppliers')} className="btn btn-secondary text-xs"><Download size={16} /> Export</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className={`bg-white rounded-xl p-5 shadow-sm border border-slate-200/60 card-hover ${s.status === 'inactive' ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Truck size={20} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{s.name}</h3>
                  {s.contact_person && <p className="text-xs text-slate-400">{s.contact_person}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span>
                <button onClick={() => startEdit(s)} className="p-1 hover:bg-slate-100 rounded"><Edit2 size={14} className="text-slate-400" /></button>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {s.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={12} />{s.phone}</div>}
              {s.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={12} />{s.email}</div>}
              {s.address && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={12} />{s.address}</div>}
              {s.gst_number && <div className="text-xs text-slate-400 mt-1">GST: {s.gst_number}</div>}
            </div>
          </div>
        ))}
        {suppliers.length === 0 && <div className="col-span-3 text-center text-slate-400 py-12">No suppliers added yet</div>}
      </div>

      <Modal isOpen={showForm} onClose={closeForm} title={editItem ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="form-label">Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" required /></div>
          <div><label className="form-label">Contact Person</label><input type="text" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="form-input" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Phone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="form-input" /></div>
          </div>
          <div><label className="form-label">Address</label><textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="form-input" rows="2" /></div>
          <div><label className="form-label">GST Number</label><input type="text" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} className="form-input" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={closeForm} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add Supplier'}</button>
          </div>
        </form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportData(null); }} title={`Import Suppliers (${importData?.length || 0} rows)`} size="lg">
        <div className="max-h-64 overflow-auto mb-4">
          <table className="w-full data-table">
            <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>GST</th></tr></thead>
            <tbody>
              {importData?.map((r, i) => (
                <tr key={i}><td>{r.name}</td><td>{r.contact_person || '—'}</td><td>{r.phone || '—'}</td><td>{r.email || '—'}</td><td>{r.gst_number || '—'}</td></tr>
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
