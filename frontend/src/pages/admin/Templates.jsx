import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { Mail } from 'lucide-react'
import { Card, SkeletonRows, EmptyState } from '../../components/ui'

// Admin email-template manager. Lists templates, lets the admin edit the
// subject + HTML body of one, renders a live preview from sample data via
// the backend, and saves. Editing only — keys are fixed because the
// backend references them by name.
export default function AdminTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeKey, setActiveKey] = useState(null)
  const [draft, setDraft] = useState({ subject: '', body_html: '' })
  const [variables, setVariables] = useState([])

  const [preview, setPreview] = useState({ subject: '', html: '' })
  const [previewing, setPreviewing] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [saveErr, setSaveErr] = useState(null)
  const previewTimer = useRef(null)

  // Load the list once, then open the first template.
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/admin/templates')
        setTemplates(data.templates || [])
        if (data.templates?.[0]) selectTemplate(data.templates[0])
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load templates.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function selectTemplate(t) {
    setActiveKey(t.key)
    setDraft({ subject: t.subject, body_html: t.body_html })
    setVariables(t.variables || [])
    setSaveMsg(null)
    setSaveErr(null)
  }

  // Debounced live preview whenever the draft changes.
  useEffect(() => {
    if (!activeKey) return
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(async () => {
      setPreviewing(true)
      try {
        const { data } = await api.post(`/admin/templates/${activeKey}/preview`, {
          subject: draft.subject,
          body_html: draft.body_html,
        })
        setPreview({ subject: data.subject, html: data.html })
      } catch {
        // Preview is best-effort; leave the last good render in place.
      } finally {
        setPreviewing(false)
      }
    }, 400)
    return () => previewTimer.current && clearTimeout(previewTimer.current)
  }, [activeKey, draft.subject, draft.body_html])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    setSaveErr(null)
    try {
      const { data } = await api.put(`/admin/templates/${activeKey}`, {
        subject: draft.subject,
        body_html: draft.body_html,
      })
      setSaveMsg('Template saved.')
      // Reflect the saved copy back into the list.
      setTemplates((prev) =>
        prev.map((t) => (t.key === activeKey ? data.template : t)),
      )
    } catch (err) {
      const fieldErr = err.response?.data?.errors?.[0]?.message
      setSaveErr(
        fieldErr || err.response?.data?.message || 'Could not save the template.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <SkeletonRows rows={6} />
      </Card>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
        {error}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<Mail size={40} strokeWidth={1.5} />}
        title="No email templates"
        hint="Run the templates migration to seed the default template."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Email templates</h1>
        <p className="mt-1 text-sm text-ink-500">
          Edit the emails MediConnect sends. Changes are stored in the database
          and used the next time an email goes out.
        </p>
      </div>

      {/* Template switcher (only one for now, but list-driven) */}
      {templates.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTemplate(t)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                t.key === activeKey
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <Card className="space-y-4 p-5">
          <div>
            <label className="block text-xs font-medium text-ink-600">
              Subject
            </label>
            <input
              type="text"
              value={draft.subject}
              onChange={(e) =>
                setDraft((d) => ({ ...d, subject: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-ink-600">
                HTML body
              </label>
              <span className="text-[11px] text-ink-400">
                {previewing ? 'Rendering…' : 'Live preview →'}
              </span>
            </div>
            <textarea
              value={draft.body_html}
              onChange={(e) =>
                setDraft((d) => ({ ...d, body_html: e.target.value }))
              }
              spellCheck={false}
              rows={18}
              className="mt-1 w-full resize-y rounded-lg border border-ink-300 bg-ink-50 px-3 py-2 font-mono text-xs leading-relaxed text-ink-900"
            />
          </div>

          {variables.length > 0 && (
            <div className="rounded-lg bg-ink-50 px-3 py-2">
              <p className="text-[11px] font-medium text-ink-500">
                Available placeholders (click to insert at end):
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        body_html: `${d.body_html}{{${v}}}`,
                      }))
                    }
                    className="rounded border border-ink-200 bg-white px-2 py-0.5 font-mono text-[11px] text-violet-700 hover:bg-violet-50"
                  >
                    {'{{'}
                    {v}
                    {'}}'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {saveMsg && (
            <div className="rounded-md border border-success-bd bg-success-bg px-3 py-2 text-sm text-success">
              {saveMsg}
            </div>
          )}
          {saveErr && (
            <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
              {saveErr}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </Card>

        {/* Preview */}
        <Card className="p-5">
          <p className="text-xs font-medium text-ink-600">Preview (sample data)</p>
          <div className="mt-1 rounded-lg border border-ink-200 bg-white">
            <div className="border-b border-ink-100 px-4 py-2">
              <p className="text-[11px] text-ink-400">Subject</p>
              <p className="text-sm font-medium text-ink-900">
                {preview.subject || '—'}
              </p>
            </div>
            {/* Render the HTML in a sandboxed iframe so the email's own
                styles can't leak into (or break) the admin app. */}
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              className="h-[460px] w-full rounded-b-lg"
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
