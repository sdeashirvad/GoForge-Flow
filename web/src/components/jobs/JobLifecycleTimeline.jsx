import { Timeline } from '@/components/design-system/Timeline'

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : null)

export function JobLifecycleTimeline({ job }) {
  if (!job) return null

  const states = [
    {
      id: 'created',
      title: 'Created',
      description: 'Job persisted to database',
      timestamp: fmtDate(job.created_at),
      complete: true,
      active: job.status === 'scheduled',
    },
    ...(job.scheduled_at ? [{
      id: 'scheduled',
      title: 'Scheduled',
      description: `Waiting until ${fmtDate(job.scheduled_at)}`,
      timestamp: fmtDate(job.scheduled_at),
      complete: job.status !== 'scheduled',
      active: job.status === 'scheduled',
    }] : []),
    {
      id: 'queued',
      title: 'Queued',
      description: job.retry_count > 0 ? `Re-queued after retry #${job.retry_count}` : 'Waiting in channel buffer',
      complete: ['running', 'completed', 'failed'].includes(job.status),
      active: job.status === 'queued',
    },
    {
      id: 'running',
      title: 'Running',
      description: job.worker_id ? `Assigned to ${job.worker_id}` : 'Awaiting worker assignment',
      timestamp: fmtDate(job.started_at),
      complete: ['completed', 'failed'].includes(job.status),
      active: job.status === 'running',
    },
    {
      id: 'terminal',
      title: job.status === 'failed' ? 'Failed' : job.status === 'completed' ? 'Completed' : 'Awaiting completion',
      description: job.error_message || (job.status === 'completed' ? 'Job finished successfully' : undefined),
      timestamp: fmtDate(job.completed_at),
      complete: ['completed', 'failed'].includes(job.status),
      active: ['completed', 'failed'].includes(job.status),
    },
  ]

  return <Timeline items={states} />
}
