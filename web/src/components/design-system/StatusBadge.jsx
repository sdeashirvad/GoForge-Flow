import { cn } from '@/lib/utils'

const STATUS_STYLES = {
  queued: 'bg-status-queued/10 text-status-queued border-status-queued/20',
  running: 'bg-status-running/10 text-status-running border-status-running/20',
  completed: 'bg-status-completed/10 text-status-completed border-status-completed/20',
  failed: 'bg-status-failed/10 text-status-failed border-status-failed/20',
  scheduled: 'bg-status-scheduled/10 text-status-scheduled border-status-scheduled/20',
  retrying: 'bg-status-retrying/10 text-status-retrying border-status-retrying/20',
}

const STATUS_DOTS = {
  queued: 'bg-status-queued',
  running: 'bg-status-running animate-status-pulse',
  completed: 'bg-status-completed',
  failed: 'bg-status-failed',
  scheduled: 'bg-status-scheduled',
  retrying: 'bg-status-retrying animate-status-pulse',
}

export function StatusBadge({ status, size = 'default', showDot = true, className }) {
  const normalized = (status || 'queued').toLowerCase()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium capitalize transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        STATUS_STYLES[normalized] || STATUS_STYLES.queued,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            STATUS_DOTS[normalized] || STATUS_DOTS.queued
          )}
          aria-hidden
        />
      )}
      {normalized}
    </span>
  )
}

export function getRetryingBadge(job) {
  if (job?.status === 'failed' && job?.retry_count < job?.max_retries) return 'retrying'
  if (job?.status === 'queued' && job?.retry_count > 0) return 'retrying'
  return job?.status
}
