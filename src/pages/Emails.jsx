import { useState, useEffect } from 'react'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatDateTime, timeAgo, EMAIL_TYPE_LABELS } from '../lib/utils'
import PageHeader, { Btn, Input, Select, Textarea, EmptyState, LoadingScreen } from '../components/ui/PageHeader'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import { Mail, Plus, Edit2, Trash2, Send, Clock, User, FileText } from 'lucide-react'

const EMAIL_TYPES = ['confirm', 'screen', 'interview', 'offer', 'reject']
const TYPE_COLORS = {
  confirm:   'bg-blue-100 text-blue-800',
  screen:    'bg-teal-100 text-teal-800',
  interview: 'bg-amber-100 text-amber-800',
  offer:     'bg-green-100 text-green-800',
  reject:    'bg-red-100 text-red-800',
}

const EMPTY_TPL = { name: '', subject: '', body: '', type: 'confirm' }

export default function Emails() {
  const { profile } = useAuth()
  const toast = useToast()

  const [tab, setTab]             = useState('templates')
  const [templates, setTemplates] = useState([])
  const [sent, setSent]           = useState([])
  const [loading, setLoading]     = useState(true)

  const [modalOpen, setModalOpen]     = useState(false)
  const [editTpl, setEditTpl]         = useState(null)
  const [form, setForm]               = useState(EMPTY_TPL)
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [preview, setPreview]         = useState(null)

  const canEdit = ['admin','hr_manager'].includes(profile?.role)

  async function load() {
    const [tplRes, sentRes] = await Promise.all([
      supabase.from('email_templates').select('*').order('type').order('name'),
      supabase.from('emails_sent')
        .select('*, profiles(full_name), applications(full_name, email), email_templates(name)')
        .order('sent_at', { ascending: false })
        .limit(100),
    ])
    setTemplates(tplRes.data || [])
    setSent(sentRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditTpl(null)
    setForm(EMPTY_TPL)
    setModalOpen(true)
  }

  function openEdit(tpl) {
    setEditTpl(tpl)
    setForm({ name: tpl.name, subject: tpl.subject, body: tpl.body, type: tpl.type || 'confirm' })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error('Name, subject, and body are required')
      return
    }
    setSaving(true)
    try {
      if (editTpl) {
        await supabase.from('email_templates').update({ ...form }).eq('id', editTpl.id)
        await logAudit({ userId: profile?.id, userName: profile?.full_name, action: 'UPDATE_TEMPLATE', tableName: 'email_templates', recordId: editTpl.id, description: `Updated template: ${form.name}` })
        toast.success('Template updated')
      } else {
        await supabase.from('email_templates').insert({ ...form, created_by: profile?.id })
        await logAudit({ userId: profile?.id, userName: profile?.full_name, action: 'CREATE_TEMPLATE', tableName: 'email_templates', description: `Created template: ${form.name}` })
        toast.success('Template created')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tpl) {
    await supabase.from('email_templates').delete().eq('id', tpl.id)
    await logAudit({ userId: profile?.id, userName: profile?.full_name, action: 'DELETE_TEMPLATE', tableName: 'email_templates', recordId: tpl.id, description: `Deleted template: ${tpl.name}` })
    toast.success('Template deleted')
    load()
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title="Email Management"
        subtitle="Templates and sent history"
        action={tab === 'templates' && canEdit && (
          <Btn onClick={openCreate} variant="primary">
            <Plus size={16} /> New Template
          </Btn>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: 'templates', label: `Templates (${templates.length})` },
          { key: 'sent',      label: `Sent History (${sent.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        templates.length === 0 ? (
          <EmptyState icon={Mail} title="No email templates" message="Create your first template." action={canEdit && <Btn onClick={openCreate} variant="primary"><Plus size={16} /> Create Template</Btn>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{tpl.name}</h3>
                    {tpl.type && (
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[tpl.type] || 'bg-gray-100 text-gray-600'}`}>
                        {EMAIL_TYPE_LABELS[tpl.type] || tpl.type}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(tpl)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(tpl)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-1"><strong>Subject:</strong> {tpl.subject}</p>
                <p className="text-xs text-slate-500 flex-1 line-clamp-3 whitespace-pre-line">{tpl.body}</p>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setPreview(tpl)}
                    className="text-xs text-blue-700 hover:underline font-medium"
                  >
                    Preview template →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Sent history */
        sent.length === 0 ? (
          <EmptyState icon={Send} title="No emails sent yet" message="Emails sent to candidates will appear here." />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Candidate', 'Template', 'Sent by', 'Status', 'Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sent.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{s.applications?.full_name || s.to_name}</div>
                      <div className="text-xs text-slate-400">{s.to_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.email_templates?.name || s.subject}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.profiles?.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${s.status === 'sent' ? 'bg-blue-100 text-blue-700' : s.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs" title={formatDateTime(s.sent_at)}>
                      {timeAgo(s.sent_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTpl ? 'Edit Template' : 'New Email Template'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Template Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Application Received" />
            <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {EMAIL_TYPES.map(t => <option key={t} value={t}>{EMAIL_TYPE_LABELS[t]}</option>)}
            </Select>
          </div>
          <Input
            label="Subject *"
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Use {{job_title}} and {{candidate_name}} as placeholders"
          />
          <Textarea
            label="Body *"
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={10}
            placeholder="Write your email body. Use {{candidate_name}} and {{job_title}} as placeholders."
          />
          <p className="text-xs text-slate-500">Available placeholders: <code>{'{{candidate_name}}'}</code>, <code>{'{{job_title}}'}</code></p>
          <div className="flex gap-3 justify-end">
            <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTpl ? 'Update' : 'Create'}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={`Preview: ${preview?.name}`} size="md">
        {preview && (
          <div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-0.5">Subject</p>
              <p className="text-sm font-semibold text-slate-900">{preview.subject}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Body</p>
              <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">{preview.body}</pre>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete Template"
        message={`Delete template "${deleteTarget?.name}"? This cannot be undone.`}
        danger
      />
    </div>
  )
}
