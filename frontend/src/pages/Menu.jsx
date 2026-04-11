import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Plus, Edit2, Trash2, UtensilsCrossed, Calendar, IndianRupee, Download } from 'lucide-react';
import { exportToExcel } from '../utils/exportImport';

function formatCurrency(amt) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
}

const mealColors = {
  breakfast: 'bg-amber-100 text-amber-700 border-amber-200',
  lunch: 'bg-sky-100 text-sky-700 border-sky-200',
  dinner: 'bg-violet-100 text-violet-700 border-violet-200',
  snacks: 'bg-emerald-100 text-emerald-700 border-emerald-200'
};

export default function Menu() {
  const { apiFetch } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [dailyMenus, setDailyMenus] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [showForm, setShowForm] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({ name: '', meal_type: 'lunch', description: '', cost_per_plate: '', selling_price: '' });
  const [dailyForm, setDailyForm] = useState({ date: new Date().toISOString().split('T')[0], meal_type: 'lunch', menu_item_id: '', planned_quantity: '' });
  const [collForm, setCollForm] = useState({ date: new Date().toISOString().split('T')[0], meal_type: 'lunch', total_members: '', rate_per_head: '', payment_method: 'cash', notes: '' });

  const loadData = () => {
    Promise.all([
      apiFetch('/menu/items'),
      apiFetch('/menu/daily?from=' + new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
      apiFetch('/menu/collections?from=' + new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
    ]).then(([items, daily, colls]) => {
      setMenuItems(items);
      setDailyMenus(daily);
      setCollections(colls);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, cost_per_plate: parseFloat(form.cost_per_plate) || 0, selling_price: parseFloat(form.selling_price) || 0 };
      if (editItem) {
        await apiFetch(`/menu/items/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setToast({ message: 'Menu item updated!', type: 'success' });
      } else {
        await apiFetch('/menu/items', { method: 'POST', body: JSON.stringify(payload) });
        setToast({ message: 'Menu item added!', type: 'success' });
      }
      setShowForm(false);
      setEditItem(null);
      setForm({ name: '', meal_type: 'lunch', description: '', cost_per_plate: '', selling_price: '' });
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleSubmitDaily = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/menu/daily', { method: 'POST', body: JSON.stringify({ ...dailyForm, menu_item_id: parseInt(dailyForm.menu_item_id), planned_quantity: parseInt(dailyForm.planned_quantity) || 0 }) });
      setToast({ message: 'Daily menu planned!', type: 'success' });
      setShowDailyForm(false);
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleSubmitCollection = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/menu/collections', { method: 'POST', body: JSON.stringify({ ...collForm, total_members: parseInt(collForm.total_members), rate_per_head: parseFloat(collForm.rate_per_head) }) });
      setToast({ message: 'Collection recorded!', type: 'success' });
      setShowCollectionForm(false);
      setCollForm({ date: new Date().toISOString().split('T')[0], meal_type: 'lunch', total_members: '', rate_per_head: '', payment_method: 'cash', notes: '' });
      loadData();
    } catch (err) { setToast({ message: err.message, type: 'error' }); }
  };

  const startEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, meal_type: item.meal_type, description: item.description || '', cost_per_plate: item.cost_per_plate, selling_price: item.selling_price });
    setShowForm(true);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  const tabs = [
    { key: 'items', label: 'Menu Items' },
    { key: 'daily', label: 'Daily Menu' },
    { key: 'collections', label: 'Meal Collections' }
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Menu Management</h1>
          <p className="text-slate-500 text-sm mt-1">Plan menus, track meals and collections</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'items' && <>
            <button onClick={() => exportToExcel(menuItems, [
              { header: 'Name', key: 'name' },
              { header: 'Meal Type', key: 'meal_type' },
              { header: 'Description', key: 'description' },
              { header: 'Cost Per Plate', key: 'cost_per_plate' },
              { header: 'Selling Price', key: 'selling_price' },
              { header: 'Active', key: 'is_active', format: (v) => v ? 'Yes' : 'No' },
            ], 'menu_items', 'Menu Items')} className="btn btn-secondary text-xs"><Download size={16} /> Export</button>
            <button onClick={() => { setEditItem(null); setForm({ name: '', meal_type: 'lunch', description: '', cost_per_plate: '', selling_price: '' }); setShowForm(true); }} className="btn btn-primary"><Plus size={18} /> Add Item</button>
          </>}
          {activeTab === 'daily' && <>
            <button onClick={() => exportToExcel(dailyMenus, [
              { header: 'Date', key: 'date' },
              { header: 'Meal Type', key: 'meal_type' },
              { header: 'Item', key: 'item_name' },
              { header: 'Planned', key: 'planned_quantity' },
              { header: 'Served', key: 'actual_served' },
            ], 'daily_menu', 'Daily Menu')} className="btn btn-secondary text-xs"><Download size={16} /> Export</button>
            <button onClick={() => setShowDailyForm(true)} className="btn btn-primary"><Calendar size={18} /> Plan Menu</button>
          </>}
          {activeTab === 'collections' && <>
            <button onClick={() => exportToExcel(collections, [
              { header: 'Date', key: 'date' },
              { header: 'Meal Type', key: 'meal_type' },
              { header: 'Members', key: 'total_members' },
              { header: 'Rate/Head', key: 'rate_per_head' },
              { header: 'Total Collected', key: 'total_collected' },
              { header: 'Payment Method', key: 'payment_method' },
            ], 'meal_collections', 'Collections')} className="btn btn-secondary text-xs"><Download size={16} /> Export</button>
            <button onClick={() => setShowCollectionForm(true)} className="btn btn-success"><IndianRupee size={18} /> Record Collection</button>
          </>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      {activeTab === 'items' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map(item => (
            <div key={item.id} className={`bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 card-hover ${!item.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${mealColors[item.meal_type]}`}>
                    {item.meal_type}
                  </div>
                  {!item.is_active && <span className="badge badge-gray">Inactive</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(item)} className="p-1 hover:bg-slate-100 rounded"><Edit2 size={14} className="text-slate-400" /></button>
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-800 mt-2">{item.name}</h3>
              {item.description && <p className="text-xs text-slate-400 mt-1">{item.description}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div><span className="text-xs text-slate-400">Cost</span><p className="text-sm font-semibold text-slate-700">{formatCurrency(item.cost_per_plate)}</p></div>
                <div className="text-right"><span className="text-xs text-slate-400">Price</span><p className="text-sm font-semibold text-emerald-600">{formatCurrency(item.selling_price)}</p></div>
              </div>
            </div>
          ))}
          {menuItems.length === 0 && <div className="col-span-3 text-center text-slate-400 py-12">No menu items. Click "Add Item" to start.</div>}
        </div>
      )}

      {/* Daily Menu */}
      {activeTab === 'daily' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr><th>Date</th><th>Meal</th><th>Item</th><th>Planned</th><th>Served</th></tr></thead>
            <tbody>
              {dailyMenus.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">No daily menus planned</td></tr>}
              {dailyMenus.map(d => (
                <tr key={d.id}>
                  <td className="font-medium">{d.date}</td>
                  <td><span className={`badge border ${mealColors[d.meal_type]}`}>{d.meal_type}</span></td>
                  <td>{d.item_name}</td>
                  <td>{d.planned_quantity}</td>
                  <td>{d.actual_served}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Collections */}
      {activeTab === 'collections' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr><th>Date</th><th>Meal</th><th>Members</th><th>Rate/Head</th><th>Total</th><th>Method</th></tr></thead>
            <tbody>
              {collections.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">No collections recorded</td></tr>}
              {collections.map(c => (
                <tr key={c.id}>
                  <td className="font-medium">{c.date}</td>
                  <td><span className={`badge border ${mealColors[c.meal_type]}`}>{c.meal_type}</span></td>
                  <td>{c.total_members}</td>
                  <td>{formatCurrency(c.rate_per_head)}</td>
                  <td className="font-semibold text-emerald-600">{formatCurrency(c.total_collected)}</td>
                  <td className="capitalize">{c.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Menu Item Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Menu Item' : 'Add Menu Item'}>
        <form onSubmit={handleSubmitItem} className="space-y-4">
          <div><label className="form-label">Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" required /></div>
          <div><label className="form-label">Meal Type *</label>
            <select value={form.meal_type} onChange={e => setForm({ ...form, meal_type: e.target.value })} className="form-select">
              <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snacks">Snacks</option>
            </select>
          </div>
          <div><label className="form-label">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="form-input" rows="2" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Cost per Plate (₹)</label><input type="number" step="0.01" value={form.cost_per_plate} onChange={e => setForm({ ...form, cost_per_plate: e.target.value })} className="form-input" /></div>
            <div><label className="form-label">Selling Price (₹)</label><input type="number" step="0.01" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} className="form-input" /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add Item'}</button>
          </div>
        </form>
      </Modal>

      {/* Daily Menu Form */}
      <Modal isOpen={showDailyForm} onClose={() => setShowDailyForm(false)} title="Plan Daily Menu">
        <form onSubmit={handleSubmitDaily} className="space-y-4">
          <div><label className="form-label">Date *</label><input type="date" value={dailyForm.date} onChange={e => setDailyForm({ ...dailyForm, date: e.target.value })} className="form-input" required /></div>
          <div><label className="form-label">Meal Type *</label>
            <select value={dailyForm.meal_type} onChange={e => setDailyForm({ ...dailyForm, meal_type: e.target.value })} className="form-select">
              <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snacks">Snacks</option>
            </select>
          </div>
          <div><label className="form-label">Menu Item *</label>
            <select value={dailyForm.menu_item_id} onChange={e => setDailyForm({ ...dailyForm, menu_item_id: e.target.value })} className="form-select" required>
              <option value="">Select item</option>
              {menuItems.filter(i => i.is_active && i.meal_type === dailyForm.meal_type).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Planned Quantity</label><input type="number" value={dailyForm.planned_quantity} onChange={e => setDailyForm({ ...dailyForm, planned_quantity: e.target.value })} className="form-input" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowDailyForm(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Plan Menu</button>
          </div>
        </form>
      </Modal>

      {/* Collection Form */}
      <Modal isOpen={showCollectionForm} onClose={() => setShowCollectionForm(false)} title="Record Meal Collection">
        <form onSubmit={handleSubmitCollection} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Date *</label><input type="date" value={collForm.date} onChange={e => setCollForm({ ...collForm, date: e.target.value })} className="form-input" required /></div>
            <div><label className="form-label">Meal Type *</label>
              <select value={collForm.meal_type} onChange={e => setCollForm({ ...collForm, meal_type: e.target.value })} className="form-select">
                <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snacks">Snacks</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Total Members *</label><input type="number" value={collForm.total_members} onChange={e => setCollForm({ ...collForm, total_members: e.target.value })} className="form-input" required /></div>
            <div><label className="form-label">Rate per Head (₹) *</label><input type="number" step="0.01" value={collForm.rate_per_head} onChange={e => setCollForm({ ...collForm, rate_per_head: e.target.value })} className="form-input" required /></div>
          </div>
          <div className="bg-brand-50 rounded-lg p-3 text-center">
            <span className="text-sm text-brand-700">Total Collection: </span>
            <span className="text-lg font-bold text-brand-800">{formatCurrency((parseInt(collForm.total_members) || 0) * (parseFloat(collForm.rate_per_head) || 0))}</span>
          </div>
          <div><label className="form-label">Payment Method</label>
            <select value={collForm.payment_method} onChange={e => setCollForm({ ...collForm, payment_method: e.target.value })} className="form-select">
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div><label className="form-label">Notes</label><textarea value={collForm.notes} onChange={e => setCollForm({ ...collForm, notes: e.target.value })} className="form-input" rows="2" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowCollectionForm(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-success">Record Collection</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
