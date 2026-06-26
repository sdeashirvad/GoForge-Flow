import { cn } from '@/lib/utils'
import { AnimatedNumber } from './AnimatedNumber'

export function MetricWidget({
  label,
  value,
  subtext,
  icon: Icon,
  onClick,
  active = false,
  className,
}) {
  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card p-4 text-left transition-all duration-200',
        onClick && 'cursor-pointer hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active && 'border-primary/40 bg-primary/5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        <AnimatedNumber value={typeof value === 'number' ? value : 0} />
      </p>
      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      )}
    </Comp>
  )
}
