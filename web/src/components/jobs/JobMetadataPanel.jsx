import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/design-system/Panel'

const fmt = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(3)}s`)
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—')

function KV({ label, value, mono = false, copyable = false }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value || value === '—') return
    navigator.clipboard.writeText(String(value))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-start gap-1">
        <p className={`text-sm flex-1 ${mono ? 'font-mono' : ''} text-foreground break-all`}>
          {value || '—'}
        </p>
        {copyable && value && value !== '—' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={handleCopy}
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}

export function JobMetadataPanel({ job }) {
  if (!job) return null

  return (
    <Panel title="Execution metadata" description="Worker assignment and timing">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <KV label="Worker" value={job.worker_id} mono copyable />
        <KV label="Duration" value={fmt(job.duration_ms)} mono />
        <KV label="Retries" value={`${job.retry_count} / ${job.max_retries}`} mono />
        <KV label="Priority" value={job.priority} />
        <KV label="Created" value={fmtDate(job.created_at)} />
        <KV label="Started" value={fmtDate(job.started_at)} />
        <KV label="Finished" value={fmtDate(job.completed_at)} />
        {job.scheduled_at && <KV label="Scheduled" value={fmtDate(job.scheduled_at)} />}
      </div>
    </Panel>
  )
}
