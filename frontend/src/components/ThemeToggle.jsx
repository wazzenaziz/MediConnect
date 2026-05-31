// ============================================================
// MediConnect — components/ThemeToggle.jsx   (NEW FILE)
// Place at: frontend/src/components/ThemeToggle.jsx
// A compact light/dark switch. Sun in dark mode (→ go light),
// moon in light mode (→ go dark). Works anywhere inside
// <ThemeProvider> (dashboard headers, login, landing).
// ============================================================
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 ' +
        'bg-white text-ink-500 transition hover:text-ink-800 hover:border-ink-300 ' +
        'focus-visible:outline-none ' + className
      }
    >
      {isDark ? <Sun size={17} strokeWidth={1.9} /> : <Moon size={17} strokeWidth={1.9} />}
    </button>
  )
}
