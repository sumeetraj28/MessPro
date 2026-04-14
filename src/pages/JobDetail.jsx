import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { Building2, MapPin, Calendar, Briefcase, Clock, ArrowRight, ChevronLeft, Share2 } from 'lucide-react'

const TYPE_LABELS = {
  'full-time': 'Full-time', 'part-time': 'Part-time',
  'contract': 'Contract', 'internship': 'Internship',
}
const TYPE_COLORS = {
  'full-time':  'bg-blue-100 text-blue-800',
  'part-time':  'bg-teal-100 text-teal-800',
  'contract':   'bg-amber-100 text-amber-800',
  'internship': 'bg-purple-100 text-purple-800',
}

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('job_postings')
        .select('*, departments(name)')
        .eq('id', id)
        .in('status', ['active'])
        .single()
      if (data) setJob(data)
      else setNotFound(true)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-6">
        <Briefcase size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Position not found</h2>
        <p className="text-slate-500 mb-6">This job may have been closed or the link is invalid.</p>
        <Link to="/" className="px-5 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-900">
          Browse All Jobs
        </Link>
      </div>
    )
  }

  const daysLeft = job.deadline
    ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <Building2 size={19} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold leading-tight">RTCIT</div>
              <div className="text-blue-300 text-xs">Recruitment Portal</div>
            </div>
          </div>
          <Link to="/login" className="text-sm text-blue-200 hover:text-white font-medium">HR Login</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ChevronLeft size={16} /> Back to all jobs
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          {/* Job header */}
          <div className="p-6 lg:p-8 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TYPE_COLORS[job.type] || 'bg-gray-100 text-gray-700'}`}>
                    {TYPE_LABELS[job.type] || job.type}
                  </span>
                  {job.departments?.name && (
                    <span className="text-xs text-slate-500">{job.departments.name}</span>
                  )}
                </div>
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 mb-3">{job.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  {job.location && (
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {job.location}</span>
                  )}
                  {job.deadline && (
                    <span className={`flex items-center gap-1.5 ${daysLeft !== null && daysLeft <= 7 ? 'text-red-600 font-medium' : ''}`}>
                      <Calendar size={14} />
                      Deadline: {formatDate(job.deadline)}
                      {daysLeft !== null && daysLeft > 0 && ` (${daysLeft} days left)`}
                    </span>
                  )}
                  {job.salary_min && job.salary_max && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      ₹{job.salary_min.toLocaleString()} – ₹{job.salary_max.toLocaleString()} / month
                    </span>
                  )}
                </div>
              </div>
              <Link
                to={`/apply/${job.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600
                  text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                Apply Now <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Job body */}
          <div className="p-6 lg:p-8 space-y-7">
            {job.description && (
              <Section title="About this role">
                <Prose content={job.description} />
              </Section>
            )}
            {job.requirements && (
              <Section title="Requirements">
                <Prose content={job.requirements} />
              </Section>
            )}
            {job.qualifications && (
              <Section title="Qualifications">
                <Prose content={job.qualifications} />
              </Section>
            )}
          </div>
        </div>

        {/* Apply CTA */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-2xl p-6 lg:p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready to apply?</h3>
          <p className="text-blue-200 mb-6">Submit your application in a few minutes.</p>
          <Link
            to={`/apply/${job.id}`}
            className="inline-flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600
              text-white font-bold rounded-xl transition-colors"
          >
            Apply for {job.title} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  )
}

function Prose({ content }) {
  return (
    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
      {content}
    </div>
  )
}
