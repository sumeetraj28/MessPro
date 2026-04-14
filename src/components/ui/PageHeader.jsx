export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', type = 'button', disabled = false, className = '' }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' }
  const variants = {
    primary:   'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
    blue:      'bg-blue-800 text-white hover:bg-blue-900 focus:ring-blue-600',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success:   'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant] || variants.primary} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700
          disabled:bg-slate-50 disabled:text-slate-500 placeholder:text-slate-400"
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <select
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700
          disabled:bg-slate-50 bg-white"
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700
          resize-none placeholder:text-slate-400"
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-700',
    green:  'bg-green-100 text-green-800',
    red:    'bg-red-100 text-red-800',
    blue:   'bg-blue-100 text-blue-800',
    amber:  'bg-amber-100 text-amber-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    teal:   'bg-teal-100 text-teal-800',
    slate:  'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon size={48} className="text-slate-300 mx-auto mb-4" />}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {message && <p className="text-sm text-slate-500 mb-4">{message}</p>}
      {action}
    </div>
  )
}

export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' }
  return (
    <div className={`${s[size]} border-orange-500 border-t-transparent rounded-full animate-spin`} />
  )
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )
}
