import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, logAudit } from '../lib/supabase'
import { Building2, Upload, X, ChevronLeft, Send } from 'lucide-react'

const NOTICE_OPTS = ['Immediate', '15 days', '30 days', '45 days', '60 days', '90 days', 'Other']

export default function Apply() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [job, setJob]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [errors, setErrors]     = useState({})

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    current_role: '', current_company: '', experience_years: '',
    expected_salary: '', notice_period: '',
    linkedin_url: '', portfolio_url: '',
    cover_letter: '',
  })

  useEffect(() => {
    supabase.from('job_postings')
      .select('id, title, departments(name), deadline, type, location')
      .eq('id', id)
      .eq('status', 'active')
      .single()
      .then(({ data }) => {
        if (data) setJob(data)
        else navigate('/', { replace: true })
        setLoading(false)
      })
  }, [id])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Name is required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!resumeFile) e.resume = 'Please upload your resume'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      // 1. Insert application (get ID first)
      const { data: app, error: appErr } = await supabase
        .from('applications')
        .insert({
          job_id:           id,
          full_name:        form.full_name.trim(),
          email:            form.email.trim().toLowerCase(),
          phone:            form.phone.trim(),
          current_role:     form.current_role.trim() || null,
          current_company:  form.current_company.trim() || null,
          experience_years: parseInt(form.experience_years) || 0,
          expected_salary:  form.expected_salary.trim() || null,
          notice_period:    form.notice_period || null,
          linkedin_url:     form.linkedin_url.trim() || null,
          portfolio_url:    form.portfolio_url.trim() || null,
          cover_letter:     form.cover_letter.trim() || null,
          stage:            'applied',
        })
        .select('id')
        .single()

      if (appErr) throw appErr

      // 2. Upload resume
      if (resumeFile) {
        const ext = resumeFile.name.split('.').pop()
        const path = `${id}/${app.id}/resume.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('resumes')
          .upload(path, resumeFile, { cacheControl: '3600', upsert: false })

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(path)
          await supabase.from('applications').update({
            resume_url:      path,
            resume_filename: resumeFile.name,
          }).eq('id', app.id)
        }
      }

      // 3. Log audit
      await logAudit({
        action:      'APPLICATION_SUBMITTED',
        tableName:   'applications',
        recordId:    app.id,
        description: `${form.full_name} applied for job ${id}`,
      })

      navigate(`/apply/${id}/success`, { state: { jobTitle: job.title } })
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <Building2 size={19} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold leading-tight">RTCIT</div>
              <div className="text-blue-300 text-xs">Recruitment Portal</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to={`/jobs/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ChevronLeft size={16} /> Back to job details
        </Link>

        {job && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-600 font-medium mb-0.5">Applying for</p>
            <h2 className="text-base font-bold text-blue-900">{job.title}</h2>
            {job.departments?.name && <p className="text-sm text-blue-700">{job.departments.name}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {/* Personal info */}
          <Section title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name *" error={errors.full_name}>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="John Doe" className={inputClass(errors.full_name)} />
              </Field>
              <Field label="Email Address *" error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="john@example.com" className={inputClass(errors.email)} />
              </Field>
              <Field label="Phone Number *" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+91 98765 43210" className={inputClass(errors.phone)} />
              </Field>
            </div>
          </Section>

          {/* Professional info */}
          <Section title="Professional Background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Current Role">
                <input value={form.current_role} onChange={e => set('current_role', e.target.value)}
                  placeholder="Software Engineer" className={inputClass()} />
              </Field>
              <Field label="Current Company / Institute">
                <input value={form.current_company} onChange={e => set('current_company', e.target.value)}
                  placeholder="XYZ Corp" className={inputClass()} />
              </Field>
              <Field label="Years of Experience">
                <input type="number" min="0" max="50" value={form.experience_years}
                  onChange={e => set('experience_years', e.target.value)}
                  placeholder="0" className={inputClass()} />
              </Field>
              <Field label="Expected Salary (₹/month)">
                <input value={form.expected_salary} onChange={e => set('expected_salary', e.target.value)}
                  placeholder="e.g. 50,000" className={inputClass()} />
              </Field>
              <Field label="Notice Period">
                <select value={form.notice_period} onChange={e => set('notice_period', e.target.value)}
                  className={inputClass()}>
                  <option value="">Select…</option>
                  {NOTICE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Links */}
          <Section title="Online Presence (optional)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="LinkedIn Profile URL">
                <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/…" className={inputClass()} />
              </Field>
              <Field label="Portfolio / GitHub URL">
                <input type="url" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)}
                  placeholder="https://github.com/…" className={inputClass()} />
              </Field>
            </div>
          </Section>

          {/* Resume */}
          <Section title="Resume *">
            <ResumeUpload file={resumeFile} setFile={setResumeFile} error={errors.resume} />
          </Section>

          {/* Cover letter */}
          <Section title="Cover Letter (optional)">
            <textarea
              value={form.cover_letter}
              onChange={e => set('cover_letter', e.target.value)}
              rows={5}
              placeholder="Tell us why you're a great fit for this role…"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900
                focus:outline-none focus:ring-2 focus:ring-blue-700 resize-none placeholder:text-slate-400"
            />
          </Section>

          {/* Submit */}
          <div className="p-6">
            {errors.submit && (
              <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {errors.submit}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600
                disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-base"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={17} />
              )}
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
            <p className="text-xs text-slate-400 text-center mt-3">
              By submitting, you agree that your details will be reviewed by our HR team.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

function inputClass(error) {
  return `w-full px-3 py-2 border ${error ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-blue-700 focus:border-blue-700'}
    rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 placeholder:text-slate-400 bg-white`
}

function ResumeUpload({ file, setFile, error }) {
  function handleChange(e) {
    const f = e.target.files?.[0]
    if (f && f.size <= 10 * 1024 * 1024) setFile(f)
    else if (f) alert('File size must be under 10 MB')
  }

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Upload size={16} className="text-green-600" />
          <span className="text-sm text-green-800 flex-1 truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} className="text-green-600 hover:text-green-800">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors
          ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'}`}>
          <Upload size={28} className={error ? 'text-red-400' : 'text-slate-400'} />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">Click to upload resume</p>
            <p className="text-xs text-slate-400">PDF, DOC, DOCX · Max 10 MB</p>
          </div>
          <input type="file" accept=".pdf,.doc,.docx" onChange={handleChange} className="hidden" />
        </label>
      )}
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  )
}
