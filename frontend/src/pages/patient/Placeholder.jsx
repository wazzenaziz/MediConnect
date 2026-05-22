export default function Placeholder({ title, description, eyebrow = 'Patient', accent = 'sky' }) {
  const eyebrowColor = accent === 'emerald' ? 'text-emerald-600' : 'text-sky-600'
  return (
    <div className="space-y-4">
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${eyebrowColor}`}
        >
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}
