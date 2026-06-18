import React, { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useSSE } from '@/hooks/useSSE'
import Dashboard from '@/pages/Dashboard'
import SubmitJob from '@/pages/SubmitJob'
import JobDetails from '@/pages/JobDetails'
import About from '@/pages/About'

function AppRoutes() {
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  const handleSSE = useCallback((event) => {
    if (event.type === '_connected') setConnectionStatus('connected')
    if (event.type === '_disconnected') setConnectionStatus('disconnected')
  }, [])

  useSSE(handleSSE)

  return (
    <Routes>
      <Route element={<AppShell connectionStatus={connectionStatus} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/submit" element={<SubmitJob />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <div className="dark min-h-screen">
          <AppRoutes />
        </div>
      </TooltipProvider>
    </BrowserRouter>
  )
}
