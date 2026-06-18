import { cn } from '@/lib/utils'

export function Alert({ className, variant = 'default', ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm',
        variant === 'destructive' && 'border-destructive/50 text-destructive bg-destructive/10',
        variant === 'default' && 'border-border bg-card text-foreground',
        className
      )}
      {...props}
    />
  )
}
