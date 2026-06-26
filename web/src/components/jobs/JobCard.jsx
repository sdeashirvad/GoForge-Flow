import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { StatusBadge, getRetryingBadge } from './StatusBadge'
import { JobTypeBadge } from './JobTypeBadge'
import { cn } from '@/lib/utils'

const fmt = (ms) => {
  if (ms == null) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

export function JobCard({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block rounded-lg border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <JobTypeBadge type={job.type} />
            <StatusBadge status={getRetryingBadge(job)} size="sm" />
          </div>
          <p className="font-mono text-xs text-muted-foreground truncate">{job.id}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{fmt(job.duration_ms)}</span>
            <span>{job.worker_id || 'no worker'}</span>
            <span>{job.retry_count}/{job.max_retries} retries</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-muted-foreground">{fmtTime(job.created_at)}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}
