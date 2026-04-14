import { format, parseISO, formatDistanceToNow } from 'date-fns'

// ── Date helpers ────────────────────────────────────────────
export function formatDate(dateStr, fmt = 'dd MMM yyyy') {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, fmt)
  } catch { return String(dateStr) }
}

export function formatDateTime(dateStr) {
  return formatDate(dateStr, 'dd MMM yyyy, hh:mm a')
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return formatDistanceToNow(d, { addSuffix: true })
  } catch { return String(dateStr) }
}

// ── Misc helpers ─────────────────────────────────────────────
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function truncate(str, n = 80) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Enums & constants ─────────────────────────────────────────

export const ROLES = ['admin', 'hr_manager', 'recruiter', 'viewer']
export const ROLE_LABELS = {
  admin:      'Admin',
  hr_manager: 'HR Manager',
  recruiter:  'Recruiter',
  viewer:     'Viewer',
}
export const ROLE_COLORS = {
  admin:      'bg-purple-100 text-purple-800',
  hr_manager: 'bg-blue-100 text-blue-800',
  recruiter:  'bg-teal-100 text-teal-800',
  viewer:     'bg-gray-100 text-gray-700',
}

export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship']
export const JOB_TYPE_LABELS = {
  'full-time':  'Full-time',
  'part-time':  'Part-time',
  'contract':   'Contract',
  'internship': 'Internship',
}
export const JOB_TYPE_COLORS = {
  'full-time':  'bg-blue-100 text-blue-800',
  'part-time':  'bg-teal-100 text-teal-800',
  'contract':   'bg-amber-100 text-amber-800',
  'internship': 'bg-purple-100 text-purple-800',
}

export const JOB_STATUSES = ['draft', 'active', 'paused', 'closed']
export const JOB_STATUS_COLORS = {
  draft:  'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-amber-100 text-amber-800',
  closed: 'bg-red-100 text-red-800',
}

export const STAGES = ['applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']
export const STAGE_LABELS = {
  applied:     'Applied',
  screening:   'Screening',
  shortlisted: 'Shortlisted',
  interview:   'Interview',
  offer:       'Offer',
  hired:       'Hired',
  rejected:    'Rejected',
  withdrawn:   'Withdrawn',
}
export const STAGE_COLORS = {
  applied:     'bg-gray-100 text-gray-700',
  screening:   'bg-blue-100 text-blue-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  interview:   'bg-amber-100 text-amber-800',
  offer:       'bg-orange-100 text-orange-800',
  hired:       'bg-green-100 text-green-800',
  rejected:    'bg-red-100 text-red-800',
  withdrawn:   'bg-slate-100 text-slate-600',
}

export const PIPELINE_STAGES = ['applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired']

export const EMAIL_TYPES = ['confirm', 'screen', 'interview', 'offer', 'reject']
export const EMAIL_TYPE_LABELS = {
  confirm:   'Application Confirmation',
  screen:    'Screening Invite',
  interview: 'Interview Invitation',
  offer:     'Job Offer',
  reject:    'Application Unsuccessful',
}

export const AI_RECOMMENDATION_COLORS = {
  strong_yes: 'bg-green-100 text-green-800',
  yes:        'bg-teal-100 text-teal-800',
  maybe:      'bg-amber-100 text-amber-800',
  no:         'bg-red-100 text-red-800',
}
export const AI_RECOMMENDATION_LABELS = {
  strong_yes: 'Strong Yes',
  yes:        'Yes',
  maybe:      'Maybe',
  no:         'No',
}
