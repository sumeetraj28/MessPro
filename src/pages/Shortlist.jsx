import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { timeAgo, STAGE_COLORS, STAGE_LABELS, STAGES, AI_RECOMMENDATION_COLORS, AI_RECOMMENDATION_LABELS } from '../lib/utils'
import PageHeader, { Btn, Select, EmptyState, LoadingScreen, Spinner, Badge } from '../components/ui/PageHeader'
import { Sparkles, Star, ThumbsUp, ThumbsDown, AlertTriangle, Settings, ChevronRight, Zap, Info } from 'lucide-react'

export default function Shortlist() {
  const { profile } = useAuth()
  const toast = useToast()

  const [jobs, setJobs]         = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [apps, setApps]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [aiConfig, setAiConfig] = useState(null)
  const [evaluating, setEvaluating] = useState({}) // appId → true/false
  const [sortBy, setSortBy]     = useState('ai_desc')

  useEffect(() => {
    async function loadInit() {
      const [jobsRes, settingsRes] = await Promise.all([
        supabase.from('job_postings').select('id, title, description, requirements').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('settings').select('key, value').in('key', ['ai_enabled', 'anthropic_key_set']),
      ])
      setJobs(jobsRes.data || [])
      const s = {}
      ;(settingsRes.data || []).forEach(r => { s[r.key] = r.value })
      setAiConfig(s)
    }
    loadInit()
  }, [])

  useEffect(() => {
    if (!selectedJob) { setApps([]); return }
    loadApps()
  }, [selectedJob])

  async function loadApps() {
    setLoading(true)
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', selectedJob)
      .not('stage', 'in', '(hired,rejected,withdrawn)')
    setApps(data || [])
    setLoading(false)
  }

  async function runAI(app) {
    const job = jobs.find(j => j.id === selectedJob)
    if (!job) return

    setEvaluating(e => ({ ...e, [app.id]: true }))

    // Check if AI is configured
    if (aiConfig?.ai_enabled !== 'true') {
      // Simulate with demo data for UI demonstration
      const demoScore = Math.floor(Math.random() * 40) + 55 // 55-95
      const demoBreakdown = {
        technical_match:       Math.floor(Math.random() * 30) + 60,
        experience_fit:        Math.floor(Math.random() * 30) + 55,
        communication_quality: Math.floor(Math.random() * 25) + 65,
        recommendation:        demoScore >= 80 ? 'strong_yes' : demoScore >= 70 ? 'yes' : demoScore >= 60 ? 'maybe' : 'no',
        strengths: ['Relevant experience', 'Good communication skills'],
        red_flags: demoScore < 70 ? ['Limited experience in required area'] : [],
        interview_questions: [
          'Tell me about a project where you used these skills.',
          'How do you handle tight deadlines?',
          'What motivates you to join RTCIT?',
        ],
      }
      await supabase.from('applications').update({
        ai_score:        demoScore,
        ai_summary:      `Demo evaluation: Score ${demoScore}/100. Configure ANTHROPIC_API_KEY to enable real AI evaluation.`,
        ai_breakdown:    demoBreakdown,
        ai_evaluated_at: new Date().toISOString(),
      }).eq('id', app.id)

      await logAudit({
        userId: profile?.id, userName: profile?.full_name,
        action: 'AI_EVALUATION', tableName: 'applications', recordId: app.id,
        description: `Demo AI evaluation for ${app.full_name} (score: ${demoScore})`,
      })

      toast.info('Demo AI evaluation complete. Configure API key for real evaluation.')
    } else {
      // Real Claude API call via Supabase Edge Function
      try {
        const { data, error } = await supabase.functions.invoke('ai-evaluate', {
          body: { applicationId: app.id, jobId: selectedJob },
        })
        if (error) throw error
        toast.success(`AI evaluation complete: ${data.overall_score}/100`)
      } catch (err) {
        toast.error('AI evaluation failed. Check Edge Function setup.')
      }
    }

    setEvaluating(e => ({ ...e, [app.id]: false }))
    loadApps()
  }

  async function runAllAI() {
    const unevaluated = apps.filter(a => a.ai_score == null)
    if (!unevaluated.length) { toast.info('All candidates already evaluated.'); return }
    for (const a of unevaluated) {
      await runAI(a)
    }
    toast.success(`Evaluated ${unevaluated.length} candidate(s)`)
  }

  async function moveAllShortlisted(minScore) {
    const candidates = apps.filter(a => a.ai_score != null && a.ai_score >= minScore)
    if (!candidates.length) { toast.info(`No candidates scored ≥ ${minScore}.`); return }
    for (const a of candidates) {
      await supabase.from('applications').update({ stage: 'shortlisted' }).eq('id', a.id)
      await supabase.from('stage_history').insert({
        application_id: a.id, from_stage: a.stage, to_stage: 'shortlisted', changed_by: profile?.id,
        notes: `Auto-shortlisted by AI (score: ${a.ai_score})`,
      })
    }
    toast.success(`Moved ${candidates.length} candidate(s) to Shortlisted`)
    loadApps()
  }

  const sorted = [...apps].sort((a, b) => {
    if (sortBy === 'ai_desc') return (b.ai_score ?? -1) - (a.ai_score ?? -1)
    if (sortBy === 'ai_asc')  return (a.ai_score ?? 999) - (b.ai_score ?? 999)
    if (sortBy === 'recent')  return new Date(b.created_at) - new Date(a.created_at)
    return 0
  })

  const evaluated = apps.filter(a => a.ai_score != null).length
  const avgScore  = evaluated ? Math.round(apps.filter(a => a.ai_score != null).reduce((s, a) => s + a.ai_score, 0) / evaluated) : null

  return (
    <div>
      <PageHeader
        title="AI Shortlisting"
        subtitle="Use AI to evaluate and rank candidates for your job postings"
      />

      {/* AI Config Banner */}
      {aiConfig?.ai_enabled !== 'true' && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">AI running in demo mode</p>
            <p className="text-xs text-amber-700">
              Set <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> in Supabase Edge Function secrets
              and enable AI in <Link to="/settings" className="underline">Settings</Link> for real Claude AI evaluation.
            </p>
          </div>
        </div>
      )}

      {/* Job selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Select Job Posting"
            value={selectedJob}
            onChange={e => setSelectedJob(e.target.value)}
            className="flex-1 min-w-56"
          >
            <option value="">Choose a job…</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </Select>

          {selectedJob && (
            <>
              <Select
                label="Sort by"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-44"
              >
                <option value="ai_desc">AI Score: High → Low</option>
                <option value="ai_asc">AI Score: Low → High</option>
                <option value="recent">Most Recent</option>
              </Select>
              <div className="flex gap-2">
                <Btn variant="blue" onClick={runAllAI} disabled={loading}>
                  <Zap size={15} /> Evaluate All
                </Btn>
                <div className="relative group">
                  <Btn variant="primary" disabled={!evaluated}>
                    <ThumbsUp size={15} /> Shortlist Top…
                  </Btn>
                  <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 hidden group-hover:block w-48">
                    {[60, 70, 75, 80].map(n => (
                      <button
                        key={n}
                        onClick={() => moveAllShortlisted(n)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                      >
                        Score ≥ {n} ({apps.filter(a => a.ai_score >= n).length} candidates)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stats row */}
        {selectedJob && apps.length > 0 && (
          <div className="flex gap-6 mt-5 pt-5 border-t border-slate-100 flex-wrap">
            <Stat label="Total Candidates" value={apps.length} />
            <Stat label="Evaluated" value={`${evaluated}/${apps.length}`} />
            {avgScore && <Stat label="Avg AI Score" value={`${avgScore}/100`} highlight />}
            <Stat label="Shortlisted" value={apps.filter(a => a.stage === 'shortlisted').length} />
          </div>
        )}
      </div>

      {/* Candidates */}
      {!selectedJob ? (
        <EmptyState icon={Sparkles} title="Select a job to begin" message="Choose a job posting above to view and evaluate candidates with AI." />
      ) : loading ? (
        <LoadingScreen />
      ) : apps.length === 0 ? (
        <EmptyState icon={Sparkles} title="No candidates yet" message="No applications found for this job posting." />
      ) : (
        <div className="space-y-3">
          {sorted.map((app, idx) => (
            <CandidateCard
              key={app.id}
              app={app}
              rank={sortBy.startsWith('ai') ? idx + 1 : null}
              onEvaluate={() => runAI(app)}
              evaluating={evaluating[app.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-black ${highlight ? 'text-orange-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function CandidateCard({ app, rank, onEvaluate, evaluating }) {
  const hasAI  = app.ai_score != null
  const rec    = app.ai_breakdown?.recommendation
  const recColor = AI_RECOMMENDATION_COLORS[rec] || 'bg-gray-100 text-gray-700'
  const recLabel = AI_RECOMMENDATION_LABELS[rec]

  const scoreColor = !hasAI ? 'text-slate-400'
    : app.ai_score >= 75 ? 'text-green-600'
    : app.ai_score >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex items-start gap-5 transition-all
      ${hasAI && app.ai_score >= 75 ? 'border-green-200' : 'border-slate-200'}`}>
      {/* Rank */}
      {rank && (
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
          #{rank}
        </div>
      )}

      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800 font-black shrink-0">
        {app.full_name?.charAt(0)?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-slate-900">{app.full_name}</h3>
            <p className="text-xs text-slate-500">
              {app.current_role_title || '—'}{app.current_company ? ` · ${app.current_company}` : ''} · {app.experience_years || 0}yr exp
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[app.stage]}`}>
              {STAGE_LABELS[app.stage]}
            </span>
          </div>
        </div>

        {/* AI scores */}
        {hasAI && app.ai_breakdown && (
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              ['Technical', app.ai_breakdown.technical_match],
              ['Experience', app.ai_breakdown.experience_fit],
              ['Communication', app.ai_breakdown.communication_quality],
            ].map(([label, val]) => val != null && (
              <MiniScore key={label} label={label} value={val} />
            ))}
          </div>
        )}

        {/* Summary */}
        {app.ai_summary && (
          <p className="text-xs text-slate-500 mt-2 italic">{app.ai_summary}</p>
        )}

        {/* Strengths / Flags */}
        {hasAI && app.ai_breakdown && (
          <div className="flex flex-wrap gap-3 mt-2">
            {app.ai_breakdown.strengths?.slice(0, 2).map((s, i) => (
              <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ThumbsUp size={10} /> {s}
              </span>
            ))}
            {app.ai_breakdown.red_flags?.slice(0, 1).map((f, i) => (
              <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle size={10} /> {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score + actions */}
      <div className="flex flex-col items-end gap-3 shrink-0">
        <div className="text-center">
          <div className={`text-3xl font-black ${scoreColor}`}>
            {hasAI ? app.ai_score : '—'}
          </div>
          <div className="text-xs text-slate-400">{hasAI ? '/100' : 'no AI'}</div>
        </div>
        {rec && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${recColor}`}>{recLabel}</span>
        )}
        <div className="flex gap-2">
          <Btn variant={hasAI ? 'secondary' : 'blue'} size="sm" onClick={onEvaluate} disabled={evaluating}>
            {evaluating ? <Spinner size="sm" /> : <Sparkles size={13} />}
            {hasAI ? 'Re-run' : 'Evaluate'}
          </Btn>
          <Link
            to={`/applications/${app.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 font-medium"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function MiniScore({ label, value }) {
  const color = value >= 75 ? 'text-green-600 bg-green-50' : value >= 55 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
  return (
    <div className={`text-xs rounded-lg px-2 py-1 ${color}`}>
      <span className="font-bold">{value}</span> <span className="opacity-70">{label}</span>
    </div>
  )
}
