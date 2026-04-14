import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatsCard({ title, value, subValue, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-500',   text: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-500',  text: 'text-green-600' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-500',    text: 'text-red-600' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-500',  text: 'text-amber-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-600' },
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-500', text: 'text-indigo-600' },
  }
  const c = colors[color] || colors.blue
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-slate-500'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-lg ${c.icon} flex items-center justify-center shrink-0`}>
        {Icon && <Icon size={22} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
        {(subValue || trend !== undefined) && (
          <div className="flex items-center gap-1 mt-1">
            {trend !== undefined && <TrendIcon size={13} className={trendColor} />}
            <span className="text-xs text-slate-500">{subValue}</span>
          </div>
        )}
      </div>
    </div>
  )
}
