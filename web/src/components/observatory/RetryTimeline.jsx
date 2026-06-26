import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—')

export function RetryTimeline({ retries = [] }) {
  if (!retries.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">No retry attempts recorded.</p>
    )
  }

  return (
    <div className="space-y-0">
      {retries.map((r, i) => (
        <div key={r.id} className="relative flex gap-4 pb-6 last:pb-0 animate-slide-up">
          {i < retries.length - 1 && (
            <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
          )}
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-status-failed/50 bg-status-failed/10">
            <span className="text-xs font-medium text-status-failed">{r.attempt_num}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Attempt #{r.attempt_num}</p>
              <span className="text-xs text-muted-foreground">{fmtDate(r.failed_at)}</span>
            </div>
            <p className="text-sm text-status-failed font-mono mt-1 break-all">{r.error_msg}</p>
            {r.backoff_secs > 0 && (
              <p className="text-xs text-status-retrying mt-1">
                Backoff: {r.backoff_secs}s before retry
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function RetryTimelineCard({ retries }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Retry History</CardTitle>
        <p className="text-sm text-muted-foreground">{retries.length} attempt(s)</p>
      </CardHeader>
      <CardContent>
        <RetryTimeline retries={retries} />
      </CardContent>
    </Card>
  )
}
