import { useState, useEffect } from 'react'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatDateTime, timeAgo, ROLES, ROLE_LABELS, ROLE_COLORS } from '../lib/utils'
import PageHeader, { Btn, Select, Input, EmptyState, LoadingScreen } from '../components/ui/PageHeader'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import { UserCog, Users, Edit2, Trash2, Clock } from 'lucide-react'

export default function UsersPage() {
  const { profile } = useAuth()
  const toast = useToast()

  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [editTarget, setEditTarget] = useState(null)
  const [editRole, setEditRole]   = useState('')
  const [saving, setSaving]       = useState(false)

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, last_login, created_at')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveRole() {
    setSaving(true)
    await supabase.from('profiles').update({ role: editRole }).eq('id', editTarget.id)
    await logAudit({
      userId: profile?.id, userName: profile?.full_name,
      action: 'UPDATE_USER_ROLE', tableName: 'profiles', recordId: editTarget.id,
      oldValues: { role: editTarget.role }, newValues: { role: editRole },
      description: `Changed ${editTarget.full_name || editTarget.email}'s role from ${editTarget.role} to ${editRole}`,
    })
    toast.success('Role updated')
    setSaving(false)
    setEditTarget(null)
    load()
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${users.length} team member${users.length !== 1 ? 's' : ''}`}
      />

      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Invite Users:</strong> New users are created in Supabase Dashboard → Authentication → Users.
        Once they sign in, they appear here and you can assign their role.
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" message="Users will appear here after they log in." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['User', 'Role', 'Last Login', 'Member Since', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm">
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{u.full_name || '—'}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {u.last_login ? (
                      <span title={formatDateTime(u.last_login)}>
                        <Clock size={11} className="inline mr-1" />{timeAgo(u.last_login)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {u.created_at ? formatDateTime(u.created_at) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {u.id !== profile?.id && (
                      <button
                        onClick={() => { setEditTarget(u); setEditRole(u.role) }}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-700"
                        title="Edit role"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                    {u.id === profile?.id && (
                      <span className="text-xs text-slate-400 italic">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit role modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Change User Role" size="sm">
        {editTarget && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xs text-slate-500">User</p>
              <p className="text-sm font-semibold text-slate-900">{editTarget.full_name || editTarget.email}</p>
            </div>
            <Select label="Role" value={editRole} onChange={e => setEditRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>Admin</strong> — Full access including user management</p>
              <p><strong>HR Manager</strong> — Create jobs, manage applications, templates</p>
              <p><strong>Recruiter</strong> — View and update applications, send emails</p>
              <p><strong>Viewer</strong> — Read-only access</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Btn variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={saveRole} disabled={saving || editRole === editTarget.role}>
                {saving ? 'Saving…' : 'Update Role'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
