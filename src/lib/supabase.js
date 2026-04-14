import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Audit log helper — call this whenever you mutate data
export async function logAudit({ userId, userName, action, tableName, recordId, oldValues, newValues, description }) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      user_name: userName,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues || null,
      new_values: newValues || null,
      description,
    })
  } catch (e) {
    // audit log failure should not block main operations
    console.error('Audit log error:', e)
  }
}
