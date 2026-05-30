import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useConfirm } from '../../context/ConfirmContext'

export default function AdminPatients() {
  const confirm = useConfirm()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/patients')
      setPatients(data.patients || data.users || [])
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not load patients.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(p) {
    const ok = await confirm({
      title: `Delete ${p.full_name || p.email}?`,
      description:
        'This permanently removes the patient account and cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      tone: 'danger',
    })
    if (!ok) return
    setDeletingId(p.id)
    setActionError(null)
    try {
      await api.delete(`/patients/${p.id}`)
      setPatients((prev) => prev.filter((x) => x.id !== p.id))
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Could not delete the patient.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            {patients.length} registered patient{patients.length === 1 ? '' : 's'}.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Loading patients…
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No patients registered yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.full_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {deletingId === p.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
