import { Panel } from '@/components/design-system/Panel'
import { cn } from '@/lib/utils'

const QUEUE_CAP = 512

export function QueueDepthBar({ depth = 0, capacity = QUEUE_CAP }) {
  const pct = Math.min(100, Math.round((depth / capacity) * 100))
  const high = pct > 75
  const medium = pct > 40 && pct <= 75

  return (
    <Panel
      title="Queue Depth"
      description="In-memory channel buffer"
      actions={
        <span className="font-mono text-sm text-foreground">
          {depth} <span className="text-muted-foreground">/ {capacity}</span>
        </span>
      }
    >
      <div className="space-y-3">
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              high ? 'bg-status-failed' : medium ? 'bg-status-retrying' : 'bg-primary'
            )}
            style={{ width: `${Math.max(pct, depth > 0 ? 2 : 0)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pct}% utilized</span>
          <span>
            {high ? 'Critical' : medium ? 'Elevated' : 'Normal'}
          </span>
        </div>
        <div className="flex gap-2 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> &lt;40%</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-status-retrying" /> 40–75%</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-status-failed" /> &gt;75%</span>
        </div>
      </div>
    </Panel>
  )
}
