import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/layout/Layout'

// Public pages
import Landing      from './pages/Landing'
import JobDetail    from './pages/JobDetail'
import Apply        from './pages/Apply'
import ApplySuccess from './pages/ApplySuccess'
import Login        from './pages/Login'

// Admin pages
import Dashboard          from './pages/Dashboard'
import Jobs               from './pages/Jobs'
import Applications       from './pages/Applications'
import ApplicationDetail  from './pages/ApplicationDetail'
import Shortlist          from './pages/Shortlist'
import Emails             from './pages/Emails'
import ChangeLog          from './pages/ChangeLog'
import Users              from './pages/Users'
import Settings           from './pages/Settings'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

// Route guard: redirect to /login if unauthenticated
function PrivateRoute({ adminOnly = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              {/* ── Public ──────────────────────────────────── */}
              <Route path="/"                    element={<Landing />} />
              <Route path="/jobs/:id"            element={<JobDetail />} />
              <Route path="/apply/:id"           element={<Apply />} />
              <Route path="/apply/:id/success"   element={<ApplySuccess />} />
              <Route path="/login"               element={<Login />} />

              {/* ── Admin (authenticated, with Layout) ──────── */}
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard"              element={<Dashboard />} />
                  <Route path="/admin/jobs"             element={<Jobs />} />
                  <Route path="/applications"           element={<Applications />} />
                  <Route path="/applications/:id"       element={<ApplicationDetail />} />
                  <Route path="/shortlist"              element={<Shortlist />} />
                  <Route path="/emails"                 element={<Emails />} />
                  <Route path="/changelog"              element={<ChangeLog />} />

                  {/* Admin-only */}
                  <Route element={<PrivateRoute adminOnly />}>
                    <Route path="/users"    element={<Users />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>
              </Route>

              {/* ── Fallback ────────────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
