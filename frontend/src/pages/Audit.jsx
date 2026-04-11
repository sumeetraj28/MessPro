import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, History, Trash2, Users, Clock } from 'lucide-react';

export default function Audit() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('changes');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ table_name: '', from: '', to: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.table_name) params.set('table_name', filters.table_name);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const endpoint = activeTab === 'changes' ? '/audit/changes'
        : activeTab === 'erasures' ? '/audit/erasures'
        : '/audit/sessions';
      setData(await apiFetch(`${endpoint}?${params}`));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [activeTab, filters]);

  const tabs = [
    { key: 'changes', label: 'Change Log', icon: History },
    { key: 'erasures', label: 'Erasure Log', icon: Trash2 },
    { key: 'sessions', label: 'Login History', icon: Users },
  ];

  const tables = ['users', 'categories', 'suppliers', 'items', 'purchases', 'menu_items', 'daily_menu', 'meal_collections', 'expenses'];

  const formatJson = (jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ');
    } catch { return jsonStr || '—'; }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Audit Trail</h1>
        <p className="text-slate-500 text-sm mt-1">Track all changes, deletions, and user activity</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setData([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab !== 'sessions' && (
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-slate-200/60 flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Table</label>
            <select value={filters.table_name} onChange={e => setFilters({ ...filters, table_name: e.target.value })} className="form-select">
              <option value="">All Tables</option>
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="form-label">From</label><input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="form-input" /></div>
          <div><label className="form-label">To</label><input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="form-input" /></div>
          <button onClick={() => setFilters({ table_name: '', from: '', to: '' })} className="btn btn-secondary text-xs">Clear</button>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}

      {/* Change Log */}
      {activeTab === 'changes' && !loading && (
        <div className="space-y-3">
          {data.length === 0 && <div className="text-center text-slate-400 py-12 bg-white rounded-2xl">No changes recorded</div>}
          {data.map(log => (
            <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <span className={`badge ${log.action === 'create' ? 'badge-green' : log.action === 'update' ? 'badge-blue' : 'badge-red'}`}>
                  {log.action}
                </span>
                <span className="badge badge-purple">{log.table_name}</span>
                <span className="text-xs text-slate-400">#{log.record_id}</span>
                <span className="text-xs text-slate-400 ml-auto">{new Date(log.changed_at).toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-500 font-medium">{log.changed_by_name || 'System'}</span>
              </div>
              {log.action === 'update' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
                  <div className="bg-rose-50 rounded-lg p-2"><span className="font-medium text-rose-700">Before:</span> <span className="text-rose-600">{formatJson(log.old_values)}</span></div>
                  <div className="bg-emerald-50 rounded-lg p-2"><span className="font-medium text-emerald-700">After:</span> <span className="text-emerald-600">{formatJson(log.new_values)}</span></div>
                </div>
              )}
              {log.action === 'create' && log.new_values && (
                <div className="text-xs bg-emerald-50 rounded-lg p-2 mt-2"><span className="font-medium text-emerald-700">Created:</span> <span className="text-emerald-600">{formatJson(log.new_values)}</span></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Erasure Log */}
      {activeTab === 'erasures' && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr><th>Date</th><th>Table</th><th>Record</th><th>Erased Data</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">No erasures recorded</td></tr>}
              {data.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.erased_at).toLocaleString('en-IN')}</td>
                  <td><span className="badge badge-purple">{e.table_name}</span></td>
                  <td>#{e.record_id}</td>
                  <td className="max-w-xs truncate text-xs text-slate-500">{formatJson(e.erased_data)}</td>
                  <td>{e.reason || '—'}</td>
                  <td className="font-medium">{e.erased_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Login History */}
      {activeTab === 'sessions' && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr><th>User</th><th>Login Time</th><th>Logout Time</th><th>Duration</th><th>IP Address</th></tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">No sessions recorded</td></tr>}
              {data.map(s => {
                const loginTime = new Date(s.login_at);
                const logoutTime = s.logout_at ? new Date(s.logout_at) : null;
                const duration = logoutTime ? Math.round((logoutTime - loginTime) / 60000) : null;
                return (
                  <tr key={s.id}>
                    <td>
                      <span className="font-medium">{s.full_name}</span>
                      <span className="text-xs text-slate-400 ml-1">@{s.username}</span>
                    </td>
                    <td>{loginTime.toLocaleString('en-IN')}</td>
                    <td>{logoutTime ? logoutTime.toLocaleString('en-IN') : <span className="badge badge-green">Active</span>}</td>
                    <td>{duration !== null ? `${duration} min` : '—'}</td>
                    <td className="text-slate-400 text-xs">{s.ip_address || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
