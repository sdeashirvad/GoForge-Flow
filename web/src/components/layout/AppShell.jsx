import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

export function AppShell({ connectionStatus }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar connectionStatus={connectionStatus} />
      <MobileNav connectionStatus={connectionStatus} />
      <div className="lg:pl-64">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
