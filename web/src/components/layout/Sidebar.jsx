import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Plus, Info, GitBranch, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConnectionStatus } from './ConnectionStatus'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LabsBranding } from './LabsBranding'

const navItems = [
  { to: '/', label: 'Observatory', icon: LayoutDashboard, exact: true },
  { to: '/submit', label: 'New Job', icon: Plus },
  { to: '/architecture', label: 'Architecture', icon: GitBranch },
  { to: '/about', label: 'About', icon: Info },
]

export function Sidebar({ connectionStatus }) {
  const location = useLocation()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card/50 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Workflow className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground tracking-tight">GoForge</p>
          <p className="text-xs text-muted-foreground truncate">Orchestration primitives in Go</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-4">
        <ConnectionStatus status={connectionStatus} />
        <LabsBranding />
      </div>
    </aside>
  )
}

export { navItems }
