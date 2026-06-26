import { cn } from '@/lib/utils'

export function Timeline({ items, className }) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const isActive = item.active
        const isComplete = item.complete

        return (
          <li key={item.id || i} className="relative flex gap-4 pb-6 last:pb-0 animate-slide-up">
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[11px] top-6 h-[calc(100%-12px)] w-px',
                  isComplete ? 'bg-primary/40' : 'bg-border'
                )}
                aria-hidden
              />
            )}
            <div className="relative z-10 flex shrink-0 flex-col items-center">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs transition-all',
                  isActive && 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20',
                  isComplete && !isActive && 'border-primary/50 bg-primary/10 text-primary',
                  !isActive && !isComplete && 'border-border bg-muted text-muted-foreground'
                )}
              >
                {item.icon || (isComplete ? '✓' : i + 1)}
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn('text-sm font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                {item.title}
              </p>
              {item.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              )}
              {item.timestamp && (
                <p className="mt-1 font-mono text-xs text-muted-foreground/80">{item.timestamp}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
