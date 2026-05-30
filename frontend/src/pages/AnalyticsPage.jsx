import { useState, useEffect, useRef } from 'react'
import { getHubs, getShortestPath, getAirports, getCountries } from '../api/client.js'
import MapView from '../components/MapView.jsx'

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
      padding: '1.5rem', marginBottom: '1.25rem', ...style,
    }}>{children}</div>
  )
}

function Btn({ children, onClick, disabled, variant = 'primary', size = 'md', style: s = {} }) {
  const base = {
    border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
    opacity: disabled ? 0.55 : 1, letterSpacing: '-0.01em',
    padding: size === 'sm' ? '0.35rem 0.85rem' : '0.6rem 1.4rem',
    fontSize: size === 'sm' ? '0.8rem' : '0.88rem',
  }
  const variants = {
    primary: { background: 'var(--teal)',        color: '#fff' },
    ghost:   { background: 'transparent',        color: 'var(--text-muted)', border: '1px solid var(--border)' },
    active:  { background: 'var(--teal-light)',  color: 'var(--teal)',       border: '1px solid var(--teal-mid)' },
    amber:   { background: 'var(--amber-light)', color: '#92560a',           border: '1px solid #f5d88a' },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...s }}>{children}</button>
}

function IataTag({ code, variant = 'teal' }) {
  const styles = {
    teal:   { background: 'var(--teal-light)',  color: 'var(--teal)',  border: '1px solid var(--teal-mid)' },
    amber:  { background: 'var(--amber-light)', color: '#92560a',     border: '1px solid #f5d88a' },
    purple: { background: '#f0ebff',            color: '#6941c6',     border: '1px solid #c4b5fd' },
    navy:   { background: '#e8f0f5',            color: 'var(--navy)', border: '1px solid #b8cdd8' },
    green:  { background: '#dcfce7',            color: '#15803d',     border: '1px solid #86efac' },
  }
  return (
    <span style={{
      ...styles[variant], fontFamily: 'var(--mono)', fontWeight: 500,
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

function AirportPicker({ airports, value, onChange, placeholder }) {
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (value) {
      const a = airports.find(x => x.code === value)
      if (a) setQ(`${a.code}  ${a.city_name}`)
    } else setQ('')
  }, [value, airports])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = q.length < 1 ? [] : airports.filter(a => {
    const qL = q.toLowerCase()
    return a.code.toLowerCase().includes(qL) || a.city_name.toLowerCase().includes(qL) ||
           a.name.toLowerCase().includes(qL)
  }).slice(0, 6)

  function select(a) { onChange(a.code); setQ(`${a.code}  ${a.city_name}`); setOpen(false) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
        onFocus={() => { setFocus(true); if (q.length >= 1) setOpen(true) }}
        onBlur={() => setFocus(false)}
        placeholder={placeholder || 'Kod IATA lub miasto…'}
        style={{
          width: '100%', padding: '0.65rem 0.85rem', background: '#fafcfc',
          border: `1.5px solid ${focus ? 'var(--teal)' : 'var(--border)'}`,
          borderRadius: 8, color: 'var(--text)', fontSize: '0.9rem',
          outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
          fontFamily: 'inherit',
          boxShadow: focus ? '0 0 0 3px rgba(10,147,150,.12)' : 'none',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}>
          {filtered.map((a, i) => (
            <div key={a.code} onMouseDown={() => select(a)} style={{
              padding: '0.55rem 1rem', cursor: 'pointer',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-light)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--teal)', fontSize: '0.82rem', minWidth: 34 }}>{a.code}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{a.city_name}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)' }}>{a.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CentralityBar({ score, maxScore, rank }) {
  const pct   = maxScore > 0 ? (score / maxScore) * 100 : 0
  const color = pct > 66 ? 'var(--teal)' : pct > 33 ? 'var(--amber)' : '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--text-faint)', minWidth: 22, textAlign: 'right' }}>#{rank}</span>
      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>
        {score.toLocaleString('pl-PL', { maximumFractionDigits: 0 })}
      </span>
    </div>
  )
}

function HubGraph({ hubs }) {
  if (!hubs.length) return null
  const W = 620, H = 360
  const maxScore = hubs[0].centrality_score

  function project(lat, lon) {
    const x = ((lon - (-12)) / 55) * (W - 60) + 30
    const y = ((72 - lat) / 40)   * (H - 60) + 30
    return [Math.max(10, Math.min(W - 10, x)), Math.max(10, Math.min(H - 10, y))]
  }

  const nodes = hubs.slice(0, 25).map(h => {
    const [x, y] = project(h.lat, h.lon)
    const r = 4 + (h.centrality_score / maxScore) * 18
    return { ...h, x, y, r }
  })

  function nodeColor(rank) {
    if (rank <= 3)  return '#0a9396'
    if (rank <= 10) return '#ee9b00'
    return '#94a3b8'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{
        width: '100%', maxWidth: W, display: 'block',
        background: '#f8fbfc', borderRadius: 8, border: '1px solid var(--border)',
      }}>
        {[40, 50, 55, 60, 65].map(lat => {
          const [, y] = project(lat, 0)
          return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="#e2eaec" strokeWidth={0.5} />
        })}
        {[-10, 0, 10, 20, 30, 40].map(lon => {
          const [x] = project(0, lon)
          return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="#e2eaec" strokeWidth={0.5} />
        })}

        {nodes.slice(0, 12).flatMap((a, i) =>
          nodes.slice(i + 1, 12).map((b, j) => (
            <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#94d2bd" strokeWidth={0.7} opacity={0.4} />
          ))
        )}

        {nodes.map(n => (
          <g key={n.iata_code}>
            <circle cx={n.x} cy={n.y} r={n.r + 5} fill={nodeColor(n.rank)} opacity={0.1} />
            <circle cx={n.x} cy={n.y} r={n.r} fill={nodeColor(n.rank)} opacity={0.88} />
            <text x={n.x} y={n.y - n.r - 3} textAnchor="middle"
              fontSize={8.5} fill="var(--text-muted)"
              fontFamily="'DM Mono', monospace" fontWeight={600}>
              {n.iata_code}
            </text>
          </g>
        ))}

        <g transform={`translate(10, ${H - 25})`}>
          {[['#0a9396', 'Top 3'], ['#ee9b00', 'Top 4–10'], ['#94a3b8', 'Pozostałe']].map(([c, l], i) => (
            <g key={i} transform={`translate(${i * 100}, 0)`}>
              <circle cx={6} cy={6} r={5} fill={c} />
              <text x={14} y={10} fontSize={9} fill="var(--text-faint)" fontFamily="inherit">{l}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

function PathTimeline({ stops }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'max-content', gap: 0 }}>
        {stops.map((s, i) => {
          const isLast = i === stops.length - 1
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Węzeł */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center',
                minWidth: 110, boxShadow: 'var(--shadow-sm)',
              }}>
                <IataTag
                  code={s.code}
                  variant={s.node_type === 'origin' ? 'teal' : s.node_type === 'hub' ? 'purple' : 'amber'}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 500, marginTop: 4 }}>{s.city}</div>

                {/* Przylot */}
                {s.arrival && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>przyl.</span> {s.arrival}
                  </div>
                )}
                {/* Odlot */}
                {s.departure && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: s.arrival ? 1 : 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>odl.</span> {s.departure}
                  </div>
                )}
              </div>

              {/* Łącznik z informacjami o locie */}
              {!isLast && s.leg_price != null && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '0 8px', minWidth: 90,
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 700 }}>
                    {s.leg_price} EUR
                  </div>
                  <div style={{
                    width: '100%', height: 1, background: 'var(--border)',
                    margin: '3px 0', position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', right: -4, top: -5,
                      color: 'var(--text-faint)', fontSize: '0.7rem',
                    }}>→</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
                    {Math.floor(s.leg_duration / 60)}h {s.leg_duration % 60}min
                  </div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-faint)' }}>
                    {s.leg_dist_km} km
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// main page
export default function AnalyticsPage() {
  const [airports,     setAirports]     = useState([])
  const [countries,    setCountries]    = useState([])
  const [hubs,         setHubs]         = useState([])
  const [hubsLoading,  setHubsLoading]  = useState(false)
  const [hubsError,    setHubsError]    = useState('')

  //filtry hubów
  const [hubTop,     setHubTop]     = useState(30)
  const [hubCountry, setHubCountry] = useState('')
  const [hubRegion,  setHubRegion]  = useState('')

  //dijkstra
  const [pathSrc,     setPathSrc]     = useState('')
  const [pathDst,     setPathDst]     = useState('')
  const [pathWeight,  setPathWeight]  = useState('price')
  const [pathResult,  setPathResult]  = useState(null)
  const [pathLoading, setPathLoading] = useState(false)
  const [pathError,   setPathError]   = useState('')

  const [activeTab, setActiveTab] = useState('hubs')

  useEffect(() => {
    getAirports().then(setAirports).catch(() => {})
    getCountries().then(setCountries).catch(() => {})
  }, [])

  async function loadHubs() {
    setHubsLoading(true); setHubsError('')
    try {
      const params = { top: hubTop }
      if (hubCountry) params.country = hubCountry
      else if (hubRegion) params.region = hubRegion
      const data = await getHubs(params)
      setHubs(data)
    } catch (e) {
      setHubsError(e.message)
    } finally {
      setHubsLoading(false)
    }
  }

  async function findPath() {
    if (!pathSrc || !pathDst) return
    setPathLoading(true); setPathError(''); setPathResult(null)
    try {
      const data = await getShortestPath(pathSrc, pathDst, pathWeight)
      setPathResult(data)
    } catch (e) {
      setPathError(e.message)
    } finally {
      setPathLoading(false)
    }
  }

  const hubMarkers = hubs.map(h => ({
    lat: h.lat, lon: h.lon,
    label: `${h.iata_code} — ${h.airport_name}`,
    type: h.rank <= 5 ? 'Hub' : 'Airport',
    popup: `#${h.rank} · ${h.city} · score: ${h.centrality_score.toLocaleString()}`,
    code: h.iata_code,
  }))

  const pathMarkers = pathResult ? pathResult.stops.map(s => ({
    lat: s.lat, lon: s.lon,
    label: `${s.code} — ${s.city}`,
    type: s.node_type === 'hub' ? 'Hub' : 'Airport',
    popup: s.name,
    code: s.code,
  })) : []

  const pathLines = pathResult ? pathResult.stops.slice(0, -1).map((s, i) => ({
    positions: [[s.lat, s.lon], [pathResult.stops[i + 1].lat, pathResult.stops[i + 1].lon]],
    color: '#0a9396',
  })) : []

  const maxScore = hubs.length > 0 ? hubs[0].centrality_score : 1

  const WEIGHT_LABELS = { price: 'Cena', dist_km: 'Dystans', duration_min: 'Czas' }

  const REGIONS = [
    ['', 'Cała Europa'],
    ['north',   'Europa Północna'],
    ['west',    'Europa Zachodnia'],
    ['central', 'Europa Centralna'],
    ['east',    'Europa Wschodnia'],
    ['south',   'Europa Południowa'],
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--navy)' }}>
          Analiza sieci lotniczej
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
          Algorytmy grafowe GDS — Betweenness Centrality i Dijkstra Shortest Path
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        {[['hubs', 'Analiza hubów'], ['path', 'Najkrótsza ścieżka (Dijkstra)']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '0.6rem 1.1rem', fontFamily: 'inherit',
            fontWeight: activeTab === key ? 600 : 400,
            fontSize: '0.88rem', border: 'none', background: 'none', cursor: 'pointer',
            color: activeTab === key ? 'var(--teal)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === key ? 'var(--teal)' : 'transparent'}`,
            marginBottom: -1, transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* HUBS */}
      {activeTab === 'hubs' && (
        <>
          <Card>
            <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--navy)' }}>Betweenness Centrality</strong> — lotniska które najczęściej
              leżą na najkrótszych ścieżkach między wszystkimi parami w sieci.
              Wysoki wynik = krytyczny węzeł tranzytowy.
            </p>

            {/* Filtry */}
            <div style={{ marginBottom: '1rem' }}>

              {/* Liczba wyników */}
              <div style={{ marginBottom: '0.875rem' }}>
                <Label>Liczba wyników</Label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[10, 20, 30, 50].map(n => (
                    <Btn key={n} size="sm" variant={hubTop === n ? 'active' : 'ghost'}
                      onClick={() => setHubTop(n)}>Top {n}</Btn>
                  ))}
                </div>
              </div>

              {/* Makroregion */}
              <div style={{ marginBottom: '0.875rem' }}>
                <Label>Makroregion Europy</Label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    ['',        'Cała Europa'],
                    ['north',   'Północna'],
                    ['west',    'Zachodnia'],
                    ['central', 'Centralna'],
                    ['east',    'Wschodnia'],
                    ['south',   'Południowa'],
                  ].map(([v, label]) => (
                    <Btn key={v} size="sm"
                      variant={hubRegion === v && !hubCountry ? 'active' : 'ghost'}
                      onClick={() => { setHubRegion(v); setHubCountry('') }}>
                      {label}
                    </Btn>
                  ))}
                </div>
              </div>

              {/* Konkretny kraj — z dynamicznej listy */}
              <div style={{ marginBottom: '1rem' }}>
                <Label>
                  Konkretny kraj
                  {countries.length === 0 && (
                    <span style={{ color: 'var(--amber)', fontWeight: 400, textTransform: 'none',
                      letterSpacing: 0, marginLeft: 8 }}>
                      (ładowanie…)
                    </span>
                  )}
                </Label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={hubCountry}
                    onChange={e => {  setHubCountry(e.target.value)
                                      setHubRegion('') }}
                    style={{
                      padding: '0.6rem 0.75rem', minWidth: 200,
                      border: `1.5px solid ${hubCountry ? 'var(--teal)' : 'var(--border)'}`,
                      borderRadius: 8, fontFamily: 'inherit', fontSize: '0.88rem',
                      background: '#fafcfc', color: 'var(--text)',
                      outline: 'none', cursor: 'pointer',
                    }}>
                    <option value="">— wszystkie kraje —</option>
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {hubCountry && (
                    <Btn size="sm" variant="ghost"
                      onClick={() => setHubCountry('')}>
                      ✕ wyczyść
                    </Btn>
                  )}
                </div>
              </div>

              {/* Aktywny filtr */}
              {(hubRegion || hubCountry) && (
                <div style={{
                  fontSize: '0.8rem', color: 'var(--teal)', marginBottom: '0.75rem',
                  background: 'var(--teal-light)', padding: '0.4rem 0.8rem',
                  borderRadius: 6, border: '1px solid var(--teal-mid)',
                  display: 'inline-block',
                }}>
                  Filtr aktywny: {hubCountry || {
                    north: 'Europa Północna', west: 'Europa Zachodnia',
                    central: 'Europa Centralna', east: 'Europa Wschodnia',
                    south: 'Europa Południowa',
                  }[hubRegion]}
                </div>
              )}
            </div>

            <Btn onClick={loadHubs} disabled={hubsLoading}>
              {hubsLoading ? 'Obliczam…' : hubs.length ? 'Odśwież analizę' : 'Uruchom analizę'}
            </Btn>

            {hubsError && (
              <div style={{
                marginTop: '0.75rem', color: '#c53030', fontSize: '0.85rem',
                background: '#fff5f5', padding: '0.6rem 0.9rem', borderRadius: 6,
              }}>
                {hubsError}
              </div>
            )}
          </Card>

          {hubs.length > 0 && (
            <>
              <Card style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  Mapa — rozmiar węzła proporcjonalny do centralności
                </div>
                <MapView markers={hubMarkers} center={[51, 13]} zoom={4} />
              </Card>

              <Card>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Wizualizacja grafu — top {Math.min(hubs.length, 25)} hubów
                </div>
                <HubGraph hubs={hubs} />
              </Card>

              <Card>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1.25rem' }}>
                  Ranking hubów
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>({hubs.length})</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {[hubs.slice(0, Math.ceil(hubs.length / 2)), hubs.slice(Math.ceil(hubs.length / 2))].map((col, ci) => (
                    <div key={ci}>
                      {col.map((h, i) => (
                        <div key={h.iata_code} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <IataTag code={h.iata_code} variant={h.rank <= 3 ? 'teal' : h.rank <= 8 ? 'amber' : 'navy'} />
                              <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{h.city}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{h.country}</span>
                          </div>
                          <CentralityBar score={h.centrality_score} maxScore={maxScore} rank={h.rank} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* dijkstra */}
      {activeTab === 'path' && (
        <>
          <Card>
            <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--navy)' }}>Dijkstra Shortest Path</strong> (Neo4j GDS) —
              optymalna trasa między dowolnymi lotniskami w sieci, z dowolną liczbą przesiadek.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end', marginBottom: '1rem' }}>
              <div>
                <Label>Lotnisko startowe</Label>
                <AirportPicker airports={airports} value={pathSrc} onChange={setPathSrc} placeholder="np. WAW, Warsaw…" />
              </div>
              <div style={{ fontSize: '1.3rem', color: 'var(--text-faint)', paddingBottom: 4, textAlign: 'center' }}>→</div>
              <div>
                <Label>Lotnisko docelowe</Label>
                <AirportPicker airports={airports} value={pathDst} onChange={setPathDst} placeholder="np. LIS, Lisbon…" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <Label>Optymalizuj wg</Label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {Object.entries(WEIGHT_LABELS).map(([w, label]) => (
                    <Btn key={w} size="sm" variant={pathWeight === w ? 'active' : 'ghost'}
                      onClick={() => setPathWeight(w)}>{label}</Btn>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <Btn onClick={findPath} disabled={pathLoading || !pathSrc || !pathDst}>
                  {pathLoading ? 'Obliczam…' : 'Znajdź optymalną trasę'}
                </Btn>
              </div>
            </div>

            {pathError && (
              <div style={{ marginTop: '0.75rem', color: '#c53030', fontSize: '0.85rem', background: '#fff5f5', padding: '0.6rem 0.9rem', borderRadius: 6, borderLeft: '3px solid #fc8181' }}>
                {pathError}
              </div>
            )}
          </Card>

          {pathResult && (
            <>
              {/* Statystyki */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  ['Łączna cena',   `${pathResult.total_cost} EUR`,
                    'var(--teal)',  pathResult.optimized_by === 'price'],
                  ['Dystans',       `${pathResult.total_dist_km} km`,
                    'var(--navy)', pathResult.optimized_by === 'dist_km'],
                  ['Czas lotu',     `${Math.floor(pathResult.total_duration_min / 60)}h ${pathResult.total_duration_min % 60}min`,
                    'var(--navy)', pathResult.optimized_by === 'duration_min'],
                  ['Przesiadki',    pathResult.hops === 1 ? 'Bezpośredni' : `${pathResult.hops - 1} przesiadka${pathResult.hops - 1 > 1 ? 'i' : ''}`,
                    pathResult.hops === 1 ? '#16a34a' : '#92560a', false],
                ].map(([label, value, color, isOptimized]) => (
                  <div key={label} style={{
                    background: isOptimized ? 'var(--teal-light)' : 'var(--surface)',
                    borderRadius: 10,
                    border: `1px solid ${isOptimized ? 'var(--teal-mid)' : 'var(--border)'}`,
                    padding: '1rem', boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em',
                      textTransform: 'uppercase', marginBottom: 4,
                      color: isOptimized ? 'var(--teal)' : 'var(--text-faint)',
                    }}>
                      {label} {isOptimized && '★'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color, letterSpacing: '-0.02em' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <Card>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Trasa — {pathResult.stops.length} lotnisk · optymalizacja: {WEIGHT_LABELS[pathResult.optimized_by]}
                </div>
                <PathTimeline stops={pathResult.stops} />
              </Card>

              {/* Mapa */}
              <Card style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  Mapa trasy
                </div>
                <MapView
                  markers={pathMarkers}
                  polylines={pathLines}
                  center={pathMarkers.length ? [pathMarkers[0].lat, pathMarkers[0].lon] : [50, 14]}
                  zoom={4}
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
