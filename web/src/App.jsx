import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SubmitJob from './pages/SubmitJob'
import JobDetails from './pages/JobDetails'

function Nav() {
  const loc = useLocation()
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-5">
            <NavLink to="/" className="flex items-center gap-2 group">
              <span className="text-zinc-100 font-semibold text-sm tracking-tight">FlowForge</span>
              <span className="text-zinc-600 text-xs font-mono hidden sm:inline">Go</span>
            </NavLink>
            <nav className="flex items-center gap-1 border-l border-zinc-800 pl-5">
              {[
                { to: '/', label: 'Dashboard', exact: true },
                { to: '/submit', label: 'New Job' },
              ].map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-zinc-100 bg-zinc-800'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-600 text-xs font-mono">live</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950">
        <Nav />
        <main className="max-w-6xl mx-auto px-5 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/submit" element={<SubmitJob />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
