import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { api } from '../../lib/api'
import { useConfirm } from '../../context/ConfirmContext'
import { Button, Person, Card, SkeletonRows, EmptyState } from '../../components/ui'

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
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Patients</h1>
          <p className="mt-1 text-sm text-ink-500">
            {patients.length} registered patient{patients.length === 1 ? '' : 's'}.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {actionError}
        </div>
      )}

      {loading ? (
        <Card className="p-6">
          <SkeletonRows rows={6} />
        </Card>
      ) : patients.length === 0 ? (
        <EmptyState
          icon={<Users size={40} strokeWidth={1.5} />}
          title="No patients registered yet"
          hint="Patient accounts appear here as people sign up."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-150">
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Person id={p.id} name={p.full_name} sub={p.email} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">
                    {p.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? 'Deleting…' : 'Delete'}
                    </Button>
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
