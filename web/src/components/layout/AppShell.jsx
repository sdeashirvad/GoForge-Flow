import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

export function AppShell({ connectionStatus }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar connectionStatus={connectionStatus} />
      <MobileNav connectionStatus={connectionStatus} />
      <div className="lg:pl-60">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
