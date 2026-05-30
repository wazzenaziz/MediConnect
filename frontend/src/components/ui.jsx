// ============================================================
// MediConnect — components/ui.jsx   (NEW FILE)
// Place at: frontend/src/components/ui.jsx
// The shared primitive library. Replaces ad-hoc button/card/
// badge markup scattered across pages with ONE source of truth.
// Pure Tailwind classes referencing the new @theme tokens.
// ============================================================
import { statusToken, initials, avatarColor } from '../lib/ui'

// ---- Button -------------------------------------------------
// Variants: primary | secondary | ghost | danger | coral
// Replaces every hand-written <button className="rounded-lg bg-sky-600…">
const BTN = {
  base: 'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition ' +
        'disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none',
  size: { sm: 'text-[13px] px-3 py-1.5', md: 'text-sm px-[18px] py-2.5', lg: 'text-base px-6 py-3' },
  variant: {
    primary:   'bg-brand-600 text-white shadow-xs hover:bg-brand-700',
    secondary: 'bg-white text-ink-800 border border-ink-300 hover:bg-ink-50 hover:border-ink-400',
    ghost:     'bg-transparent text-brand-600 hover:bg-brand-50',
    danger:    'bg-white text-danger border border-danger-bd hover:bg-danger-bg',
    coral:     'bg-coral-500 text-white hover:bg-coral-600',
  },
}
export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <button className={`${BTN.base} ${BTN.size[size]} ${BTN.variant[variant]} ${className}`} {...props} />
}

// ---- Card ---------------------------------------------------
export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`bg-white border border-ink-200 rounded-lg shadow-card ${className}`} {...props}>
      {children}
    </Tag>
  )
}

// ---- StatusBadge (appointments) -----------------------------
// Colour + dot + label  ->  not colour-only (accessibility).
export function StatusBadge({ status }) {
  const t = statusToken(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${t.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {t.label}
    </span>
  )
}

// ---- Avatar (use instead of #uuid) --------------------------
export function Avatar({ name, id, size = 32 }) {
  const seed = name || id || ''
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: avatarColor(seed) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

// Person cell for tables/lists: avatar + name + sub line.
export function Person({ name, sub, id }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} id={id} />
      <div className="min-w-0">
        <div className="font-semibold text-ink-900 truncate">{name || 'Unknown'}</div>
        {sub && <div className="text-xs text-ink-500 truncate">{sub}</div>}
      </div>
    </div>
  )
}

// ---- Skeleton (loading) -------------------------------------
// Replaces "Loading…" text. Compose a few to match final layout.
export function Skeleton({ className = '', w, h = 14 }) {
  return <div className={`mc-skeleton rounded-md ${className}`} style={{ width: w, height: h }} />
}
export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton w={32} h={32} className="!rounded-full" />
          <Skeleton w={`${50 + (i % 3) * 15}%`} />
        </div>
      ))}
    </div>
  )
}

// ---- EmptyState ---------------------------------------------
// Replaces dashed-border grey boxes. Pass an icon (Lucide node).
export function EmptyState({ icon, title, hint, action }) {
  return (
    <Card className="p-10 text-center">
      {icon && <div className="mx-auto mb-3 text-ink-300 flex justify-center">{icon}</div>}
      <p className="font-semibold text-ink-800">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  )
}
