import React from 'react'

const styles = {
  queued:    'text-zinc-400 bg-zinc-800/60 border-zinc-700/50',
  running:   'text-blue-300 bg-blue-950/60 border-blue-800/50',
  completed: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/50',
  failed:    'text-red-300 bg-red-950/60 border-red-800/50',
  scheduled: 'text-amber-300 bg-amber-950/60 border-amber-800/50',
}

export default function StatusBadge({ status }) {
  const cls = styles[status] || styles.queued
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-2xs font-medium font-mono uppercase tracking-wide ${cls}`}>
      {status === 'running' && (
        <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0 animate-pulse" />
      )}
      {status}
    </span>
  )
}
