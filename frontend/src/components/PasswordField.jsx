// ============================================================
// MediConnect — components/PasswordField.jsx
// A password input with an independent show/hide eye toggle.
// Shared by the registration form and the admin "create doctor"
// form so both behave and validate identically. The caller passes
// `inputClassName` so each form keeps its own border/padding look;
// the toggle markup + behaviour are the single source of truth here.
// ============================================================
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({
  id,
  value,
  onChange,
  inputClassName = '',
  autoComplete = 'new-password',
  placeholder,
  required = false,
  minLength,
  invalid = false,
}) {
  // Visibility is local to each field, so password and confirm-password
  // can be shown/hidden independently.
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        // Right padding leaves room for the eye button.
        className={`${inputClassName} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-400 transition hover:text-ink-700 focus-visible:outline-none"
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Eye size={18} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
