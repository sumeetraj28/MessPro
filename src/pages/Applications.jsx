import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatDate, timeAgo, STAGES, STAGE_LABELS, STAGE_COLORS } from '../lib/utils'
import PageHeader, { Btn, Select, EmptyState, LoadingScreen, Spinner } from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import { FileText, Search, LayoutList, Columns, Mail, ChevronRight, User, Star } from 'lucide-react'

const PIPELINE = ['applied','screening','shortlisted','interview','offer','hired']

export default function Applications() {
  const { profile } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [apps, setApps]       = useState([])
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('list') // 'list' | 'kanban'

  const [search,      setSearch]      = useState('')
  const [filterJob,   setFilterJob]   = useState(searchParams.get('job') || '')
  const [filterStage, setFilterStage] = useState('')

  const [bulkSelected, setBulkSelected] = useState([])
  const [emailModal, setEmailModal]     = useState(false)
  const [templates, setTemplates]       = useState([])
  const [templateId, setTemplateId]     = useState('')
  const [bulkMoving, setBulkMoving]     = useState(false)

  const canWrite = ['admin','hr_manager','recruiter'].includes(profile?.role)

  const load = useCallback(async () => {
    let q = supabase.from('applications')
      .select('*, job_postings(title)')
      .order('created_at', { ascending: false })

    if (filterJob) q = q.eq('job_id', filterJob)
    if (filterStage) q = q.eq('stage', filterStage)

    const [appsRes, jobsRes, tplRes] = await Promise.all([
      q,
      supabase.from('job_postings').select('id, title').order('created_at', { ascending: false }),
      supabase.from('email_templates').select('id, name, type'),
    ])

    setApps(appsRes.data || [])
    setJobs(jobsRes.data || [])
    setTemplates(tplRes.data || [])
    setLoading(false)
  }, [filterJob, filterStage])

  useEffect(() => { load() }, [load])

  const filtered = apps.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.full_name?.toLowerCase().includes(q) ||
           a.email?.toLowerCase().includes(q) ||
           a.job_postings?.title?.toLowerCase().includes(q)
  })

  async function changeStage(appId, newStage, currentStage) {
    await supabase.from('applications').update({ stage: newStage }).eq('id', appId)
    await supabase.from('stage_history').insert({
      application_id: appId, from_stage: currentStage, to_stage: newStage, changed_by: profile?.id,
    })
    await logAudit({
      userId: profile?.id, userName: profile?.full_name,
      action: 'STAGE_CHANGED', tableName: 'applications', recordId: appId,
      oldValues: { stage: currentStage }, newValues: { stage: newStage },
      description: `Stage changed from ${currentStage} to ${newStage}`,
    })
    load()
  }

  async function bulkChangeStage(newStage) {
    if (!bulkSelected.length) return
    setBulkMoving(true)
    for (const id of bulkSelected) {
      const app = apps.find(a => a.id === id)
      await changeStage(id, newStage, app?.stage)
    }
    setBulkSelected([])
    setBulkMoving(false)
    toast.success(`Moved ${bulkSelected.length} candidate(s) to ${STAGE_LABELS[newStage]}`)
  }

  async function bulkSendEmail() {
    if (!templateId || !bulkSelected.length) return
    const tpl = templates.find(t => t.id === templateId)
    for (const id of bulkSelected) {
      const app = apps.find(a => a.id === id)
      if (!app) continue
      await supabase.from('emails_sent').insert({
        application_id: id, to_email: app.email, to_name: app.full_name,
        subject: tpl.name, body: `Template: ${tpl.name}`, template_id: templateId,
        sent_by: profile?.id, status: 'sent',
      })
      await logAudit({
        userId: profile?.id, userName: profile?.full_name,
        action: 'EMAIL_SENT', tableName: 'emails_sent', recordId: id,
        description: `Email "${tpl.name}" sent to ${app.email}`,
      })
    }
    toast.success(`Email queued for ${bulkSelected.length} candidate(s)`)
    setEmailModal(false)
    setBulkSelected([])
  }

  function toggleSelect(id) {
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle={`${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg border transition-colors ${view === 'list' ? 'bg-blue-800 text-white border-blue-800' : 'bg-white border-slate-200 text-slate-500'}`}
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded-lg border transition-colors ${view === 'kanban' ? 'bg-blue-800 text-white border-blue-800' : 'bg-white border-slate-200 text-slate-500'}`}
            >
              <Columns size={16} />
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search size={15} className="text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, job…"
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <Select value={filterJob} onChange={e => setFilterJob(e.target.value)} className="w-48">
          <option value="">All Jobs</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        <Select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="w-40">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </Select>
      </div>

      {/* Bulk actions */}
      {bulkSelected.length > 0 && canWrite && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-semibold text-blue-800">{bulkSelected.length} selected</span>
          <div className="flex gap-2 flex-wrap">
            {PIPELINE.map(s => (
              <Btn key={s} variant="secondary" size="sm" onClick={() => bulkChangeStage(s)} disabled={bulkMoving}>
                → {STAGE_LABELS[s]}
              </Btn>
            ))}
            <Btn variant="ghost" size="sm" onClick={() => setEmailModal(true)}>
              <Mail size={14} /> Send Email
            </Btn>
          </div>
          <button className="ml-auto text-xs text-slate-500 hover:text-slate-700" onClick={() => setBulkSelected([])}>
            Clear
          </button>
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No applications found" message="Try changing your search filters." />
      ) : view === 'list' ? (
        <ListView apps={filtered} bulkSelected={bulkSelected} toggleSelect={toggleSelect} changeStage={changeStage} canWrite={canWrite} />
      ) : (
        <KanbanView apps={filtered} changeStage={changeStage} canWrite={canWrite} />
      )}

      {/* Bulk email modal */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Send Email to Selected" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Send an email to <strong>{bulkSelected.length}</strong> selected candidate(s).
          </p>
          <Select label="Email Template" value={templateId} onChange={e => setTemplateId(e.target.value)}>
            <option value="">Select template…</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex gap-3 justify-end">
            <Btn variant="secondary" onClick={() => setEmailModal(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={bulkSendEmail} disabled={!templateId}>
              <Mail size={14} /> Send
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ListView({ apps, bulkSelected, toggleSelect, changeStage, canWrite }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {canWrite && <th className="w-10 px-4 py-3" />}
              {['Candidate', 'Job', 'Experience', 'AI Score', 'Stage', 'Applied', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {apps.map(app => (
              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                {canWrite && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={bulkSelected.includes(app.id)}
                      onChange={() => toggleSelect(app.id)}
                      className="w-4 h-4 accent-orange-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                      {app.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-36 truncate">
                  {app.job_postings?.title || '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {app.experience_years != null ? `${app.experience_years} yr${app.experience_years !== 1 ? 's' : ''}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {app.ai_score != null ? (
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-orange-400" />
                      <span className="font-semibold text-slate-800">{app.ai_score}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canWrite ? (
                    <select
                      value={app.stage}
                      onChange={e => changeStage(app.id, e.target.value, app.stage)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STAGE_COLORS[app.stage]}`}
                    >
                      {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[app.stage]}`}>
                      {STAGE_LABELS[app.stage]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(app.created_at)}</td>
                <td className="px-4 py-3">
                  <Link to={`/applications/${app.id}`} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-700 inline-flex">
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KanbanView({ apps, changeStage, canWrite }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {PIPELINE.map(stage => {
          const stageApps = apps.filter(a => a.stage === stage)
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg ${STAGE_COLORS[stage]}`}>
                <span className="text-xs font-bold uppercase tracking-wide">{STAGE_LABELS[stage]}</span>
                <span className="text-xs font-bold">{stageApps.length}</span>
              </div>
              <div className="space-y-2">
                {stageApps.map(app => (
                  <KanbanCard key={app.id} app={app} changeStage={changeStage} canWrite={canWrite} />
                ))}
                {stageApps.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                    Empty
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({ app, changeStage, canWrite }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
            {app.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 leading-tight">{app.full_name}</div>
            <div className="text-xs text-slate-400">{app.experience_years || 0}yr exp</div>
          </div>
        </div>
        {app.ai_score != null && (
          <span className="text-xs font-bold text-orange-600 flex items-center gap-0.5">
            <Star size={10} className="text-orange-400" />{app.ai_score}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3 truncate">{app.job_postings?.title || '—'}</p>
      <div className="flex items-center gap-1.5">
        <Link
          to={`/applications/${app.id}`}
          className="flex-1 text-center py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors"
        >
          View
        </Link>
        {canWrite && (
          <select
            value={app.stage}
            onChange={e => changeStage(app.id, e.target.value, app.stage)}
            className="flex-1 text-xs py-1.5 px-1 border border-slate-200 rounded-lg text-slate-600 focus:outline-none bg-white"
          >
            {PIPELINE.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        )}
      </div>
    </div>
  )
}
