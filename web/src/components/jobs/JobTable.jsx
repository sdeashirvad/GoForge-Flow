import { Link } from 'react-router-dom'
import { StatusBadge, getRetryingBadge } from './StatusBadge'
import { JobTypeBadge } from './JobTypeBadge'
import { cn } from '@/lib/utils'

const fmt = (ms) => {
  if (ms == null) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

export function JobTable({ jobs }) {
  return (
    <div className="hidden lg:block rounded-lg border border-border overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['ID', 'Type', 'Status', 'Priority', 'Retries', 'Duration', 'Worker', 'Created', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className={cn(
                'border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0 group',
                job.status === 'running' && 'bg-status-running/5'
              )}
            >
              <td className="px-4 py-3.5">
                <span className="font-mono text-xs text-muted-foreground" title={job.id}>
                  {job.id.slice(0, 8)}
                </span>
              </td>
              <td className="px-4 py-3.5"><JobTypeBadge type={job.type} /></td>
              <td className="px-4 py-3.5">
                <StatusBadge status={getRetryingBadge(job)} />
              </td>
              <td className="px-4 py-3.5 capitalize text-muted-foreground">{job.priority}</td>
              <td className="px-4 py-3.5 font-mono text-muted-foreground text-xs">
                {job.retry_count}/{job.max_retries}
              </td>
              <td className="px-4 py-3.5 font-mono text-foreground">{fmt(job.duration_ms)}</td>
              <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{job.worker_id || '—'}</td>
              <td className="px-4 py-3.5 text-muted-foreground text-xs">{fmtTime(job.created_at)}</td>
              <td className="px-4 py-3.5 text-right">
                <Link
                  to={`/jobs/${job.id}`}
                  className="text-sm text-primary opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
