import React from 'react'

export default function StatCard({ label, value, sub, color = 'slate' }) {
  const colors = {
    slate:   'border-slate-700 text-slate-300',
    blue:    'border-blue-800 text-blue-300',
    emerald: 'border-emerald-800 text-emerald-300',
    red:     'border-red-800 text-red-300',
    amber:   'border-amber-800 text-amber-300',
    violet:  'border-violet-800 text-violet-300',
  }
  return (
    <div className={`bg-slate-900 border rounded-lg p-4 ${colors[color]}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}
