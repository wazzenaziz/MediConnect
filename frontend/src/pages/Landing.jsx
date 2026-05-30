// ============================================================
// MediConnect — Landing.jsx   (REPLACE existing)
// frontend/src/pages/Landing.jsx
// Public front door. Uses the design-system tokens (brand/teal/
// ink) + lucide-react. No old sky-*/slate-* classes.
// ============================================================
import { Link } from 'react-router-dom'
import { Stethoscope, MapPin, CalendarCheck, ArrowRight } from 'lucide-react'

function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="MediConnect">
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#mcL)" />
      <path d="M10 25h6l3-7 4 14 3-9 2.5 5H38" stroke="#fff" strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round" />
      <defs><linearGradient id="mcL" x1="2" y1="2" x2="46" y2="46">
        <stop stopColor="#2e6bf0" /><stop offset="1" stopColor="#0d8276" />
      </linearGradient></defs>
    </svg>
  )
}

const FEATURES = [
  { icon: Stethoscope, tone: 'bg-coral-50 text-coral-600', title: 'AI symptom triage',
    body: 'Describe what you feel in plain words. Our assistant suggests the right specialty in seconds — not a diagnosis, a head start.' },
  { icon: MapPin, tone: 'bg-brand-50 text-brand-600', title: 'Doctors near you',
    body: 'Browse specialists on a live map, filter by distance and field, and see exactly who is available close by.' },
  { icon: CalendarCheck, tone: 'bg-teal-50 text-teal-600', title: 'Real-time booking',
    body: 'Pick an open slot and book instantly. Confirmations and changes update live — for you and your doctor.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-50">
      {/* soft brand glow background */}
      <div className="relative overflow-hidden"
        style={{ background:
          'radial-gradient(120% 90% at 88% -10%, rgba(43,182,163,.10), transparent 45%),' +
          'radial-gradient(110% 90% at -5% 8%, rgba(46,107,240,.10), transparent 42%)' }}>

        {/* top bar */}
        <header className="flex items-center justify-between px-6 py-4 md:px-10 border-b border-ink-150 bg-white/70 backdrop-blur">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-[17px] font-extrabold tracking-[-0.03em] text-ink-900">
              Medi<span className="text-brand-600">Connect</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/login" className="rounded-md px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100">Log in</Link>
            <Link to="/register" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-700">Create account</Link>
          </div>
        </header>

        {/* hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:gap-12 md:px-10 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Healthcare, simplified · Tunis
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.03] tracking-[-0.03em] text-ink-900 md:text-5xl">
              Find the right doctor.<br />
              <span className="text-brand-600">Book in one flow.</span>
            </h1>
            <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-ink-600">
              Describe your symptoms to our AI assistant, discover specialists near you on a
              live map, and book a real-time appointment — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-6 py-3 text-[15px] font-semibold text-white shadow-xs transition hover:bg-brand-700">
                Get started — it&rsquo;s free <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="inline-flex items-center rounded-md border border-ink-300 bg-white px-6 py-3 text-[15px] font-semibold text-ink-700 transition hover:bg-ink-50">
                Log in
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-7">
              {[['14', 'Specialties'], ['Live', 'Real-time booking'], ['AI', 'Symptom triage']].map(([v, l]) => (
                <div key={l} className="flex flex-col">
                  <span className="text-[22px] font-extrabold text-ink-900">{v}</span>
                  <span className="text-[13px] font-medium text-ink-500">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* hero visual */}
          <div className="relative hidden h-[380px] md:block">
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-ink-200 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#eaf0fb,#e7f6f3)' }}>
              <div className="absolute inset-0 opacity-50"
                style={{ backgroundImage: 'linear-gradient(#e3e9f0 1px,transparent 1px),linear-gradient(90deg,#e3e9f0 1px,transparent 1px)', backgroundSize: '38px 38px' }} />
              <div className="absolute left-0 right-0 h-2.5 bg-white/80" style={{ top: '46%' }} />
              <div className="absolute bottom-0 top-0 w-2.5 bg-white/80" style={{ left: '38%' }} />
              {/* my location ripple */}
              <div className="absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-400"
                style={{ left: '52%', top: '54%', background: 'rgba(46,107,240,.08)' }} />
              <div className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand-600"
                style={{ left: '52%', top: '54%' }} />
              {/* doctor pins */}
              {[['30%', '34%'], ['70%', '42%'], ['60%', '80%']].map(([l, t], i) => (
                <svg key={i} width="28" height="28" viewBox="0 0 24 24" fill="none"
                  className="absolute -translate-x-1/2 -translate-y-full drop-shadow"
                  style={{ left: l, top: t }}>
                  <path d="M12 2C7.6 2 4 5.4 4 9.6 4 15 12 22 12 22s8-7 8-12.4C20 5.4 16.4 2 12 2Z" fill="#0d8276" />
                  <circle cx="12" cy="9.5" r="3" fill="#fff" />
                </svg>
              ))}
            </div>
            {/* floating triage card */}
            <div className="absolute -left-6 bottom-8 w-60 rounded-lg border border-ink-200 bg-white p-4 shadow-md">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-coral-600">AI suggested specialist</div>
              <div className="mt-1 text-xl font-extrabold text-ink-900">Cardiologist</div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-150">
                <div className="h-full rounded-full bg-success" style={{ width: '88%' }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-ink-500">
                <span>High confidence</span><span>88%</span>
              </div>
            </div>
            {/* floating doctor card */}
            <div className="absolute -right-5 top-6 flex w-52 items-center gap-2.5 rounded-lg border border-ink-200 bg-white p-3 shadow-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">AB</span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-ink-900">Dr. Amine B.</div>
                <div className="text-[11px] text-ink-500">Cardiologist</div>
              </div>
              <span className="ml-auto rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10.5px] font-bold text-teal-700">1.2 km</span>
            </div>
          </div>
        </section>

        {/* features */}
        <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 md:grid-cols-3 md:px-10">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-ink-200 bg-white p-6 shadow-card">
              <div className={`mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl ${f.tone}`}>
                <f.icon size={23} strokeWidth={1.8} />
              </div>
              <h3 className="text-[17px] font-bold text-ink-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="flex flex-wrap justify-between gap-2.5 border-t border-ink-150 bg-white px-6 py-5 text-[12.5px] text-ink-500 md:px-10">
          <span>© 2026 MediConnect · Tunis</span>
          <span>Not a substitute for professional medical advice. In an emergency, call your local emergency number.</span>
        </footer>
      </div>
    </div>
  )
}
