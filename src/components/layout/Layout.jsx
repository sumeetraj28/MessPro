import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const TITLES = {
  '/dashboard':    'Dashboard',
  '/admin/jobs':   'Job Postings',
  '/applications': 'Applications',
  '/shortlist':    'AI Shortlisting',
  '/emails':       'Email Management',
  '/changelog':    'Change Log & Audit Trail',
  '/users':        'User Management',
  '/settings':     'Settings',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  // Match dynamic routes like /applications/:id
  let title = TITLES[location.pathname]
  if (!title) {
    if (location.pathname.startsWith('/applications/')) title = 'Application Detail'
    else if (location.pathname.startsWith('/admin/jobs/')) title = 'Job Posting'
    else title = 'RTCIT Recruitment'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300
          ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
      >
        <Header title={title} onMenuClick={() => setCollapsed(c => !c)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
