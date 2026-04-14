import { Menu, Bell, Building2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { initials } from '../../lib/utils'

export default function Header({ title, onMenuClick }) {
  const { profile } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-bold">
            {initials(profile?.full_name || profile?.email || 'U')}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-slate-900 leading-none">{profile?.full_name || 'User'}</div>
            <div className="text-xs text-slate-500 capitalize">{profile?.role?.replace('_', ' ') || 'viewer'}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
