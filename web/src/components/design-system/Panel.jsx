import { cn } from '@/lib/utils'

export function Panel({ title, description, actions, children, className, glass = false, id }) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-lg border bg-card text-card-foreground',
        glass && 'glass',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
