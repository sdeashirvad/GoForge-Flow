import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SubmitJob from './pages/SubmitJob'
import JobDetails from './pages/JobDetails'

const navClass = ({ isActive }) =>
  `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-forge-600 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-800'
  }`

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f1117]">
        {/* Top nav */}
        <header className="border-b border-slate-800 bg-[#0f1117] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <span className="text-forge-400 font-bold text-xl tracking-tight">
                  ⚡ FlowForge
                </span>
                <span className="text-slate-600 text-xs font-mono hidden sm:block">
                  async job orchestration
                </span>
              </div>
              <nav className="flex items-center gap-1">
                <NavLink to="/" end className={navClass}>Dashboard</NavLink>
                <NavLink to="/submit" className={navClass}>Submit Job</NavLink>
              </nav>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
