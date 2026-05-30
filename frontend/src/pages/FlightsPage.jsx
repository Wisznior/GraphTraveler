import { useState, useEffect, useRef } from 'react'
import MapView from '../components/MapView.jsx'
import { getAirports, getFlights, getConnectingFlights } from '../api/client.js'

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
      padding: '1.5rem', marginBottom: '1.25rem', ...style,
    }}>{children}</div>
  )
}

function Btn({ children, onClick, disabled, variant = 'primary', size = 'md', style = {} }) {
  const base = {
    border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
    opacity: disabled ? 0.55 : 1, letterSpacing: '-0.01em',
    padding: size === 'sm' ? '0.35rem 0.85rem' : '0.6rem 1.4rem',
    fontSize: size === 'sm' ? '0.8rem' : '0.88rem',
  }
  const variants = {
    primary: { background: 'var(--teal)', color: '#fff' },
    ghost:   { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' },
    amber:   { background: 'var(--amber-light)', color: '#92560a', border: '1px solid #f5d88a' },
    active:  { background: 'var(--teal-light)', color: 'var(--teal)', border: '1px solid var(--teal-mid)' },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

function IataTag({ code, variant = 'teal' }) {
  const styles = {
    teal:   { background: 'var(--teal-light)', color: 'var(--teal)',  border: '1px solid var(--teal-mid)' },
    amber:  { background: 'var(--amber-light)', color: '#92560a',    border: '1px solid #f5d88a' },
    purple: { background: '#f0ebff', color: '#6941c6',               border: '1px solid #c4b5fd' },
  }
  return (
    <span style={{
      ...styles[variant],
      fontFamily: 'var(--mono)', fontWeight: 500,
      fontSize: '0.78rem', padding: '2px 8px', borderRadius: 5,
      letterSpacing: '0.05em', display: 'inline-block',
    }}>{code}</span>
  )
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-faint)',
      letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
    }}>{children}</div>
  )
}

function AirportSearch({ airports, value, onChange, placeholder }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (value) {
      const a = airports.find(x => x.code === value)
      if (a) setQuery(`${a.code}  ${a.city_name}`)
    } else {
      setQuery('')
    }
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

  function select(a) {
    onChange(a.code)
    setQuery(`${a.code}  ${a.city_name}`)
    setOpen(false)
  }

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
          <button
            onMouseDown={() => { onChange(''); setQuery(''); setOpen(false) }}
            style={{
              position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', fontSize: '1.1rem', padding: 0, lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}>
          {filtered.map((a, i) => (
            <div key={a.code} onMouseDown={() => select(a)} style={{
              padding: '0.6rem 1rem', cursor: 'pointer',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-light)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--teal)',
                  fontSize: '0.85rem', minWidth: 36,
                }}>{a.code}</span>
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

function FlightRow({ f, i, type = 'direct' }) {
  const isEven = i % 2 === 0
  const bg = isEven ? '#fff' : '#fafcfc'

  if (type === 'direct') {
    return (
      <tr style={{ background: bg }}>
        <td style={td}>
          <IataTag code={f.src_code} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 3 }}>{f.src_city}</div>
        </td>
        <td style={td}>
          <IataTag code={f.dst_code} variant="amber" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 3 }}>{f.dst_city}</div>
        </td>
        <td style={td}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>{f.departure}</div>
          {f.arrival && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>przyb. {f.arrival}</div>}
        </td>
        <td style={{ ...td, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.87rem' }}>
          {Math.floor(f.duration_min / 60)}h {f.duration_min % 60}min
        </td>
        <td style={{ ...td, color: 'var(--text-faint)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
          {f.dist_km} km
        </td>
        <td style={td}>
          <span style={{
            fontWeight: 700, fontSize: '1rem', color: 'var(--teal)',
            fontVariantNumeric: 'tabular-nums',
          }}>{f.price} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-faint)' }}>EUR</span></span>
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ background: bg }}>
      <td style={td}>
        <IataTag code={f.src_code} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 3 }}>{f.src_city}</div>
      </td>
      <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 600 }}>{f.first_departure}</div>
      </td>
      <td style={td}>
        <IataTag code={f.hub_code} variant="purple" />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 3 }}>{f.hub_city}</div>
      </td>
      <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 600 }}>{f.second_departure}</div>
      </td>
      <td style={td}>
        <IataTag code={f.dst_code} variant="amber" />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 3 }}>{f.dst_city}</div>
      </td>
      <td style={{ ...td, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.87rem' }}>
        {Math.floor(f.total_duration_min / 60)}h {f.total_duration_min % 60}min
      </td>
      <td style={td}>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--teal)', fontVariantNumeric: 'tabular-nums' }}>
          {f.total_price} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-faint)' }}>EUR</span>
        </span>
      </td>
    </tr>
  )
}

