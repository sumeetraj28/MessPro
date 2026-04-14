import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Building2, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

  const { signIn } = useAuth()
  const toast      = useToast()
  const navigate   = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { toast.error('Please enter email and password'); return }
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">RTCIT</div>
            <div className="text-blue-300 text-sm">Recruitment Portal</div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Hire the best.<br />Build the future.
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            AI-powered recruitment platform for RTCIT — post jobs, collect applications,
            and shortlist top candidates with intelligence.
          </p>
        </div>

        <div className="flex gap-6">
          {[['AI Shortlisting', 'Rank candidates automatically'],
            ['Change Log', 'Full audit trail'],
            ['Multi-user', 'Role-based access']].map(([t, d]) => (
            <div key={t}>
              <div className="text-white font-semibold text-sm">{t}</div>
              <div className="text-blue-300 text-xs">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-800 flex items-center justify-center">
              <Building2 size={19} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900">RTCIT</div>
              <div className="text-xs text-slate-500">Recruitment Portal</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to access the recruitment dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@rtcit.edu.in"
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600
                disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <Link to="/" className="text-sm text-blue-700 hover:text-blue-800 font-medium">
              ← View Public Job Board
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
