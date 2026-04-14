import { useState, useEffect } from 'react'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import PageHeader, { Btn, Input, LoadingScreen } from '../components/ui/PageHeader'
import { Settings as SettingsIcon, Building2, Sparkles, Mail, Save, CheckCircle, Info } from 'lucide-react'

const KEYS = ['institute_name', 'institute_tagline', 'contact_email', 'portal_title', 'ai_enabled', 'email_enabled']

export default function Settings() {
  const { profile } = useAuth()
  const toast = useToast()

  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    supabase.from('settings').select('key, value').in('key', KEYS).then(({ data }) => {
      const s = {}
      ;(data || []).forEach(r => { s[r.key] = r.value })
      setSettings(s)
      setLoading(false)
    })
  }, [])

  function set(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }
      await logAudit({
        userId: profile?.id, userName: profile?.full_name,
        action: 'UPDATE_SETTINGS', tableName: 'settings',
        description: 'Portal settings updated',
      })
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Configure the RTCIT Recruitment Portal" />

      {/* Institute Info */}
      <Card icon={Building2} title="Institute Information">
        <div className="space-y-4">
          <Input
            label="Institute Name"
            value={settings.institute_name || ''}
            onChange={e => set('institute_name', e.target.value)}
            placeholder="RTCIT"
          />
          <Input
            label="Tagline"
            value={settings.institute_tagline || ''}
            onChange={e => set('institute_tagline', e.target.value)}
            placeholder="Regional Technical College of Information Technology"
          />
          <Input
            label="Recruitment Contact Email"
            type="email"
            value={settings.contact_email || ''}
            onChange={e => set('contact_email', e.target.value)}
            placeholder="recruitment@rtcit.edu.in"
          />
          <Input
            label="Portal Title"
            value={settings.portal_title || ''}
            onChange={e => set('portal_title', e.target.value)}
            placeholder="RTCIT Recruitment Portal"
          />
        </div>
      </Card>

      {/* AI Settings */}
      <Card icon={Sparkles} title="AI Evaluation">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">Enable AI Shortlisting</p>
              <p className="text-xs text-slate-500 mt-0.5">Use Claude AI to evaluate and score candidates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ai_enabled === 'true'}
                onChange={e => set('ai_enabled', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-orange-400 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <span>
              To enable real AI evaluation, add <code className="bg-blue-100 px-1 rounded">ANTHROPIC_API_KEY</code> to your
              Supabase Edge Function secrets and deploy the <code className="bg-blue-100 px-1 rounded">ai-evaluate</code> function.
            </span>
          </div>
        </div>
      </Card>

      {/* Email Settings */}
      <Card icon={Mail} title="Email Integration">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">Enable Email Sending</p>
              <p className="text-xs text-slate-500 mt-0.5">Send actual emails via Resend API</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_enabled === 'true'}
                onChange={e => set('email_enabled', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-orange-400 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <span>
              To enable email delivery, add <code className="bg-blue-100 px-1 rounded">RESEND_API_KEY</code> and
              <code className="bg-blue-100 px-1 rounded">RESEND_FROM_EMAIL</code> to your Supabase Edge Function secrets
              and deploy the <code className="bg-blue-100 px-1 rounded">send-email</code> function.
            </span>
          </div>
        </div>
      </Card>

      <Btn variant="primary" onClick={save} disabled={saving} size="lg">
        {saving ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save size={17} />
        )}
        {saving ? 'Saving…' : 'Save Settings'}
      </Btn>
    </div>
  )
}

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon size={16} className="text-blue-700" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}