const th = {
  padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem',
  fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
  color: 'var(--text-faint)', borderBottom: '1px solid var(--border)',
  background: '#fafcfc', whiteSpace: 'nowrap',
}
const td = { padding: '0.85rem 1rem', borderBottom: '1px solid #f4f7f8', verticalAlign: 'middle' }

const MODES = [
  ['all',     'Wszystkie połączenia'],
  ['from',    'Wyloty z lotniska'],
  ['between', 'Trasa A → B'],
]

// Main Page
export default function FlightsPage() {
  const [airports,       setAirports]       = useState([])
  const [flights,        setFlights]        = useState([])
  const [src,            setSrc]            = useState('')
  const [dst,            setDst]            = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [mode,           setMode]           = useState('all')
  const [connecting,     setConnecting]     = useState([])
  const [connectLoading, setConnectLoading] = useState(false)
  const [showConnecting, setShowConnecting] = useState(false)
  const [mapMode,        setMapMode]        = useState('airports')
  const [mapClickTarget, setMapClickTarget] = useState('src')

  useEffect(() => {
    getAirports().then(setAirports).catch(e => setError(e.message))
  }, [])

  function handleMapAirportClick(code) {
    if (mode === 'all') return
    if (mapClickTarget === 'src') { setSrc(code); if (mode === 'between') setMapClickTarget('dst') }
    else { setDst(code); setMapClickTarget('src') }
  }

  async function search() {
    setLoading(true); setError(''); setFlights([]); setConnecting([]); setShowConnecting(false)
    try {
      const params = {}
      if (mode === 'from'    && src)        params.src = src
      if (mode === 'between' && src && dst) { params.src = src; params.dst = dst }

      const data = await getFlights(params)
      setFlights(data)

      if (data.length > 0) {
        setMapMode('flights')
      }

      if (mode === 'between' && src && dst) {
        try {
          const conn = await getConnectingFlights(src, dst, 15)
          setConnecting(conn)
          setShowConnecting(true)
          if (data.length === 0) {
            setMapMode('connecting')
          }
        } catch {
          setConnecting([])
          if (data.length === 0) {
            setError(`Brak połączeń bezpośrednich i z przesiadką: ${src} → ${dst}`)
          }
        }
      }
    } catch (e) {
      if (mode === 'between' && src && dst) {
        try {
          const conn = await getConnectingFlights(src, dst, 15)
          setConnecting(conn)
          setShowConnecting(true)
          setMapMode('connecting')
        } catch {
          setError(e.message)
        }
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadConnecting() {
    setConnectLoading(true)
    try {
      const data = await getConnectingFlights(src, dst)
      setConnecting(data); setShowConnecting(true); setMapMode('connecting')
    } catch { setConnecting([]); setShowConnecting(true) }
    finally { setConnectLoading(false) }
  }

  const airportMarkers = airports.map(a => ({ lat: a.lat, lon: a.lon, label: `${a.code} — ${a.name}`, type: 'Airport', popup: `${a.city_name}, ${a.country}`, code: a.code }))
  const flightMarkers  = [...new Map(flights.flatMap(f => {
    const s = airports.find(a => a.code === f.src_code)
    const d = airports.find(a => a.code === f.dst_code)
    return [
      [f.src_code, s ? { lat: s.lat, lon: s.lon, label: f.src_code, type: 'Airport', popup: f.src_city, code: f.src_code } : null],
      [f.dst_code, d ? { lat: d.lat, lon: d.lon, label: f.dst_code, type: 'Airport', popup: f.dst_city, code: f.dst_code } : null],
    ]
  })).values()].filter(m => m?.lat)

  const directLines    = flights.slice(0, 60).map(f => {
    const s = airports.find(a => a.code === f.src_code)
    const d = airports.find(a => a.code === f.dst_code)
    return s && d ? { positions: [[s.lat, s.lon], [d.lat, d.lon]], color: '#0a9396' } : null
  }).filter(Boolean)

  const connectingMarkers = [...new Map(connecting.flatMap(f => [
    [f.src_code, { lat: f.src_lat, lon: f.src_lon, label: f.src_code, type: 'Airport', popup: f.src_city, code: f.src_code }],
    [f.hub_code, { lat: f.hub_lat, lon: f.hub_lon, label: f.hub_code, type: 'Hub',     popup: f.hub_city, code: f.hub_code }],
    [f.dst_code, { lat: f.dst_lat, lon: f.dst_lon, label: f.dst_code, type: 'Airport', popup: f.dst_city, code: f.dst_code }],
  ])).values()]

  const connectingLines = connecting.slice(0, 10).flatMap(f => [
    { positions: [[f.src_lat, f.src_lon], [f.hub_lat, f.hub_lon]], color: '#0a9396' },
    { positions: [[f.hub_lat, f.hub_lon], [f.dst_lat, f.dst_lon]], color: '#ee9b00' },
  ])

  const displayMarkers   = mapMode === 'connecting' ? connectingMarkers : mapMode === 'flights' ? flightMarkers : airportMarkers
  const displayPolylines = mapMode === 'connecting' ? connectingLines   : mapMode === 'flights' ? directLines   : []

  return (
    <div>
      {/* Hero header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--navy)' }}>
            Połączenia lotnicze
          </h1>
          <span style={{
            fontSize: '0.8rem', color: 'var(--text-faint)', fontWeight: 500,
            background: 'var(--teal-light)', color: 'var(--teal)',
            padding: '2px 10px', borderRadius: 20, border: '1px solid var(--teal-mid)',
          }}>
            {airports.length} lotnisk · Europa
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
          Wyszukaj połączenia bezpośrednie lub z przesiadką między lotniskami europejskimi.
        </p>
      </div>

      {/* Search card */}
      <Card>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          {MODES.map(([m, label]) => (
            <Btn key={m} variant={mode === m ? 'active' : 'ghost'} size="sm"
              onClick={() => { setMode(m); setFlights([]); setConnecting([]); setShowConnecting(false) }}>
              {label}
            </Btn>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {(mode === 'from' || mode === 'between') && (
            <div style={{ flex: '1 1 220px' }}>
              <Label>
                Lotnisko wylotu
                {mode === 'between' && mapClickTarget === 'src' && (
                  <span style={{ color: 'var(--amber)', marginLeft: 8, fontWeight: 400,
                    textTransform: 'none', letterSpacing: 0 }}> — lub wskaż na mapie</span>
                )}
              </Label>
              <AirportSearch airports={airports} value={src} onChange={setSrc} placeholder="np. WAW, Warsaw…" />
            </div>
          )}

          {mode === 'between' && (
            <>
              <div style={{ fontSize: '1.2rem', color: 'var(--text-faint)', paddingBottom: 4 }}>→</div>
              <div style={{ flex: '1 1 220px' }}>
                <Label>
                  Lotnisko przylotu
                  {mapClickTarget === 'dst' && (
                    <span style={{ color: 'var(--amber)', marginLeft: 8, fontWeight: 400,
                      textTransform: 'none', letterSpacing: 0 }}> — lub wskaż na mapie</span>
                  )}
                </Label>
                <AirportSearch airports={airports} value={dst} onChange={setDst} placeholder="np. CDG, Paris…" />
              </div>
            </>
          )}

          <Btn onClick={search} disabled={loading} style={{ flexShrink: 0 }}>
            {loading ? 'Wyszukiwanie…' : 'Wyszukaj loty'}
          </Btn>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fff5f5', color: '#c53030',
          padding: '0.8rem 1rem', borderRadius: 8, marginBottom: '1.25rem',
          borderLeft: '3px solid #fc8181', fontSize: '0.87rem',
        }}>{error}</div>
      )}

      {/* Map */}
      <Card style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Sieć połączeń
            {mode !== 'all' && (
              <span style={{ color: 'var(--amber)', fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                {mapClickTarget === 'src' ? '— wskaż lotnisko wylotu' : '— wskaż lotnisko przylotu'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[
              ['airports', 'Lotniska'],
              flights.length > 0    ? ['flights',    `Bezpośrednie (${flights.length})`]    : null,
              connecting.length > 0 ? ['connecting', `Z przesiadką (${connecting.length})`] : null,
            ].filter(Boolean).map(([m, label]) => (
              <Btn key={m} size="sm" variant={mapMode === m ? 'active' : 'ghost'}
                onClick={() => setMapMode(m)}>{label}</Btn>
            ))}
          </div>
        </div>
        <MapView
          markers={displayMarkers} polylines={displayPolylines}
          center={[50.0, 14.0]} zoom={4}
          onAirportClick={mode !== 'all' ? handleMapAirportClick : null}
        />
      </Card>

      {/* Connecting flights table */}
      {showConnecting && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em' }}>
              Loty z przesiadką
              <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>({connecting.length})</span>
            </h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-faint)' }}>
              <IataTag code="HUB" variant="purple" /> = lotnisko przesiadkowe
            </div>
          </div>
          {connecting.length === 0
            ? <p style={{ color: 'var(--text-faint)', fontSize: '0.87rem' }}>Brak połączeń z przesiadką dla tej trasy.</p>
            : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Skąd', 'Wylot', 'Przesiadka', 'Wylot 2', 'Dokąd', 'Łączny czas', 'Cena'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{connecting.map((f, i) => <FlightRow key={i} f={f} i={i} type="connecting" />)}</tbody>
                </table>
              </div>
          }
        </Card>
      )}

      {/* Direct flights table */}
      {flights.length > 0 && (
        <Card>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
            Loty bezpośrednie
            <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>({flights.length})</span>
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Skąd', 'Dokąd', 'Wylot', 'Czas lotu', 'Dystans', 'Cena'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>{flights.map((f, i) => <FlightRow key={i} f={f} i={i} type="direct" />)}</tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Airport list (default view) */}
      {flights.length === 0 && !loading && mode !== 'between' && !showConnecting && (
        <Card>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
            Lotniska w bazie
            <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>({airports.length})</span>
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Kod IATA', 'Nazwa lotniska', 'Miasto', 'Kraj'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {airports.slice(0, 100).map((a, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafcfc' }}>
                    <td style={td}><IataTag code={a.code} /></td>
                    <td style={{ ...td, color: 'var(--text)', fontSize: '0.88rem' }}>{a.name}</td>
                    <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.88rem' }}>{a.city_name}</td>
                    <td style={{ ...td, color: 'var(--text-faint)', fontSize: '0.85rem' }}>{a.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {airports.length > 100 && (
              <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '1rem', fontSize: '0.82rem', borderTop: '1px solid var(--border)' }}>
                Wyświetlono 100 z {airports.length} lotnisk.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
