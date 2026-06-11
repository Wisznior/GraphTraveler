import { MapContainer, TileLayer, Popup, Polyline, CircleMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function ClickHandler({ markers, onAirportClick }) {
  useMapEvents({
    click(e) {
      if (!onAirportClick) return
      const { lat, lng } = e.latlng
      let best = null, bestDist = Infinity
      for (const m of markers) {
        const d = Math.hypot(m.lat - lat, m.lon - lng)
        if (d < bestDist) { bestDist = d; best = m }
      }
      if (best && bestDist < 1.2) onAirportClick(best.code)
    }
  })
  return null
}

export default function MapView({
  markers = [],
  polylines = [],
  center = [50.06, 19.94],
  zoom = 5,
  onAirportClick = null,
}) {
  return (
    <div style={{ isolation: 'isolate', borderRadius: 10}}>
      <style>{`
        .leaflet-container { background: #e8f4f5; }
        .leaflet-popup-content-wrapper {
          background: #fff;
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: var(--shadow-lg);
        }
        .leaflet-popup-tip { background: #fff; }
        .leaflet-popup-content { margin: 10px 14px; font-family: 'DM Sans', sans-serif; }
        .leaflet-control-zoom a {
          background: #fff !important;
          color: var(--teal) !important;
          border-color: var(--border) !important;
          font-weight: 600 !important;
        }
        .leaflet-control-zoom a:hover { background: var(--teal-light) !important; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.85) !important;
          color: var(--text-faint) !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a { color: var(--teal) !important; }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '460px', width: '100%', borderRadius: '10px', border: '1px solid var(--border)' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains="abc"
          maxZoom={19}
        />

        <ClickHandler markers={markers} onAirportClick={onAirportClick} />

        {polylines.map((p, i) => {
          const positions = Array.isArray(p) ? p : p.positions
          const color = Array.isArray(p) ? '#0a9396' : (p.color || '#0a9396')
          return (
            <Polyline key={i} positions={positions} color={color}
              weight={2} opacity={0.6} dashArray="6 8" />
          )
        })}

        {markers.map((m, i) => (
          <CircleMarker
            key={i}
            center={[m.lat, m.lon]}
            radius={m.type === 'Hub' ? 8 : 5}
            pathOptions={{
              color: m.type === 'Hub' ? '#ee9b00' : '#0a9396',
              fillColor: m.type === 'Hub' ? '#ee9b00' : '#0a9396',
              fillOpacity: 0.9,
              weight:  2,
            }}
            eventHandlers={onAirportClick && m.code ? { click: () => onAirportClick(m.code) } : {}}
          >
            <Popup>
              <div style={{ fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 2 }}>{m.label}</div>
                {m.popup && <div style={{ color: 'var(--text-muted)' }}>{m.popup}</div>}
                {onAirportClick && m.code && (
                  <div style={{ marginTop: 5, color: 'var(--amber)', fontSize: '0.75rem', fontWeight: 600 }}>
                    Kliknij aby wybrać
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}