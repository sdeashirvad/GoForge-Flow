import { Panel } from '@/components/design-system/Panel'
import { cn } from '@/lib/utils'

const WORKER_COUNT = 5

export function WorkerPoolStrip({ jobs = [], activeWorkers = WORKER_COUNT }) {
  const runningJobs = jobs.filter((j) => j.status === 'running' && j.worker_id)
  const busyWorkers = new Map(runningJobs.map((j) => [j.worker_id, j]))

  const slots = Array.from({ length: activeWorkers }, (_, i) => {
    const id = `worker-${String(i + 1).padStart(2, '0')}`
    const job = busyWorkers.get(id)
    return { id, job, busy: !!job }
  })

  const utilization = Math.round((busyWorkers.size / activeWorkers) * 100)

  return (
    <Panel
      title="Worker Pool"
      description={`${busyWorkers.size} of ${activeWorkers} workers active · ${utilization}% utilization`}
      id="worker-pool"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {slots.map(({ id, job, busy }) => (
          <div
            key={id}
            className={cn(
              'flex flex-col rounded-lg border px-3 py-3 transition-all duration-300',
              busy
                ? 'border-status-running/40 bg-status-running/5 shadow-sm'
                : 'border-border bg-muted/20'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  busy ? 'bg-status-running animate-status-pulse' : 'bg-muted-foreground/30'
                )}
              />
              <span className="font-mono text-xs font-medium text-foreground">{id}</span>
            </div>
            {busy && job ? (
              <>
                <span className="text-xs text-muted-foreground capitalize truncate">{job.type?.replace('_', ' ')}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70 truncate mt-0.5" title={job.id}>
                  {job.id.slice(0, 8)}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">idle</span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}
