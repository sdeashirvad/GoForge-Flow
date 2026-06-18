import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const WORKER_COUNT = 5

export function WorkerPoolStrip({ jobs = [], activeWorkers = WORKER_COUNT }) {
  const busyWorkers = new Set(
    jobs.filter((j) => j.status === 'running' && j.worker_id).map((j) => j.worker_id)
  )

  const slots = Array.from({ length: activeWorkers }, (_, i) => {
    const id = `worker-${String(i + 1).padStart(2, '0')}`
    return { id, busy: busyWorkers.has(id) }
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Worker Pool</CardTitle>
        <p className="text-xs text-muted-foreground">
          {busyWorkers.size} of {activeWorkers} workers active
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {slots.map(({ id, busy }) => (
            <div
              key={id}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border px-4 py-3 min-w-[88px] transition-colors',
                busy
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-muted/30'
              )}
            >
              <span className={cn(
                'h-2 w-2 rounded-full mb-2',
                busy ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
              )} />
              <span className="font-mono text-xs text-foreground">{id}</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {busy ? 'running' : 'idle'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
