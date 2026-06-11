const BASE = import.meta.env.VITE_API_URL || ''

async function apiFetch(url) {
  const res = await fetch(BASE + url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiPost(url) {
  const res = await fetch(BASE + url, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const getCities = () => apiFetch('/api/routes/cities')
export const getAirports = (city = null) => apiFetch(city ? `/api/routes/airports?city=${encodeURIComponent(city)}` : '/api/routes/airports')
export const getCountries = () => apiFetch('/api/analytics/countries')
export const getHubs = (params = {}) => apiFetch(`/api/analytics/hubs?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null && v !== '')))}`)
export const projectGraph = () => apiPost('/api/analytics/project')
export const getShortestPath = (src, dst, weight) => apiFetch(`/api/analytics/shortest-path?src=${src}&dst=${dst}&weight=${weight}`)
export const getConnectingFlights = (src, dst, limit = 15) => apiFetch(`/api/routes/flights/connecting?src=${src}&dst=${dst}&limit=${limit}`)

export async function getFlights({ src, dst, limit = 100 } = {}) {
  const p = new URLSearchParams()
  if (src) p.set('src', src)
  if (dst) p.set('dst', dst)
  if (limit) p.set('limit', limit)
  return apiFetch(`/api/routes/flights?${p}`)
}

export const planTrip = ({ src, budget, days, max_cities, max_flight_price }) =>
  apiFetch(`/api/trips/plan?${new URLSearchParams({
    src, budget, days, max_cities, max_flight_price,
  })}`)

export const getGraphEdges = (topHubs = 30, topEdges = 80) =>
  apiFetch(`/api/analytics/graph-edges?top_hubs=${topHubs}&top_edges=${topEdges}`)
