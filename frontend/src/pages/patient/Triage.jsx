import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

const EXAMPLES = [
  'I have a red itchy rash on my forearm that started two days ago',
  'My chest feels tight when I climb stairs and I get short of breath',
  'I’ve had a constant headache for a week with sensitivity to light',
  'My stomach has been hurting after meals and I feel nauseous',
]

function confidenceLabel(c) {
  if (c >= 0.85) return 'High confidence'
  if (c >= 0.6) return 'Medium confidence'
  return 'Low confidence'
}

function confidenceColor(c) {
  if (c >= 0.85) return 'bg-emerald-500'
  if (c >= 0.6) return 'bg-amber-500'
  return 'bg-rose-500'
}

export default function Triage() {
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const { data } = await api.post('/triage', { symptoms })
      setResult(data)
    } catch (err) {
      const status = err.response?.status
      if (status === 429) {
        setError('Too many requests. Please wait a minute and try again.')
      } else if (status === 503) {
        setError('The AI service is not configured. Contact the administrator.')
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.errors?.[0]?.message) {
        setError(err.response.data.errors[0].message)
      } else {
        setError('Could not reach the AI service. Check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSymptoms('')
    setResult(null)
    setError(null)
  }

  const confidencePct = result ? Math.round(result.confidence * 100) : 0

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          AI Triage
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Describe your symptoms
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Our AI assistant will suggest the type of specialist most relevant to your
          situation. This is not a medical diagnosis.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="symptoms"
          className="block text-sm font-medium text-slate-700"
        >
          What are you experiencing?
        </label>
        <textarea
          id="symptoms"
          rows={5}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          disabled={loading}
          maxLength={1000}
          placeholder="Example: I’ve had a persistent cough for three weeks and chest discomfort when breathing deeply…"
          className="mt-2 block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-50"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>{symptoms.length}/1000</span>
          <span>Be as specific as you can — duration, location, severity</span>
        </div>

        {!result && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Or try an example
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setSymptoms(ex)}
                  disabled={loading}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ex.length > 50 ? `${ex.slice(0, 50)}…` : ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={loading || symptoms.trim().length < 5}
            className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Analyzing…' : 'Get suggestion'}
          </button>
          {(result || error) && (
            <button
              type="button"
              onClick={reset}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {result && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Suggested specialist
          </p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">
            {result.specialty}
          </h2>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">
                {confidenceLabel(result.confidence)}
              </span>
              <span className="font-semibold text-slate-700">
                {confidencePct}%
              </span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-valuenow={confidencePct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full ${confidenceColor(result.confidence)} transition-all`}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why this specialty
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {result.reasoning}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to={`/patient/doctors?specialty=${encodeURIComponent(result.specialty)}`}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
            >
              Find {result.specialty}s near me →
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ask again
            </button>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            ⚠️ This is an AI suggestion, not a medical diagnosis. For emergencies,
            call your local emergency number.
          </p>
        </div>
      )}
    </div>
  )
}
