import React from 'react'

export default function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-zinc-500 text-2xs font-mono uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-semibold font-mono tabular-nums ${accent || 'text-zinc-100'}`}>
        {value ?? '—'}
      </span>
      {sub && <span className="text-zinc-600 text-2xs font-mono">{sub}</span>}
    </div>
  )
}
