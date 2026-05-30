// ============================================================
// MediConnect — DashboardLayout.jsx   (REPLACE existing)
// frontend/src/components/DashboardLayout.jsx
// Fixes: (1) role now a coloured PILL, not faint grey text.
//        (2) log-out gets an icon + a real user card (avatar).
// Requires: lucide-react, and ../lib/ui (Avatar / roleToken).
// ============================================================
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { roleToken } from '../lib/ui'
import { Avatar } from './ui'
import NotificationBell from './NotificationBell'

// Legacy accent props (sky/emerald/violet) → design-system role names.
const ACCENT_TO_ROLE = { sky: 'patient', emerald: 'doctor', violet: 'admin' }

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-label="MediConnect">
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#mc)" />
      <path d="M10 25h6l3-7 4 14 3-9 2.5 5H38" stroke="#fff" strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round" />
      <defs><linearGradient id="mc" x1="2" y1="2" x2="46" y2="46">
        <stop stopColor="#2e6bf0" /><stop offset="1" stopColor="#0d8276" />
      </linearGradient></defs>
    </svg>
  )
}

function Wordmark() {
  return (
    <span className="text-lg font-extrabold tracking-[-0.03em] text-ink-900">
      Medi<span className="text-brand-600">Connect</span>
    </span>
  )
}

// Coloured role pill — uses the role accent (blue/teal/indigo).
function RolePill({ role, label }) {
  const a = roleToken(role)
  return (
    <span className={`mt-3 inline-flex w-max items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${a.active}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${a.solid}`} />
      {label}
    </span>
  )
}

export default function DashboardLayout({ accent = 'sky', roleLabel, navItems }) {
  const { user, logout } = useAuth()
  const role = ACCENT_TO_ROLE[accent] || accent
  const a = roleToken(role)

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="hidden w-64 flex-col border-r border-ink-200 bg-white px-4 py-6 md:flex">
        <div className="mb-7 px-2">
          <div className="flex items-center gap-2">
            <Logo />
            <Wordmark />
          </div>
          <RolePill role={role} label={roleLabel} />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  isActive ? a.active
                    : 'border-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* user card + log out */}
        <div className="mt-6 border-t border-ink-200 pt-4">
          <div className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-ink-50 p-2.5">
            <Avatar name={user?.full_name} id={user?.email} size={38} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-ink-900">
                {user?.full_name || 'Account'}
              </p>
              <p className="truncate text-[11.5px] text-ink-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-md border border-ink-300 bg-white px-3 py-2.5 text-[13.5px] font-semibold text-ink-700 transition hover:border-danger-bd hover:bg-danger-bg hover:text-danger"
          >
            <LogOut size={16} strokeWidth={1.9} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Desktop top header */}
        <header className="hidden h-14 items-center justify-end border-b border-ink-200 bg-white px-6 md:flex">
          <NotificationBell />
        </header>

        {/* Mobile top header */}
        <header className="flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Logo />
            <Wordmark />
            <span className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${a.active}`}>
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={logout}
              aria-label="Log out"
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-danger-bd hover:bg-danger-bg hover:text-danger"
            >
              <LogOut size={14} strokeWidth={1.9} />
              Log out
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-ink-200 bg-white px-4 py-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium ${
                  isActive ? a.active : 'border-transparent text-ink-600 hover:bg-ink-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
