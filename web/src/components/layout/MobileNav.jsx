import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { navItems } from './Sidebar'
import { ConnectionStatus } from './ConnectionStatus'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LabsBranding } from './LabsBranding'

export function MobileNav({ connectionStatus }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border glass px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <Workflow className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold">GoForge</span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <ConnectionStatus status={connectionStatus} compact />
          <ThemeToggle compact />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-6 border-b border-border text-left">
                <SheetTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  GoForge
                </SheetTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Orchestration primitives in Go
                </p>
              </SheetHeader>
              <nav className="flex-1 p-3 space-y-1" aria-label="Mobile navigation">
                {navItems.map(({ to, label, icon: Icon, exact }) => {
                  const active = exact ? location.pathname === to : location.pathname.startsWith(to)
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  )
                })}
              </nav>
              <div className="p-4 border-t border-border">
                <LabsBranding />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border glass pb-safe"
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 min-h-[44px] text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full px-1">{label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
