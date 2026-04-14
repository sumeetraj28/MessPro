import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatDate, formatDateTime, timeAgo, STAGES, STAGE_LABELS, STAGE_COLORS } from '../lib/utils'
import { Btn, Badge, LoadingScreen, Spinner } from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import AIScoreCard from '../components/ui/AIScoreCard'
import Timeline from '../components/ui/Timeline'
import {
  ChevronLeft, Mail, FileText, Link2, Globe, Briefcase, User,
  Phone, MessageSquare, Plus, Send, ExternalLink, Layers, Sparkles,
  Edit2, Trash2, Clock, Star
} from 'lucide-react'

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const toast = useToast()

  const [app,       setApp]       = useState(null)
  const [job,       setJob]       = useState(null)
  const [history,   setHistory]   = useState([])
  const [notes,     setNotes]     = useState([])
  const [emails,    setEmails]    = useState([])
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)

  const [noteText, setNoteText]       = useState('')
  const [addingNote, setAddingNote]   = useState(false)
  const [emailModal, setEmailModal]   = useState(false)
  const [templateId, setTemplateId]   = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [resumeUrl, setResumeUrl]     = useState(null)
  const [aiLoading, setAiLoading]     = useState(false)

  const canWrite = ['admin','hr_manager','recruiter'].includes(profile?.role)

  async function loadAll() {
    const [appRes, histRes, notesRes, emailsRes, tplRes] = await Promise.all([
      supabase.from('applications').select('*, job_postings(*)').eq('id', id).single(),
      supabase.from('stage_history').select('*, profiles(full_name)').eq('application_id', id).order('created_at', { ascending: false }),
      supabase.from('application_notes').select('*, profiles(full_name)').eq('application_id', id).order('created_at', { ascending: false }),
      supabase.from('emails_sent').select('*, email_templates(name)').eq('application_id', id).order('sent_at', { ascending: false }),
      supabase.from('email_templates').select('id, name, subject, body, type'),
    ])

    if (!appRes.data) { navigate('/applications', { replace: true }); return }
    const a = appRes.data
    setApp(a)
    setJob(a.job_postings)
    setHistory(histRes.data || [])
    setNotes(notesRes.data || [])
    setEmails(emailsRes.data || [])
    setTemplates(tplRes.data || [])

    // Get signed URL for resume
    if (a.resume_url) {
      const { data: signed } = await supabase.storage.from('resumes').createSignedUrl(a.resume_url, 3600)
      if (signed?.signedUrl) setResumeUrl(signed.signedUrl)
    }

    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  async function changeStage(newStage) {
    const old = app.stage
    await supabase.from('applications').update({ stage: newStage }).eq('id', id)
    await supabase.from('stage_history').insert({
      application_id: id, from_stage: old, to_stage: newStage, changed_by: profile?.id,
    })
    await logAudit({
      userId: profile?.id, userName: profile?.full_name,
      action: 'STAGE_CHANGED', tableName: 'applications', recordId: id,
      oldValues: { stage: old }, newValues: { stage: newStage },
      description: `Stage: ${old} → ${newStage} for ${app.full_name}`,
    })
    toast.success(`Stage updated to ${STAGE_LABELS[newStage]}`)
    loadAll()
  }

  async function addNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    await supabase.from('application_notes').insert({
      application_id: id, note: noteText.trim(), created_by: profile?.id,
    })
    await logAudit({
      userId: profile?.id, userName: profile?.full_name,
      action: 'NOTE_ADDED', tableName: 'application_notes', recordId: id,
      description: `Note added to ${app.full_name}'s application`,
    })
    setNoteText('')
    setAddingNote(false)
    loadAll()
  }

  async function sendEmail() {
    if (!templateId) return
    setSendingEmail(true)
    const tpl = templates.find(t => t.id === templateId)
    const body = tpl?.body
      ?.replace('{{candidate_name}}', app.full_name)
      ?.replace('{{job_title}}', job?.title || '')
    await supabase.from('emails_sent').insert({
      application_id: id, to_email: app.email, to_name: app.full_name,
      subject: tpl?.subject?.replace('{{job_title}}', job?.title || '') || tpl?.name,
      body: body || '',
      template_id: templateId, sent_by: profile?.id, status: 'sent',
    })
    await logAudit({
      userId: profile?.id, userName: profile?.full_name,
      action: 'EMAIL_SENT', tableName: 'emails_sent', recordId: id,
      description: `Email "${tpl?.name}" sent to ${app.email}`,
    })
    toast.success('Email logged successfully')
    setSendingEmail(false)
    setEmailModal(false)
    loadAll()
  }

  // Build timeline events from history + notes + emails
  function buildTimeline() {
    const events = []
    history.forEach(h => events.push({
      id: `h-${h.id}`, timestamp: h.created_at,
      icon: Layers, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-700',
      title: `Stage: ${STAGE_LABELS[h.from_stage] || h.from_stage || '—'} → ${STAGE_LABELS[h.to_stage]}`,
      user: h.profiles?.full_name ? `by ${h.profiles.full_name}` : null,
      description: h.notes || null,
    }))
    notes.forEach(n => events.push({
      id: `n-${n.id}`, timestamp: n.created_at,
      icon: Edit2, iconBg: 'bg-teal-100', iconColor: 'text-teal-700',
      title: 'Note added',
      description: n.note,
      user: n.profiles?.full_name ? `by ${n.profiles.full_name}` : null,
    }))
    emails.forEach(e => events.push({
      id: `e-${e.id}`, timestamp: e.sent_at,
      icon: Mail, iconBg: 'bg-orange-100', iconColor: 'text-orange-700',
      title: `Email sent: ${e.email_templates?.name || e.subject}`,
      description: `To: ${e.to_email}`,
    }))
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  if (loading) return <LoadingScreen />
  if (!app) return null

  const timeline = buildTimeline()

  return (
    <div>
      {/* Back */}
      <div className="mb-5">
        <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft size={16} /> Back to Applications
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Candidate info + Resume */}
        <div className="xl:col-span-2 space-y-5">
          {/* Header card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-800 font-black text-xl">
                  {app.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900">{app.full_name}</h1>
                  <p className="text-sm text-slate-500">{app.current_role || '—'}{app.current_company ? ` · ${app.current_company}` : ''}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {app.ai_score != null && (
                      <span className="flex items-center gap-1 text-sm font-bold text-orange-600">
                        <Star size={14} className="text-orange-400" /> {app.ai_score}/100
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STAGE_COLORS[app.stage]}`}>
                      {STAGE_LABELS[app.stage]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>Applied {formatDate(app.created_at)}</div>
                <div className="mt-1">{job?.title}</div>
              </div>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-slate-100">
              <a href={`mailto:${app.email}`} className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                <Mail size={14} /> {app.email}
              </a>
              {app.phone && (
                <a href={`tel:${app.phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-700">
                  <Phone size={14} /> {app.phone}
                </a>
              )}
              {app.linkedin_url && (
                <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-700">
                  <Link2 size={14} /> LinkedIn
                </a>
              )}
              {app.portfolio_url && (
                <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-700">
                  <Globe size={14} /> Portfolio
                </a>
              )}
            </div>
          </div>

          {/* Professional details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Professional Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              {[
                ['Experience', app.experience_years != null ? `${app.experience_years} years` : '—'],
                ['Expected Salary', app.expected_salary || '—'],
                ['Notice Period', app.notice_period || '—'],
                ['Current Role', app.current_role || '—'],
                ['Current Company', app.current_company || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500 mb-0.5">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Cover letter */}
          {app.cover_letter && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Cover Letter</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{app.cover_letter}</p>
            </div>
          )}

          {/* Resume */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Resume</h3>
              {resumeUrl && (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline">
                  <ExternalLink size={13} /> Open in new tab
                </a>
              )}
            </div>
            {resumeUrl ? (
              <div>
                <p className="text-xs text-slate-500 mb-3">{app.resume_filename}</p>
                <iframe
                  src={resumeUrl}
                  title="Resume"
                  className="w-full border border-slate-200 rounded-xl"
                  style={{ height: 500 }}
                />
              </div>
            ) : app.resume_filename ? (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <FileText size={20} className="text-slate-400" />
                <span className="text-sm text-slate-600">{app.resume_filename}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No resume uploaded.</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Notes</h3>
            {canWrite && (
              <div className="flex gap-3 mb-4">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={2}
                  placeholder="Add a note about this candidate…"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900
                    focus:outline-none focus:ring-2 focus:ring-blue-700 resize-none placeholder:text-slate-400"
                />
                <Btn variant="blue" onClick={addNote} disabled={addingNote || !noteText.trim()} className="self-end">
                  {addingNote ? <Spinner size="sm" /> : <Plus size={15} />}
                </Btn>
              </div>
            )}
            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-slate-400">No notes yet.</p>
              ) : notes.map(n => (
                <div key={n.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-sm text-slate-800 whitespace-pre-line">{n.note}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <span>{n.profiles?.full_name || '—'}</span>
                    <span>·</span>
                    <span title={formatDateTime(n.created_at)}>{timeAgo(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Stage, AI, Timeline */}
        <div className="space-y-5">
          {/* Stage selector */}
          {canWrite && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Move Stage</h3>
              <div className="space-y-1.5">
                {STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => changeStage(s)}
                    disabled={s === app.stage}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                      ${s === app.stage
                        ? `${STAGE_COLORS[s]} cursor-default ring-2 ring-offset-1 ring-current`
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                  >
                    {s === app.stage && '✓ '}{STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email */}
          {canWrite && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Send Email</h3>
              <Btn variant="primary" onClick={() => setEmailModal(true)} className="w-full justify-center">
                <Mail size={15} /> Compose Email
              </Btn>
              {emails.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500 font-medium">{emails.length} email(s) sent</p>
                  {emails.slice(0, 3).map(e => (
                    <div key={e.id} className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Mail size={11} />
                      <span className="truncate">{e.email_templates?.name || e.subject}</span>
                      <span className="shrink-0">· {timeAgo(e.sent_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Score */}
          <AIScoreCard application={app} />

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Activity Timeline</h3>
            <Timeline events={timeline} />
          </div>
        </div>
      </div>

      {/* Email modal */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Send Email" size="md">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500">To</p>
            <p className="text-sm font-semibold text-slate-900">{app.full_name} &lt;{app.email}&gt;</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Template</label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white"
            >
              <option value="">Select a template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {templateId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 max-h-48 overflow-y-auto">
              <p className="font-semibold mb-2">Preview:</p>
              <p className="whitespace-pre-wrap">
                {templates.find(t => t.id === templateId)?.body
                  ?.replace('{{candidate_name}}', app.full_name)
                  ?.replace('{{job_title}}', job?.title || '')}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Note: Email sending is logged for audit. Configure Resend API in Settings to send actual emails.
          </p>
          <div className="flex gap-3 justify-end">
            <Btn variant="secondary" onClick={() => setEmailModal(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={sendEmail} disabled={!templateId || sendingEmail}>
              {sendingEmail ? <Spinner size="sm" /> : <Send size={15} />}
              {sendingEmail ? 'Sending…' : 'Send Email'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
