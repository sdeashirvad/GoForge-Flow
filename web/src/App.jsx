import React, { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { useSSE } from '@/hooks/useSSE'
import Dashboard from '@/pages/Dashboard'
import SubmitJob from '@/pages/SubmitJob'
import JobDetails from '@/pages/JobDetails'
import About from '@/pages/About'
import Architecture from '@/pages/Architecture'

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
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <AppRoutes />
            <Toaster position="bottom-right" richColors closeButton />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
