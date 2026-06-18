import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Plus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConnectionStatus } from './ConnectionStatus'

const navItems = [
  { to: '/', label: 'Observatory', icon: LayoutDashboard, exact: true },
  { to: '/submit', label: 'New Job', icon: Plus },
  { to: '/about', label: 'About', icon: Info },
]

export function Sidebar({ connectionStatus }) {
  const location = useLocation()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <LayoutDashboard className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">FlowForge</p>
          <p className="text-xs text-muted-foreground">Go</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <ConnectionStatus status={connectionStatus} />
      </div>
    </aside>
  )
}

export { navItems }
