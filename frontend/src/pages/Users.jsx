import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { UserPlus, Edit2, Shield, ShieldOff, Eye, EyeOff, Search } from 'lucide-react';

export default function UsersPage() {
  const { apiFetch, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'staff' });

  const loadUsers = async () => {
    setLoading(true);
    try { setUsers(await apiFetch('/users')); } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', password: '', full_name: '', role: 'staff' });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, password: '', full_name: u.full_name, role: u.role });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const body = { full_name: form.full_name, role: form.role };
        if (form.password) body.password = form.password;
        await apiFetch(`/users/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setToast({ type: 'success', message: 'User updated' });
      } else {
        await apiFetch('/users', { method: 'POST', body: JSON.stringify(form) });
        setToast({ type: 'success', message: 'User created' });
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save user' });
    }
  };

  const toggleStatus = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      await apiFetch(`/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      setToast({ type: 'success', message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
      loadUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update status' });
    }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = (role) => role === 'admin' ? 'badge-red' : role === 'manager' ? 'badge-blue' : 'badge-gray';

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system users and their access roles</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2"><UserPlus size={18} /> Add User</button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
          className="form-input pl-10" />
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(u => (
            <div key={u.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 card-hover animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">
                  {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <span className={`badge ${roleColor(u.role)}`}>{u.role}</span>
                  <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800">{u.full_name}</h3>
              <p className="text-sm text-slate-400">@{u.username}</p>
              <p className="text-xs text-slate-400 mt-1">Joined {new Date(u.created_at).toLocaleDateString('en-IN')}</p>

              {u.id !== currentUser?.id && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button onClick={() => openEdit(u)} className="btn btn-secondary text-xs flex items-center gap-1 flex-1">
                    <Edit2 size={14} /> Edit
                  </button>
                  <button onClick={() => toggleStatus(u)}
                    className={`text-xs flex items-center gap-1 flex-1 ${u.status === 'active' ? 'btn btn-danger' : 'btn btn-success'}`}>
                    {u.status === 'active' ? <><ShieldOff size={14} /> Deactivate</> : <><Shield size={14} /> Activate</>}
                  </button>
                </div>
              )}
              {u.id === currentUser?.id && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 text-center">This is your account</div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-2xl">No users found</div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Create User'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Full Name *</label>
            <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="form-input" required />
          </div>
          {!editing && (
            <div>
              <label className="form-label">Username *</label>
              <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                className="form-input" required />
            </div>
          )}
          <div>
            <label className="form-label">{editing ? 'New Password (leave empty to keep)' : 'Password *'}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="form-input pr-10" {...(!editing && { required: true })} minLength={4} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="form-label">Role *</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="form-select">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
