import { Link } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import { JobTypeBadge } from './JobTypeBadge'

const fmt = (ms) => {
  if (ms == null) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

export function JobTable({ jobs }) {
  return (
    <div className="hidden lg:block rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {['ID', 'Type', 'Status', 'Priority', 'Retries', 'Duration', 'Worker', 'Created', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className={`border-b border-border/60 hover:bg-muted/20 transition-colors last:border-0 ${
                job.status === 'running' ? 'bg-primary/5' : ''
              }`}
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground" title={job.id}>
                  {job.id.slice(0, 8)}
                </span>
              </td>
              <td className="px-4 py-3"><JobTypeBadge type={job.type} /></td>
              <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{job.priority}</td>
              <td className="px-4 py-3 font-mono text-muted-foreground">{job.retry_count}/{job.max_retries}</td>
              <td className="px-4 py-3 font-mono text-foreground">{fmt(job.duration_ms)}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{job.worker_id || '—'}</td>
              <td className="px-4 py-3 text-muted-foreground">{fmtTime(job.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <Link to={`/jobs/${job.id}`} className="text-sm text-primary hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
