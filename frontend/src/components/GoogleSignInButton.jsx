// ============================================================
// MediConnect — components/GoogleSignInButton.jsx
// "Continue with Google" for the Login and Register pages.
//
// Flow: Google Identity Services renders its own button and hands us a
// Google ID token (a signed JWT) when the user picks an account. We POST
// that token to POST /api/auth/google; the backend verifies it via Supabase,
// finds-or-creates the user, and returns our normal { user, access_token }.
// No Supabase client lives in the browser — only Google's lightweight script.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GSI_SRC = 'https://accounts.google.com/gsi/client'

function dashboardPath(role) {
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  return '/patient'
}

// Load the GSI script once and share the promise across button instances.
let gsiPromise = null
function loadGsi() {
  if (gsiPromise) return gsiPromise
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google sign-in.'))
    document.head.appendChild(s)
  })
  return gsiPromise
}

export default function GoogleSignInButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const buttonRef = useRef(null)
  const [error, setError] = useState(null)

  const from = location.state?.from?.pathname

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false

    loadGsi()
      .then(() => {
        if (cancelled || !buttonRef.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          logo_alignment: 'center',
        })
      })
      .catch((e) => !cancelled && setError(e.message))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCredential(response) {
    setError(null)
    try {
      // response.credential is the Google ID token (JWT).
      const { data } = await api.post('/auth/google', {
        id_token: response.credential,
      })
      login(data.user, data.access_token)
      navigate(from || dashboardPath(data.user.role), { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not sign in with Google. Please try again.',
      )
    }
  }

  // Without a client ID the button can't work — show a quiet hint instead of
  // a dead button, so local dev / unconfigured deploys are obvious.
  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-center text-xs text-ink-400">
        Google sign-in isn’t configured.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={buttonRef} />
      {error && (
        <p role="alert" className="text-center text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
