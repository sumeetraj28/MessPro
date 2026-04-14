import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateTime, timeAgo } from '../lib/utils'
import PageHeader, { Select, LoadingScreen, EmptyState } from '../components/ui/PageHeader'
import { ScrollText, LogIn, LogOut, Edit2, Plus, Trash2, Layers, Mail, Sparkles, FileText } from 'lucide-react'

const ACTION_META = {
  LOGIN:                   { icon: LogIn,    color: 'bg-blue-100 text-blue-600',   label: 'Login' },
  LOGOUT:                  { icon: LogOut,   color: 'bg-slate-100 text-slate-600', label: 'Logout' },
  CREATE_JOB:              { icon: Plus,     color: 'bg-green-100 text-green-600', label: 'Job Created' },
  UPDATE_JOB:              { icon: Edit2,    color: 'bg-amber-100 text-amber-600', label: 'Job Updated' },
  DELETE_JOB:              { icon: Trash2,   color: 'bg-red-100 text-red-600',     label: 'Job Deleted' },
  APPLICATION_SUBMITTED:   { icon: FileText, color: 'bg-blue-100 text-blue-700',   label: 'Application Submitted' },
  STAGE_CHANGED:           { icon: Layers,   color: 'bg-indigo-100 text-indigo-700', label: 'Stage Changed' },
  NOTE_ADDED:              { icon: Edit2,    color: 'bg-teal-100 text-teal-600',   label: 'Note Added' },
  EMAIL_SENT:              { icon: Mail,     color: 'bg-orange-100 text-orange-600', label: 'Email Sent' },
  AI_EVALUATION:           { icon: Sparkles, color: 'bg-purple-100 text-purple-700', label: 'AI Evaluated' },
}

const KNOWN_ACTIONS = Object.keys(ACTION_META)

export default function ChangeLog() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const [filterAction, setFilterAction] = useState('')
  const [filterUser,   setFilterUser]   = useState('')
  const [users, setUsers] = useState([])

  const PAGE_SIZE = 30

  async function load(p = 0, reset = false) {
    const from = p * PAGE_SIZE
    let q = supabase.from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filterAction) q = q.eq('action', filterAction)
    if (filterUser)   q = q.eq('user_id', filterUser)

    const { data } = await q
    const rows = data || []

    if (reset || p === 0) setLogs(rows)
    else setLogs(prev => [...prev, ...rows])

    setHasMore(rows.length === PAGE_SIZE)
    setPage(p)
    setLoading(false)
  }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, email')
    setUsers(data || [])
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    setLoading(true)
    load(0, true)
  }, [filterAction, filterUser])

  function loadMore() {
    load(page + 1)
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title="Change Log & Audit Trail"
        subtitle="Complete record of all actions taken in the portal"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="w-48"
        >
          <option value="">All Actions</option>
          {KNOWN_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
          ))}
        </Select>
        <Select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="w-48"
        >
          <option value="">All Users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))}
        </Select>
        {(filterAction || filterUser) && (
          <button
            onClick={() => { setFilterAction(''); setFilterUser('') }}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit events yet" message="Activity will appear here as users take actions." />
      ) : (
        <div className="space-y-2">
          {logs.map(log => <LogRow key={log.id} log={log} />)}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                className="px-5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LogRow({ log }) {
  const meta = ACTION_META[log.action] || { icon: ScrollText, color: 'bg-gray-100 text-gray-600', label: log.action }
  const Icon = meta.icon
  const [expanded, setExpanded] = useState(false)

  const hasDetails = log.old_values || log.new_values

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <button
        onClick={() => hasDetails && setExpanded(e => !e)}
        className={`w-full flex items-start gap-4 px-5 py-4 text-left ${hasDetails ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'} rounded-xl transition-colors`}
      >
        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}>
          <Icon size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
              {log.description && (
                <p className="text-sm text-slate-600 mt-0.5">{log.description}</p>
              )}
              {log.user_name && (
                <p className="text-xs text-slate-400 mt-1">by {log.user_name}</p>
              )}
            </div>
            <time className="text-xs text-slate-400 shrink-0 mt-1" title={formatDateTime(log.created_at)}>
              {timeAgo(log.created_at)}
            </time>
          </div>
        </div>
      </button>

      {/* Expanded diff */}
      {expanded && hasDetails && (
        <div className="border-t border-slate-100 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {log.old_values && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Before</p>
              <pre className="text-xs bg-red-50 border border-red-200 rounded-lg p-3 text-slate-700 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}
          {log.new_values && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">After</p>
              <pre className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 text-slate-700 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
