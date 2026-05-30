import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleToken } from '../lib/ui'
import NotificationBell from './NotificationBell'

// Legacy accent props (sky/emerald/violet) → design-system role names.
const ACCENT_TO_ROLE = { sky: 'patient', emerald: 'doctor', violet: 'admin' }

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-label="MediConnect">
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#mc)" />
      <path
        d="M10 25h6l3-7 4 14 3-9 2.5 5H38"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="mc" x1="2" y1="2" x2="46" y2="46">
          <stop stopColor="#2e6bf0" />
          <stop offset="1" stopColor="#0d8276" />
        </linearGradient>
      </defs>
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

export default function DashboardLayout({ accent = 'sky', roleLabel, navItems }) {
  const { user, logout } = useAuth()

  const role = ACCENT_TO_ROLE[accent] || accent
  const a = roleToken(role)

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="hidden w-64 flex-col border-r border-ink-200 bg-white px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2">
            <Logo />
            <Wordmark />
          </div>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            {roleLabel}
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? a.active
                    : 'border-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 border-t border-ink-200 pt-4">
          <div className="px-2 pb-2 text-xs">
            <p className="font-medium text-ink-700">
              {user?.full_name || 'Account'}
            </p>
            <p className="truncate text-ink-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Desktop top header — bell sits here with room for the dropdown */}
        <header className="hidden h-14 items-center justify-end border-b border-ink-200 bg-white px-6 md:flex">
          <NotificationBell />
        </header>

        {/* Mobile top header */}
        <header className="flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Logo />
            <Wordmark />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              · {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={logout}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
            >
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
                  isActive
                    ? a.active
                    : 'border-transparent text-ink-600 hover:bg-ink-100'
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
