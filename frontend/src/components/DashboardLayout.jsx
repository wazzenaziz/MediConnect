import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

export default function DashboardLayout({ accent = 'sky', roleLabel, navItems }) {
  const { user, logout } = useAuth()

  const accentClasses = {
    sky: {
      pill: 'text-sky-600',
      active: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    emerald: {
      pill: 'text-emerald-600',
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    violet: {
      pill: 'text-violet-600',
      active: 'bg-violet-50 text-violet-700 border-violet-200',
    },
  }
  const a = accentClasses[accent] || accentClasses.sky

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${a.pill}`}
          >
            MediConnect
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{roleLabel}</p>
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
                    : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span aria-hidden="true" className="text-base">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="px-2 pb-2 text-xs">
            <p className="font-medium text-slate-700">
              {user?.full_name || 'Account'}
            </p>
            <p className="truncate text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Desktop top header — bell sits here with room for the dropdown */}
        <header className="hidden h-14 items-center justify-end border-b border-slate-200 bg-white px-6 md:flex">
          <NotificationBell />
        </header>

        {/* Mobile top header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <p className={`text-sm font-semibold uppercase tracking-wide ${a.pill}`}>
            MediConnect · {roleLabel}
          </p>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium ${
                  isActive
                    ? a.active
                    : 'border-transparent text-slate-600 hover:bg-slate-100'
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
