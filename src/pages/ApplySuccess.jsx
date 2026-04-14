import { Link, useLocation } from 'react-router-dom'
import { CheckCircle, Home, Search } from 'lucide-react'

export default function ApplySuccess() {
  const { state } = useLocation()
  const jobTitle  = state?.jobTitle || 'the position'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={34} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h1>
        <p className="text-slate-600 mb-1">
          Your application for <strong>{jobTitle}</strong> has been received.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Our recruitment team will review your application and get back to you within 7–10 working days.
          Please check your email for a confirmation.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
              bg-blue-800 text-white font-medium text-sm hover:bg-blue-900 transition-colors"
          >
            <Home size={16} /> Back to Home
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
              border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <Search size={16} /> Browse More Jobs
          </Link>
        </div>
      </div>
    </div>
  )
}
