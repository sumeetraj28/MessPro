import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur || 5000),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }) {
  const configs = {
    success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon_color: 'text-green-500' },
    error:   { icon: XCircle,     bg: 'bg-red-50 border-red-200',     text: 'text-red-800',   icon_color: 'text-red-500' },
    warning: { icon: AlertCircle, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon_color: 'text-amber-500' },
    info:    { icon: Info,        bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-800',  icon_color: 'text-blue-500' },
  }
  const cfg = configs[toast.type] || configs.info
  const Icon = cfg.icon
  return (
    <div className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm w-full ${cfg.bg}`}>
      <Icon size={18} className={`${cfg.icon_color} mt-0.5 shrink-0`} />
      <span className={`text-sm flex-1 ${cfg.text}`}>{toast.message}</span>
      <button onClick={onClose} className={`${cfg.icon_color} hover:opacity-70 shrink-0`}><X size={14} /></button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
