import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { navItems } from './Sidebar'
import { ConnectionStatus } from './ConnectionStatus'

export function MobileNav({ connectionStatus }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur px-4">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-sm font-semibold">FlowForge</span>
        <span className="text-xs text-muted-foreground">Go</span>
      </Link>

      <div className="flex items-center gap-3">
        <ConnectionStatus status={connectionStatus} compact />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="p-6 border-b border-border text-left">
              <SheetTitle>FlowForge Go</SheetTitle>
            </SheetHeader>
            <nav className="p-3 space-y-1">
              {navItems.map(({ to, label, icon: Icon, exact }) => {
                const active = exact ? location.pathname === to : location.pathname.startsWith(to)
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
