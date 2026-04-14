import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { formatDate, JOB_STATUS_COLORS, JOB_TYPE_LABELS, JOB_TYPE_COLORS, JOB_STATUSES } from '../lib/utils'
import PageHeader, { Btn, Input, Select, Textarea, Badge, EmptyState, LoadingScreen } from '../components/ui/PageHeader'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import { Briefcase, Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink, FileText } from 'lucide-react'

const EMPTY_JOB = {
  title: '', department_id: '', type: 'full-time', location: 'On-site',
  description: '', requirements: '', qualifications: '',
  salary_min: '', salary_max: '', deadline: '', status: 'draft',
}

export default function Jobs() {
  const { profile } = useAuth()
  const toast = useToast()

  const [jobs, setJobs]           = useState([])
  const [departments, setDepts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [appCounts, setAppCounts] = useState({})

  const [modalOpen, setModalOpen] = useState(false)
  const [editJob, setEditJob]     = useState(null)
  const [form, setForm]           = useState(EMPTY_JOB)
  const [saving, setSaving]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [filterStatus, setFilterStatus] = useState('')

  const canWrite = ['admin','hr_manager','recruiter'].includes(profile?.role)

  async function load() {
    const [jobsRes, deptRes, appsRes] = await Promise.all([
      supabase.from('job_postings')
        .select('*, departments(name)')
        .order('created_at', { ascending: false }),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('applications').select('id, job_id'),
    ])
    setJobs(jobsRes.data || [])
    setDepts(deptRes.data || [])
    const counts = {}
    ;(appsRes.data || []).forEach(a => {
      counts[a.job_id] = (counts[a.job_id] || 0) + 1
    })
    setAppCounts(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditJob(null)
    setForm(EMPTY_JOB)
    setModalOpen(true)
  }

  function openEdit(job) {
    setEditJob(job)
    setForm({
      title:         job.title,
      department_id: job.department_id || '',
      type:          job.type,
      location:      job.location || '',
      description:   job.description,
      requirements:  job.requirements || '',
      qualifications: job.qualifications || '',
      salary_min:    job.salary_min || '',
      salary_max:    job.salary_max || '',
      deadline:      job.deadline || '',
      status:        job.status,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        department_id: form.department_id || null,
        salary_min:    form.salary_min ? parseInt(form.salary_min) : null,
        salary_max:    form.salary_max ? parseInt(form.salary_max) : null,
        deadline:      form.deadline || null,
        created_by:    profile?.id,
      }

      if (editJob) {
        const { error } = await supabase.from('job_postings').update(payload).eq('id', editJob.id)
        if (error) throw error
        await logAudit({
          userId: profile?.id, userName: profile?.full_name,
          action: 'UPDATE_JOB', tableName: 'job_postings', recordId: editJob.id,
          description: `Updated job: ${form.title}`,
        })
        toast.success('Job updated successfully')
      } else {
        const { error } = await supabase.from('job_postings').insert(payload)
        if (error) throw error
        await logAudit({
          userId: profile?.id, userName: profile?.full_name,
          action: 'CREATE_JOB', tableName: 'job_postings',
          description: `Created job: ${form.title}`,
        })
        toast.success('Job created successfully')
      }

      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to save job')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(job) {
    try {
      await supabase.from('job_postings').delete().eq('id', job.id)
      await logAudit({
        userId: profile?.id, userName: profile?.full_name,
        action: 'DELETE_JOB', tableName: 'job_postings', recordId: job.id,
        description: `Deleted job: ${job.title}`,
      })
      toast.success('Job deleted')
      load()
    } catch (err) {
      toast.error('Failed to delete job')
    }
  }

  async function toggleStatus(job) {
    const newStatus = job.status === 'active' ? 'paused' : 'active'
    await supabase.from('job_postings').update({ status: newStatus }).eq('id', job.id)
    await logAudit({
      userId: profile?.id, userName: profile?.full_name,
      action: 'UPDATE_JOB', tableName: 'job_postings', recordId: job.id,
      description: `Changed job status to ${newStatus}: ${job.title}`,
    })
    load()
  }

  const filtered = filterStatus ? jobs.filter(j => j.status === filterStatus) : jobs

  if (loading) return <LoadingScreen />

  return (
    <div>
      <PageHeader
        title="Job Postings"
        subtitle={`${jobs.length} total · ${jobs.filter(j => j.status === 'active').length} active`}
        action={canWrite && (
          <Btn onClick={openCreate} variant="primary">
            <Plus size={16} /> New Job
          </Btn>
        )}
      />

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {['', ...JOB_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${filterStatus === s
                ? 'bg-blue-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            {s && ` (${jobs.filter(j => j.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job postings yet"
          message="Create your first job posting to start recruiting."
          action={canWrite && <Btn onClick={openCreate} variant="primary"><Plus size={16} /> Create Job</Btn>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Job Title', 'Department', 'Type', 'Applications', 'Deadline', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{job.title}</div>
                      <div className="text-xs text-slate-400">{job.location}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{job.departments?.name || '—'}</td>
                    <td className="px-4 py-3.5">
                      <Badge color={job.type === 'full-time' ? 'blue' : job.type === 'internship' ? 'purple' : 'amber'}>
                        {JOB_TYPE_LABELS[job.type] || job.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/applications?job=${job.id}`}
                        className="flex items-center gap-1 text-blue-700 font-semibold hover:underline"
                      >
                        <FileText size={13} />
                        {appCounts[job.id] || 0}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {job.deadline ? formatDate(job.deadline) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${JOB_STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        {canWrite && (
                          <>
                            <button
                              onClick={() => toggleStatus(job)}
                              title={job.status === 'active' ? 'Pause' : 'Activate'}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            >
                              {job.status === 'active' ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <button
                              onClick={() => openEdit(job)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            >
                              <Edit2 size={15} />
                            </button>
                            {profile?.role === 'admin' && (
                              <button
                                onClick={() => setDeleteTarget(job)}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </>
                        )}
                        <Link
                          to={`/jobs/${job.id}`}
                          target="_blank"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
                          title="View public listing"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editJob ? 'Edit Job Posting' : 'New Job Posting'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Senior Software Engineer"
              className="sm:col-span-2"
            />
            <Select
              label="Department"
              value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
            >
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              {['full-time','part-time','contract','internship'].map(t => (
                <option key={t} value={t}>{JOB_TYPE_LABELS[t]}</option>
              ))}
            </Select>
            <Input
              label="Location"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. On-site / Remote / Hybrid"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              {JOB_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
            <Input
              label="Min Salary (₹/month)"
              type="number"
              value={form.salary_min}
              onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))}
              placeholder="e.g. 40000"
            />
            <Input
              label="Max Salary (₹/month)"
              type="number"
              value={form.salary_max}
              onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))}
              placeholder="e.g. 70000"
            />
            <Input
              label="Application Deadline"
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <Textarea
            label="Job Description *"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            placeholder="Describe the role, responsibilities, and what you're looking for…"
          />
          <Textarea
            label="Requirements"
            value={form.requirements}
            onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
            rows={3}
            placeholder="Required skills, experience, and technical competencies…"
          />
          <Textarea
            label="Qualifications"
            value={form.qualifications}
            onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))}
            rows={3}
            placeholder="Educational qualifications, certifications, etc."
          />
          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editJob ? 'Update Job' : 'Create Job'}
            </Btn>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Delete Job Posting"
        message={`Delete "${deleteTarget?.title}"? This will also delete all applications for this job. This action cannot be undone.`}
        danger
      />
    </div>
  )
}
