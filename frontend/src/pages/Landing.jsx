import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
          MediConnect
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Find the right doctor. Book in one flow.
        </h1>
        <p className="mt-4 text-slate-600">
          AI symptom triage, nearby specialists, and real-time appointment booking — all
          in one place.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-700"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
