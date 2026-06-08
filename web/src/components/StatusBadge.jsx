import React from 'react'

const config = {
  queued:    { label: 'Queued',    cls: 'bg-slate-700 text-slate-300' },
  running:   { label: 'Running',   cls: 'bg-blue-900 text-blue-300 animate-pulse' },
  completed: { label: 'Completed', cls: 'bg-emerald-900 text-emerald-300' },
  failed:    { label: 'Failed',    cls: 'bg-red-900 text-red-300' },
  scheduled: { label: 'Scheduled', cls: 'bg-amber-900 text-amber-300' },
}

export default function StatusBadge({ status }) {
  const c = config[status] || { label: status, cls: 'bg-slate-700 text-slate-400' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
      )}
      {c.label}
    </span>
  )
}
