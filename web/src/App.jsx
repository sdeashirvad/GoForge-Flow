import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { SSEProvider, useConnectionStatus } from '@/contexts/SSEContext'
import { AppShell } from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import SubmitJob from '@/pages/SubmitJob'
import JobDetails from '@/pages/JobDetails'
import About from '@/pages/About'
import Architecture from '@/pages/Architecture'

function AppRoutes() {
  const connectionStatus = useConnectionStatus()

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
        <SSEProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <AppRoutes />
              <Toaster position="bottom-right" richColors closeButton />
            </div>
          </TooltipProvider>
        </SSEProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
