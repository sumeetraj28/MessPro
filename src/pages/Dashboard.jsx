import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, timeAgo, STAGE_COLORS, STAGE_LABELS } from '../lib/utils'
import StatsCard from '../components/ui/StatsCard'
import { LoadingScreen } from '../components/ui/PageHeader'
import {
  FileText, Briefcase, Sparkles, UserCheck,
  ArrowRight, TrendingUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const PIPELINE_STAGES = ['applied','screening','shortlisted','interview','offer','hired']
const STAGE_CHART_COLORS = {
  applied:     '#94a3b8',
  screening:   '#3b82f6',
  shortlisted: '#6366f1',
  interview:   '#f59e0b',
  offer:       '#f97316',
  hired:       '#22c55e',
  rejected:    '#ef4444',
  withdrawn:   '#64748b',
}

export default function Dashboard() {
  const [stats, setStats]   = useState(null)
  const [recent, setRecent] = useState([])
  const [byStage, setByStage] = useState([])
  const [byJob,   setByJob]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [appsRes, jobsRes, recentRes] = await Promise.all([
        supabase.from('applications').select('id, stage, ai_score, created_at'),
        supabase.from('job_postings').select('id, title, status'),
        supabase.from('applications')
          .select('id, full_name, email, stage, created_at, job_postings(title)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      const apps = appsRes.data || []
      const jobs = jobsRes.data || []

      // Stats
      const today = new Date().toISOString().split('T')[0]
      setStats({
        total:       apps.length,
        activeJobs:  jobs.filter(j => j.status === 'active').length,
        shortlisted: apps.filter(a => a.stage === 'shortlisted').length,
        hired:       apps.filter(a => a.stage === 'hired').length,
        aiEvaluated: apps.filter(a => a.ai_score != null).length,
        todayApps:   apps.filter(a => a.created_at?.startsWith(today)).length,
      })

      // Pipeline chart
      const stageCounts = PIPELINE_STAGES.map(s => ({
        name: STAGE_LABELS[s] || s,
        count: apps.filter(a => a.stage === s).length,
        fill: STAGE_CHART_COLORS[s],
      }))
      setByStage(stageCounts)

      // By job (top 6)
      const jobMap = {}
      apps.forEach(a => {
        const job = jobs.find(j => j.id === a.job_id)
        if (!job) return
        jobMap[job.title] = (jobMap[job.title] || 0) + 1
      })
      setByJob(
        Object.entries(jobMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 19) + '…' : name, count }))
      )

      setRecent(recentRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Applications"
          value={stats.total}
          subValue={`${stats.todayApps} new today`}
          icon={FileText}
          color="blue"
          trend={stats.todayApps > 0 ? 1 : 0}
        />
        <StatsCard
          title="Active Jobs"
          value={stats.activeJobs}
          subValue="Open positions"
          icon={Briefcase}
          color="indigo"
        />
        <StatsCard
          title="Shortlisted"
          value={stats.shortlisted}
          subValue="In shortlist stage"
          icon={Sparkles}
          color="amber"
        />
        <StatsCard
          title="Hired"
          value={stats.hired}
          subValue={`${stats.aiEvaluated} AI-evaluated`}
          icon={UserCheck}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-500" />
            Application Pipeline
          </h3>
          {byStage.every(s => s.count === 0) ? (
            <p className="text-sm text-slate-500 text-center py-8">No applications yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStage} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v => [v, 'Applications']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byStage.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Applications by job */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Briefcase size={16} className="text-blue-700" />
            Applications by Job
          </h3>
          {byJob.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byJob} margin={{ left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [v, 'Applications']} />
                <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent applications */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Recent Applications</h3>
          <Link to="/applications" className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No applications yet.</p>
          ) : recent.map(app => (
            <Link
              key={app.id}
              to={`/applications/${app.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                {app.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-800">
                  {app.full_name}
                </div>
                <div className="text-xs text-slate-500 truncate">{app.job_postings?.title || '—'}</div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[app.stage] || 'bg-gray-100 text-gray-700'}`}>
                  {STAGE_LABELS[app.stage] || app.stage}
                </span>
                <div className="text-xs text-slate-400 mt-1">{timeAgo(app.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
