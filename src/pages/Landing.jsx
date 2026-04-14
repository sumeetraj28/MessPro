import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { Building2, MapPin, Clock, Calendar, Search, ChevronRight, Briefcase, Users, Award, ArrowRight } from 'lucide-react'

const TYPE_COLORS = {
  'full-time':  'bg-blue-100 text-blue-800',
  'part-time':  'bg-teal-100 text-teal-800',
  'contract':   'bg-amber-100 text-amber-800',
  'internship': 'bg-purple-100 text-purple-800',
}
const TYPE_LABELS = {
  'full-time': 'Full-time', 'part-time': 'Part-time',
  'contract': 'Contract', 'internship': 'Internship',
}

export default function Landing() {
  const [jobs, setJobs]               = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [dept, setDept]               = useState('')
  const [type, setType]               = useState('')

  useEffect(() => {
    async function load() {
      const [jobsRes, deptRes] = await Promise.all([
        supabase.from('job_postings')
          .select('*, departments(name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase.from('departments').select('id, name').order('name'),
      ])
      setJobs(jobsRes.data || [])
      setDepartments(deptRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchQ = !q || j.title.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q)
    const matchD = !dept || j.department_id === dept
    const matchT = !type || j.type === type
    return matchQ && matchD && matchT
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <Building2 size={21} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">RTCIT</div>
              <div className="text-blue-300 text-xs">Recruitment Portal</div>
            </div>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors font-medium"
          >
            HR Login <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 pb-16 pt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-3 leading-tight">
            Join RTCIT.<br />
            <span className="text-orange-400">Build your career.</span>
          </h1>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
            Explore exciting opportunities at the Regional Technical College of Information Technology.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-10">
            {[
              { icon: Briefcase, label: 'Open Positions', value: jobs.length },
              { icon: Users,     label: 'Departments',    value: departments.length },
              { icon: Award,     label: 'Years of Excellence', value: '25+' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-orange-400 mb-1">
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-blue-300 text-xs">{label}</div>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search job titles or locations…"
                className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <select
              value={dept}
              onChange={e => setDept(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white"
            >
              <option value="">All Types</option>
              {['full-time','part-time','contract','internship'].map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Jobs list */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {loading ? 'Loading…' : `${filtered.length} Open Position${filtered.length !== 1 ? 's' : ''}`}
          </h2>
          {(search || dept || type) && (
            <button
              onClick={() => { setSearch(''); setDept(''); setType('') }}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No positions found</h3>
            <p className="text-slate-500">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-800 flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">RTCIT</span>
          </div>
          <p className="text-xs text-slate-500">
            Regional Technical College of Information Technology · recruitment@rtcit.edu.in
          </p>
        </div>
      </footer>
    </div>
  )
}

function JobCard({ job }) {
  const daysLeft = job.deadline
    ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="group bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Briefcase size={18} className="text-blue-700" />
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[job.type] || 'bg-gray-100 text-gray-700'}`}>
          {TYPE_LABELS[job.type] || job.type}
        </span>
      </div>

      <h3 className="font-bold text-slate-900 mb-1 leading-tight group-hover:text-blue-800 transition-colors">
        {job.title}
      </h3>

      {job.departments?.name && (
        <p className="text-xs text-slate-500 mb-2">{job.departments.name}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mb-4">
        {job.location && (
          <span className="flex items-center gap-1"><MapPin size={11} /> {job.location}</span>
        )}
        {job.deadline && (
          <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : ''}`}>
            <Calendar size={11} />
            {daysLeft !== null && daysLeft > 0
              ? `${daysLeft}d left`
              : daysLeft === 0 ? 'Last day!' : 'Closed'}
          </span>
        )}
        {job.salary_min && job.salary_max && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            ₹{Math.round(job.salary_min / 1000)}K–{Math.round(job.salary_max / 1000)}K/mo
          </span>
        )}
      </div>

      <div className="mt-auto">
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg
            bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
        >
          View & Apply <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
