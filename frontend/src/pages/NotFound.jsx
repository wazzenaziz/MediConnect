import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-sky-600">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Page not found</h1>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-700"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
