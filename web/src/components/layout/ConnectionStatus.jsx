export function ConnectionStatus({ status, compact = false }) {
  const connected = status === 'connected'
  const connecting = status === 'connecting'

  const dot = (
    <span
      className={`inline-block rounded-full shrink-0 ${
        compact ? 'h-2 w-2' : 'h-2.5 w-2.5'
      } ${
        connected
          ? 'bg-emerald-500'
          : connecting
            ? 'bg-amber-500 animate-pulse'
            : 'bg-red-500'
      }`}
    />
  )

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={connected ? 'Live updates connected' : connecting ? 'Connecting…' : 'Disconnected'}>
        {dot}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
      {dot}
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">
          {connected ? 'Live' : connecting ? 'Connecting' : 'Offline'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {connected ? 'SSE stream active' : connecting ? 'Establishing SSE…' : 'Updates paused'}
        </p>
      </div>
    </div>
  )
}
