import { Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, HelpCircle } from 'lucide-react'
import { AI_RECOMMENDATION_COLORS, AI_RECOMMENDATION_LABELS } from '../../lib/utils'

function ScoreBar({ label, value }) {
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{value}/100</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function AIScoreCard({ application }) {
  const { ai_score, ai_summary, ai_breakdown, ai_evaluated_at } = application

  if (!ai_score && ai_score !== 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">AI Evaluation</h3>
        </div>
        <p className="text-xs text-slate-500">
          No AI evaluation has been run for this candidate yet.
          Go to <strong>AI Shortlist</strong> to run an evaluation.
        </p>
      </div>
    )
  }

  const rec = ai_breakdown?.recommendation
  const recColor = AI_RECOMMENDATION_COLORS[rec] || 'bg-gray-100 text-gray-700'
  const recLabel = AI_RECOMMENDATION_LABELS[rec] || rec || '—'

  const ScoreColor = ai_score >= 75 ? 'text-green-600' : ai_score >= 50 ? 'text-amber-600' : 'text-red-600'
  const ScoreBg   = ai_score >= 75 ? 'bg-green-50 border-green-200' : ai_score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className={`border rounded-xl p-5 ${ScoreBg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-700">AI Evaluation</h3>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${recColor}`}>
          {recLabel}
        </span>
      </div>

      {/* Big score */}
      <div className="flex items-end gap-1 mb-4">
        <span className={`text-5xl font-black ${ScoreColor}`}>{ai_score}</span>
        <span className="text-slate-400 text-lg mb-1">/100</span>
      </div>

      {/* Breakdown bars */}
      {ai_breakdown && (
        <div className="space-y-2.5 mb-4">
          {ai_breakdown.technical_match !== undefined && (
            <ScoreBar label="Technical Match" value={ai_breakdown.technical_match} />
          )}
          {ai_breakdown.experience_fit !== undefined && (
            <ScoreBar label="Experience Fit" value={ai_breakdown.experience_fit} />
          )}
          {ai_breakdown.communication_quality !== undefined && (
            <ScoreBar label="Communication" value={ai_breakdown.communication_quality} />
          )}
        </div>
      )}

      {/* Summary */}
      {ai_summary && (
        <p className="text-xs text-slate-600 mb-4 italic">&ldquo;{ai_summary}&rdquo;</p>
      )}

      {/* Strengths */}
      {ai_breakdown?.strengths?.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-semibold text-green-700 mb-1">
            <ThumbsUp size={12} /> Strengths
          </div>
          <ul className="space-y-0.5">
            {ai_breakdown.strengths.map((s, i) => (
              <li key={i} className="text-xs text-slate-600 flex gap-1">
                <span className="text-green-500 mt-0.5">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red flags */}
      {ai_breakdown?.red_flags?.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-semibold text-red-700 mb-1">
            <AlertTriangle size={12} /> Red Flags
          </div>
          <ul className="space-y-0.5">
            {ai_breakdown.red_flags.map((f, i) => (
              <li key={i} className="text-xs text-slate-600 flex gap-1">
                <span className="text-red-500 mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interview questions */}
      {ai_breakdown?.interview_questions?.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 mb-1">
            <HelpCircle size={12} /> Suggested Interview Questions
          </div>
          <ul className="space-y-0.5">
            {ai_breakdown.interview_questions.map((q, i) => (
              <li key={i} className="text-xs text-slate-600 flex gap-1">
                <span className="text-blue-500 mt-0.5">{i + 1}.</span> {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3">
        Evaluated by Claude AI · {ai_evaluated_at ? new Date(ai_evaluated_at).toLocaleDateString() : '—'}
      </p>
    </div>
  )
}
