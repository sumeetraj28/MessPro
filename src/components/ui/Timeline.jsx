import { formatDateTime, timeAgo } from '../../lib/utils'

export default function Timeline({ events = [] }) {
  if (!events.length) {
    return <p className="text-sm text-slate-500 text-center py-6">No activity recorded yet.</p>
  }

  return (
    <ol className="relative border-l border-slate-200 space-y-0">
      {events.map((ev, i) => (
        <TimelineEvent key={ev.id || i} event={ev} />
      ))}
    </ol>
  )
}

function TimelineEvent({ event }) {
  const { icon: Icon, iconBg = 'bg-slate-200', iconColor = 'text-slate-600',
          title, description, timestamp, user } = event
  return (
    <li className="mb-6 ml-6">
      <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${iconBg}`}>
        {Icon && <Icon size={13} className={iconColor} />}
      </span>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-800">{title}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          {user && <p className="text-xs text-blue-700 mt-0.5">{user}</p>}
        </div>
        <time className="text-xs text-slate-400 whitespace-nowrap" title={formatDateTime(timestamp)}>
          {timeAgo(timestamp)}
        </time>
      </div>
    </li>
  )
}
