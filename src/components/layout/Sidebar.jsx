import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, FileText, Sparkles,
  Mail, ScrollText, Settings, UserCog, LogOut,
  Building2, Menu, X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/jobs',   icon: Briefcase,       label: 'Job Postings' },
  { to: '/applications', icon: FileText,        label: 'Applications' },
  { to: '/shortlist',    icon: Sparkles,        label: 'AI Shortlist', tip: 'AI-powered ranking' },
  { to: '/emails',       icon: Mail,            label: 'Emails' },
  { to: '/changelog',    icon: ScrollText,      label: 'Change Log' },
]

const ADMIN_NAV = [
  { to: '/users',    icon: UserCog,  label: 'Users' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-300
          bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-2xl
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-blue-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <Building2 size={17} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">RTCIT</div>
                <div className="text-xs text-blue-300 leading-tight">Recruitment</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg hover:bg-blue-700 transition-colors ml-auto"
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-0.5">
            {NAV.map(({ to, icon: Icon, label, tip }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-blue-200 hover:bg-blue-700 hover:text-white'}`
                }
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{label}</div>
                    {tip && <div className="text-xs text-blue-400 truncate">{tip}</div>}
                  </div>
                )}
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <>
              <div className={`mt-4 mb-2 ${collapsed ? 'border-t border-blue-700' : 'px-3'}`}>
                {!collapsed && (
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Admin</span>
                )}
              </div>
              <div className="space-y-0.5">
                {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                      ${isActive
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-blue-200 hover:bg-blue-700 hover:text-white'}`
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User + Sign out */}
        <div className="border-t border-blue-700 p-3">
          {!collapsed && (
            <div className="mb-2 px-2">
              <div className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</div>
              <div className="text-xs text-blue-400 capitalize">{profile?.role?.replace('_', ' ') || 'viewer'}</div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
              text-blue-300 hover:bg-red-900/40 hover:text-red-300 transition-colors"
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
