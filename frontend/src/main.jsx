import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import FlightsPage   from './pages/FlightsPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import TripPlannerPage from './pages/TripPlannerPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          background: 'var(--navy)', padding: '0 2rem', height: '58px',
          display: 'flex', alignItems: 'center', gap: '2rem',
          position: 'sticky', top: 0, zIndex: 2000,
          boxShadow: '0 2px 12px rgba(13,45,58,.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '1rem' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
            }}>✈</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>
              Graph<span style={{ color: 'var(--teal-mid)' }}>Traveler</span>
            </span>
          </div>

          {[['/', 'Połączenia lotnicze', true], ['/analytics', 'Analiza sieci', false], ['/planner', 'Planner podróży', false]].map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              textDecoration: 'none', fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 400,
              padding: '0.3rem 0.75rem', borderRadius: 6,
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.15s',
            })}>{label}</NavLink>
          ))}
        </header>

        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1320px', margin: '0 auto', width: '100%' }}>
          <Routes>
            <Route path="/" element={<FlightsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/planner" element={<TripPlannerPage />}/>
          </Routes>
        </main>

        <footer style={{
          borderTop: '1px solid var(--border)', padding: '1rem 2rem',
          textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.78rem',
          background: 'var(--surface)',
        }}>
          GraphTraveler · Neo4j + FastAPI + React
        </footer>
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
