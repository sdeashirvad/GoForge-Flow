import React from 'react'

const config = {
  csv_processing: { label: 'CSV',        icon: '📊', cls: 'bg-violet-900/50 text-violet-300 border-violet-800' },
  log_analysis:   { label: 'Log',        icon: '🔍', cls: 'bg-cyan-900/50 text-cyan-300 border-cyan-800' },
  monitoring:     { label: 'Monitor',    icon: '📡', cls: 'bg-orange-900/50 text-orange-300 border-orange-800' },
}

export default function JobTypeTag({ type }) {
  const c = config[type] || { label: type, icon: '⚙️', cls: 'bg-slate-800 text-slate-400 border-slate-700' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${c.cls}`}>
      <span>{c.icon}</span> {c.label}
    </span>
  )
}
