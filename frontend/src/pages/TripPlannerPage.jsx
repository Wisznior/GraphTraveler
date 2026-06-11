import { useState, useEffect, useRef } from 'react'
import MapView from '../components/MapView.jsx'
import { planTrip, getAirports } from '../api/client.js'

function AirportSearch({ airports, value, onChange, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (value) {
      const a = airports.find(x => x.code === value)
      if (a) setQuery(`${a.code}  ${a.city_name}`)
    } else { setQuery('') }
  }, [value, airports])

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = query.length < 1 ? [] : airports.filter(a => {
    const q = query.toLowerCase()
    return a.code.toLowerCase().includes(q) || a.city_name.toLowerCase().includes(q) ||
           a.name.toLowerCase().includes(q)  || a.country.toLowerCase().includes(q)
  }).slice(0, 7)

  function select(a) { onChange(a.code); setQuery(`${a.code}  ${a.city_name}`); setOpen(false) }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
          onFocus={() => { setFocused(true); if (query.length >= 1) setOpen(true) }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || 'Kod IATA lub miasto…'}
          style={{
            width: '100%', padding: '0.65rem 2rem 0.65rem 0.85rem',
            background: '#fafcfc',
            border: `1.5px solid ${focused ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 8, color: 'var(--text)', fontSize: '0.92rem',
            outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
            fontFamily: 'inherit',
            boxShadow: focused ? '0 0 0 3px rgba(10,147,150,.12)' : 'none',
          }}
        />
        {query && (
          <button onMouseDown={() => { onChange(''); setQuery(''); setOpen(false) }}
            style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                     background: 'none', border: 'none', cursor: 'pointer',
                     color: 'var(--text-faint)', fontSize: '1.1rem', padding: 0, lineHeight: 1 }}>
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(13,45,58,.15)', overflow: 'hidden',
        }}>
          {filtered.map((a, i) => (
            <div key={a.code} onMouseDown={() => select(a)}
              style={{
                padding: '0.6rem 0.9rem', cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-light)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--teal)',
                               fontSize: '0.85rem', minWidth: 36 }}>{a.code}</span>
                <div>
                  <div style={{ fontSize: '0.87rem', fontWeight: 500, color: 'var(--text)' }}>{a.city_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{a.name}</div>
                </div>
              </div>
              <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>{a.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

//style
const S = {
  card: { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' },
  label: { fontSize: '0.73rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.92rem', color: 'var(--text)', background: '#fafcfc', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  btnPrimary: { padding: '0.7rem 1.75rem', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.92rem', fontFamily: 'inherit', transition: 'opacity 0.15s', letterSpacing: '0.01em' },
  th: { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)', background: 'var(--bg)', whiteSpace: 'nowrap' },
  td: { padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', verticalAlign: 'top' },
}

function IataTag({ code, variant = 'teal' }) {
  const styles = {
    teal:   { background: 'var(--teal-light)', color: 'var(--teal)',  border: '1px solid var(--teal-mid)' },
    amber:  { background: '#fff3cd',           color: '#b45309',      border: '1px solid #fcd34d' },
    green:  { background: '#dcfce7',           color: '#15803d',      border: '1px solid #86efac' },
  }
  return (
    <span style={{ ...styles[variant], padding: '3px 9px', borderRadius: 6, fontSize: '0.77rem',
                   fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'var(--mono)',
                   display: 'inline-block' }}>{code}</span>
  )
}

function StatBox({ label, value, sub, color = 'var(--teal)' }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '1rem 1.25rem',
                  border: '1px solid var(--border)', flex: '1 1 130px' }}>
      <div style={{ fontSize: '0.71rem', color: 'var(--text-faint)', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function AppealStars({ appeal }) {
  return (
    <span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < Math.round(appeal / 2) ? '#f59e0b' : '#e2e8f0', fontSize: '0.88rem' }}>★</span>
      ))}
      <span style={{ marginLeft: 4, fontSize: '0.77rem', color: 'var(--text-muted)' }}>{appeal}/10</span>
    </span>
  )
}

//wiersz lotu
function FlightRow({ flight, isReturn = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      fontSize: '0.8rem', color: 'var(--text-muted)',
      background: isReturn ? '#fffbeb' : 'var(--bg)',
      border: `1px solid ${isReturn ? '#fcd34d' : 'var(--border)'}`,
      borderRadius: 6, padding: '6px 12px',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>
        {flight.from_code} → {flight.to_code}
      </span>
      <span>{flight.departure} – {flight.arrival}</span>
      <span style={{ fontWeight: 700, color: isReturn ? '#b45309' : 'var(--teal)' }}>
        {flight.price?.toFixed(0)} EUR
      </span>
      <span style={{ color: 'var(--text-faint)' }}>
        {Math.floor((flight.duration_min ?? 0) / 60)}h {(flight.duration_min ?? 0) % 60}min
      </span>
      {isReturn && <span style={{ color: '#b45309', fontWeight: 600, fontSize: '0.75rem' }}>POWRÓT</span>}
    </div>
  )
}

function Timeline({ variant }) {
  const { stops, origin_city, origin_code, return_flight } = variant

  const dotStyle = (color = 'var(--teal)') => ({
    position: 'absolute', left: -22,
    width: 20, height: 20, borderRadius: '50%',
    background: color, border: '3px solid var(--surface)',
    boxShadow: `0 0 0 2px ${color}`, flexShrink: 0,
  })

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      <div style={{ position: 'absolute', left: 10, top: 16, bottom: 16, width: 2,
                    background: 'linear-gradient(to bottom, var(--teal), var(--teal-mid), var(--border))',
                    borderRadius: 2 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, position: 'relative' }}>
        <div style={{ ...dotStyle(), position: 'absolute', left: -21, display: 'flex',
                      alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 9 }}>✈</span>
        </div>
        <div style={{ background: 'var(--teal-light)', border: '1px solid var(--teal-mid)',
                      borderRadius: 8, padding: '0.65rem 1rem', flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: '0.9rem' }}>
            Punkt startowy: {origin_city}
          </div>
          <div style={{ marginTop: 4 }}><IataTag code={origin_code} /></div>
        </div>
      </div>

      {/*prztstanki*/}
      {stops.map((stop, i) => {
        const nights = stop.day_to - stop.day_from + 1
        return (
          <div key={i} style={{ marginBottom: 24, position: 'relative' }}>
            <div style={{ marginLeft: -22, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: '#e2e8f0', border: '2px solid #cbd5e1' }} />
              <FlightRow flight={stop.flight_in} />
            </div>

            {/*przystanek - karta*/}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginLeft: -22 }}>
              <div style={{ ...dotStyle(), position: 'relative', left: 0, marginTop: 14, flexShrink: 0 }} />
              <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 10, padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
                              gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{stop.city}</span>
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.82rem', marginLeft: 8 }}>{stop.country}</span>
                  </div>
                  <IataTag code={stop.airport_code} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem 1.25rem', flexWrap: 'wrap',
                              fontSize: '0.82rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                  <span style={{ background: 'var(--bg)', border: '1px solid var(--border)',
                                 borderRadius: 5, padding: '2px 8px', fontSize: '0.78rem', color: 'var(--text-faint)' }}>
                    Dzień {stop.day_from}–{stop.day_to} · {nights} {nights === 1 ? 'noc' : nights < 5 ? 'noce' : 'nocy'}
                  </span>
                  <AppealStars appeal={stop.appeal} />
                  <span>{stop.cost_per_day} EUR/dzień</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                    = {(stop.cost_per_day * nights).toFixed(0)} EUR pobyt
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/*lot powrotny */}
      {return_flight && (
        <div style={{ marginLeft: -22, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: '#fef3c7', border: '2px solid #fcd34d' }} />
          <FlightRow flight={return_flight} isReturn />
        </div>
      )}

      {return_flight && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, position: 'relative' }}>
          <div style={{ ...dotStyle('#94a3b8'), position: 'absolute', left: -21 }} />
          <div style={{ background: '#f8fafc', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '0.55rem 1rem', flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Powrót: {origin_city} <IataTag code={origin_code} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

//mapa
function buildMapData(variant) {
  if (!variant) return { markers: [], polylines: [] }

  const markers = []
  const polylines = []

  markers.push({
    lat: variant.origin_lat,
    lon: variant.origin_lon,
    label: `${variant.origin_code} — ${variant.origin_city}`,
    type: 'Hub',
    popup: `Punkt startowy: ${variant.origin_city}`,
    code: variant.origin_code,
  })

  // Przystanki
  variant.stops.forEach(s => {
    markers.push({
      lat: s.lat,
      lon:  s.lon,
      label: `${s.airport_code} — ${s.city}`,
      type: 'Airport',
      popup:`${s.city}, ${s.country} · ${s.appeal}/10 · ${s.cost_per_day} EUR/dzień`,
      code: s.airport_code,
    })
  })

  const allPoints = [
    { lat: variant.origin_lat, lon: variant.origin_lon },
    ...variant.stops.map(s => ({ lat: s.lat, lon: s.lon })),
  ]

  for (let i = 0; i < allPoints.length - 1; i++) {
    const a = allPoints[i], b = allPoints[i + 1]
    if (a.lat && a.lon && b.lat && b.lon) {
      polylines.push({ positions: [[a.lat, a.lon], [b.lat, b.lon]], color: '#0a9396' })
    }
  }

  if (variant.return_flight && variant.stops.length > 0) {
    const last = variant.stops[variant.stops.length - 1]
    if (last.lat && last.lon && variant.origin_lat && variant.origin_lon) {
      polylines.push({
        positions: [[last.lat, last.lon], [variant.origin_lat, variant.origin_lon]],
        color: '#f59e0b', //lot powrotny
      })
    }
  }

  return { markers, polylines }
}

const VARIANT_COLORS = {
  economy:  { bg: '#f0fdf4', border: '#86efac', text: '#15803d', active: '#16a34a' },
  balanced: { bg: 'var(--teal-light)', border: 'var(--teal-mid)', text: 'var(--teal)', active: 'var(--teal)' },
  premium:  { bg: '#faf5ff', border: '#c4b5fd', text: '#7c3aed', active: '#7c3aed' },
}

function VariantTab({ variant, active, onClick }) {
  const col = VARIANT_COLORS[variant.variant] || VARIANT_COLORS.balanced
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '0.85rem 1rem', cursor: 'pointer', fontFamily: 'inherit',
        background: active ? col.bg : 'var(--bg)',
        border: `1.5px solid ${active ? col.border : 'var(--border)'}`,
        borderRadius: 10, transition: 'all 0.15s',
        textAlign: 'left',
      }}
    >
      <div style={{ fontWeight: 700, color: active ? col.active : 'var(--text-muted)',
                    fontSize: '0.9rem', marginBottom: 2 }}>
        {variant.label}
      </div>
      <div style={{ fontSize: '0.77rem', color: 'var(--text-faint)', marginBottom: 6 }}>
        {variant.description}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: active ? col.active : 'var(--text-muted)' }}>
          {variant.budget_used.toFixed(0)} EUR
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
          {variant.stops.length} {variant.stops.length === 1 ? 'miasto' : 'miasta/miast'}
        </span>
      </div>
    </button>
  )
}

export default function TripPlannerPage() {
  const [airports, setAirports] = useState([])
  const [form, setForm] = useState({
    src: '', budget: 1500, days: 10, max_cities: 3, max_flight_price: 250,
  })
  const [result, setResult] = useState(null) //TripPlanResponse
  const [active, setActive] = useState(0)
  const [loading,setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getAirports().then(setAirports).catch(() => {}) }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function generate() {
    if (!form.src) { setError('Wybierz lotnisko startowe.'); return }
    setLoading(true); setError(''); setResult(null); setActive(0)
    try {
      const data = await planTrip(form)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const variant = result?.variants?.[active] ?? null
  const { markers, polylines } = buildMapData(variant)
  const mapCenter = variant
    ? [variant.origin_lat, variant.origin_lon]
    : [50.0, 14.0]

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>
          Planer podróży
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Algorytm zachłanny na grafie lotnisk — generuje trzy warianty planu przy zadanym budżecie i czasie.
        </p>
      </div>

      {/*formularz */}
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.label}>Lotnisko startowe</label>
            <AirportSearch airports={airports} value={form.src}
              onChange={code => set('src', code)} placeholder="Kod IATA lub nazwa miasta…" />
          </div>
          <div>
            <label style={S.label}>Budżet całkowity (EUR)</label>
            <input style={S.input} type="number" value={form.budget}
              min={200} max={10000} step={50} onChange={e => set('budget', +e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Liczba dni</label>
            <input style={S.input} type="number" value={form.days}
              min={3} max={30} onChange={e => set('days', +e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Maks. liczba miast</label>
            <input style={S.input} type="number" value={form.max_cities}
              min={1} max={6} onChange={e => set('max_cities', +e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Maks. cena biletu (EUR)</label>
            <input style={S.input} type="number" value={form.max_flight_price}
              min={30} max={800} step={10} onChange={e => set('max_flight_price', +e.target.value)} />
          </div>
        </div>
        <button style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
          onClick={generate} disabled={loading}>
          {loading ? 'Generowanie wariantów…' : 'Generuj plan podróży'}
        </button>
      </div>

      {/*bląd */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.85rem 1rem',
                      borderRadius: 8, marginBottom: '1.25rem', borderLeft: '3px solid #dc2626',
                      fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/*wyniki */}
      {result && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {result.variants.map((v, i) => (
              <VariantTab key={v.variant} variant={v} active={i === active} onClick={() => setActive(i)} />
            ))}
          </div>

          {variant && (
            <>
              {/*ostrzeżenia */}
              {variant.warnings.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
                              padding: '0.85rem 1rem', marginBottom: '1.25rem',
                              fontSize: '0.85rem', color: '#92400e' }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>Uwagi algorytmu:</strong>
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {variant.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <StatBox label="Miasta" value={variant.stops.length} sub={`z ${form.max_cities} planowanych`} />
                <StatBox label="Dni" value={variant.total_days} sub="łącznie" />
                <StatBox label="Loty" value={`${variant.flight_cost} EUR`}
                  sub={variant.return_flight ? 'w tym lot powrotny' : 'bez lotu powrotnego'}
                  color="var(--teal)" />
                <StatBox label="Pobyty" value={`${variant.stay_cost} EUR`} sub="noclegi + utrzymanie" color="#7c3aed" />
                <StatBox label="Wydano" value={`${variant.budget_used} EUR`}
                  sub={`z ${variant.budget_total} EUR`}
                  color={variant.budget_remaining > 0 ? '#15803d' : '#dc2626'} />
                <StatBox label="Pozostało" value={`${variant.budget_remaining} EUR`} sub="wolny budżet"
                  color={variant.budget_remaining > 0 ? '#15803d' : '#dc2626'} />
              </div>

              <div style={{ ...S.card, padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)',
                              letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem',
                              display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span>Trasa podróży</span>
                  <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: '0.75rem', textTransform: 'none' }}>
                    zielona = trasa wylotu · bursztynowa = powrót
                  </span>
                </div>
                <MapView markers={markers} polylines={polylines} center={mapCenter} zoom={5} />
              </div>

              <div style={S.card}>
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 1.75rem 0' }}>
                  Plan dzień po dniu
                </h3>
                <Timeline variant={variant} />
              </div>

              <div style={S.card}>
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 1rem 0' }}>
                  Zestawienie kosztów
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Miasto', 'Kraj', 'Atrakcyjność', 'Noce', 'Koszt/dzień', 'Pobyt', 'Lot do', 'Łącznie'].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variant.stops.map((s, i) => {
                        const nights     = s.day_to - s.day_from + 1
                        const stayCost   = s.cost_per_day * nights
                        const flightCost = s.flight_in?.price ?? 0
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                            <td style={S.td}><strong>{s.city}</strong></td>
                            <td style={{ ...S.td, color: 'var(--text-muted)' }}>{s.country}</td>
                            <td style={S.td}><AppealStars appeal={s.appeal} /></td>
                            <td style={{ ...S.td, textAlign: 'center', color: 'var(--text-muted)' }}>{nights}</td>
                            <td style={{ ...S.td, color: 'var(--text-muted)' }}>{s.cost_per_day} EUR</td>
                            <td style={S.td}>{stayCost.toFixed(0)} EUR</td>
                            <td style={{ ...S.td, color: 'var(--teal)', fontWeight: 600 }}>{flightCost.toFixed(0)} EUR</td>
                            <td style={{ ...S.td, fontWeight: 700 }}>{(stayCost + flightCost).toFixed(0)} EUR</td>
                          </tr>
                        )
                      })}
                      {variant.return_flight && (
                        <tr style={{ background: '#fffbeb' }}>
                          <td colSpan={6} style={{ ...S.td, color: '#92400e', fontStyle: 'italic', borderBottom: 'none' }}>
                            Lot powrotny: {variant.return_flight.from_code} → {variant.return_flight.to_code}
                            {' '}({variant.return_flight.departure} – {variant.return_flight.arrival})
                          </td>
                          <td style={{ ...S.td, color: '#b45309', fontWeight: 700, borderBottom: 'none' }}>
                            {variant.return_flight.price.toFixed(0)} EUR
                          </td>
                          <td style={{ ...S.td, fontWeight: 700, color: '#b45309', borderBottom: 'none' }}>
                            {variant.return_flight.price.toFixed(0)} EUR
                          </td>
                        </tr>
                      )}
                      <tr style={{ background: 'var(--teal-light)', borderTop: '2px solid var(--teal-mid)' }}>
                        <td colSpan={5} style={{ ...S.td, fontWeight: 700, borderBottom: 'none' }}>Łącznie</td>
                        <td style={{ ...S.td, fontWeight: 700, borderBottom: 'none' }}>{variant.stay_cost.toFixed(0)} EUR</td>
                        <td style={{ ...S.td, fontWeight: 700, color: 'var(--teal)', borderBottom: 'none' }}>{variant.flight_cost.toFixed(0)} EUR</td>
                        <td style={{ ...S.td, fontWeight: 700, fontSize: '1rem', color: 'var(--teal)', borderBottom: 'none' }}>{variant.budget_used.toFixed(0)} EUR</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!result && !loading && !error && (
        <div style={{ ...S.card, textAlign: 'center', padding: '3.5rem 2rem', color: 'var(--text-faint)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.35 }}>✈</div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
            Wypełnij parametry i kliknij „Generuj plan podróży"
          </div>
          <div style={{ fontSize: '0.85rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Algorytm wygeneruje trzy warianty: ekonomiczny, zrównoważony i premium —
            każdy z pełną trasą, mapą i zestawieniem kosztów.
          </div>
        </div>
      )}
    </div>
  )
}
