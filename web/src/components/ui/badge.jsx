import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        queued: 'border-zinc-600/50 bg-zinc-800/80 text-zinc-300',
        running: 'border-blue-600/50 bg-blue-950/80 text-blue-300',
        completed: 'border-emerald-600/50 bg-emerald-950/80 text-emerald-300',
        failed: 'border-red-600/50 bg-red-950/80 text-red-300',
        scheduled: 'border-amber-600/50 bg-amber-950/80 text-amber-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
