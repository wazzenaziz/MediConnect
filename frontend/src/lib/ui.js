// ============================================================
// MediConnect — lib/ui.js   (NEW FILE)
// Place at: frontend/src/lib/ui.js
// Centralises status colours, role accents, and avatar logic
// so they live in ONE place instead of being copy-pasted.
// ============================================================

// ---- Status tokens -----------------------------------------
// Replaces the duplicated STATUS_TONE maps in
// admin/Appointments.jsx, the inline ternary in DoctorDashboard.jsx,
// and the patient appointment status colours.
// Returns Tailwind classes built from the new @theme tokens.
export const STATUS = {
  pending:   { label: 'Pending',   cls: 'bg-warning-bg text-warning border-warning-bd' },
  confirmed: { label: 'Confirmed', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
  completed: { label: 'Completed', cls: 'bg-success-bg text-success border-success-bd' },
  cancelled: { label: 'Cancelled', cls: 'bg-danger-bg text-danger border-danger-bd' },
}
export function statusToken(status) {
  return STATUS[status] || STATUS.pending
}

// ---- Role accents ------------------------------------------
// Replaces the accentClasses object in DashboardLayout.jsx.
// patient = brand (blue), doctor = teal, admin = indigo.
export const ROLE = {
  patient: { pill: 'text-brand-600',  active: 'bg-brand-50 text-brand-700 border-brand-200',   solid: 'bg-brand-600' },
  doctor:  { pill: 'text-teal-600',   active: 'bg-teal-50 text-teal-700 border-teal-200',       solid: 'bg-teal-600' },
  admin:   { pill: 'text-indigo-600', active: 'bg-indigo-50 text-indigo-700 border-indigo-200', solid: 'bg-indigo-600' },
}
export function roleToken(role) {
  return ROLE[role] || ROLE.patient
}

// ---- Triage confidence -------------------------------------
// Replaces confidenceColor()/confidenceLabel() in Triage.jsx.
export function confidence(c) {
  if (c >= 0.85) return { label: 'High confidence',   bar: 'bg-success' }
  if (c >= 0.6)  return { label: 'Medium confidence', bar: 'bg-warning' }
  return { label: 'Low confidence', bar: 'bg-danger' }
}

// ---- Avatars -----------------------------------------------
// Use everywhere a person is shown (admin tables, doctor "today"
// widget, patient lists) INSTEAD of raw UUIDs like #a1b2c3d4.
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Deterministic colour from a string (name or id) so the same
// person always gets the same avatar colour.
const AVATAR_COLORS = ['#1b54d6', '#0d8276', '#5a37d6', '#e8442c', '#0e9f6e', '#d9920a']
export function avatarColor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
