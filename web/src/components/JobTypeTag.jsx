import React from 'react'

const map = {
  csv_processing: { label: 'csv',     cls: 'text-violet-400 border-violet-800/50 bg-violet-950/40' },
  log_analysis:   { label: 'logs',    cls: 'text-cyan-400   border-cyan-800/50   bg-cyan-950/40'   },
  monitoring:     { label: 'monitor', cls: 'text-orange-400 border-orange-800/50 bg-orange-950/40' },
}

export default function JobTypeTag({ type }) {
  const c = map[type] || { label: type, cls: 'text-zinc-400 border-zinc-700 bg-zinc-900' }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-2xs font-mono font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}
