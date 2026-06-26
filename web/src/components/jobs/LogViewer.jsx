import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const LOG_COLORS = {
  INFO: 'text-muted-foreground',
  WARN: 'text-status-retrying',
  ERROR: 'text-status-failed',
  FATAL: 'text-status-failed font-medium',
  DEBUG: 'text-muted-foreground/60',
}

export function LogViewer({ logs, autoScroll = false }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  if (!logs?.length) {
    return <p className="text-sm text-muted-foreground py-4">No logs yet.</p>
  }

  return (
    <div className="rounded-lg border bg-muted/20 max-h-96 overflow-y-auto font-mono text-sm">
      {logs.map((l, i) => (
        <div
          key={l.id || i}
          className="flex gap-3 px-4 py-2 hover:bg-muted/30 border-b border-border/40 last:border-0 transition-colors"
        >
          <span className="text-muted-foreground shrink-0 w-6 text-right text-xs select-none">{i + 1}</span>
          <span className="text-muted-foreground shrink-0 w-16 text-xs">
            {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className={cn('shrink-0 w-12 text-xs font-medium uppercase', LOG_COLORS[l.level] || 'text-muted-foreground')}>
            {l.level}
          </span>
          <span className="text-foreground break-all flex-1 text-xs leading-relaxed">{l.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
