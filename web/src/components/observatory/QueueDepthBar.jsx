import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const QUEUE_CAP = 512

export function QueueDepthBar({ depth = 0, capacity = QUEUE_CAP }) {
  const pct = Math.min(100, Math.round((depth / capacity) * 100))
  const high = pct > 75
  const medium = pct > 40 && pct <= 75

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
          <span className="font-mono text-sm text-foreground">
            {depth} <span className="text-muted-foreground">/ {capacity}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              high ? 'bg-red-500' : medium ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {pct}% of channel buffer used
        </p>
      </CardContent>
    </Card>
  )
}
