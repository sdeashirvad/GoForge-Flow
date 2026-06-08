import React, { useState, useEffect } from 'react'
import { api } from '../api/client'

const Section = ({ title, children }) => (
  <div className="border border-zinc-800 rounded-lg overflow-hidden">
    <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40">
      <span className="text-xs font-medium text-zinc-400 font-mono">{title}</span>
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const Pill = ({ label, cls }) => (
  <span className={`inline-block px-2 py-0.5 rounded border text-2xs font-mono font-medium ${cls}`}>
    {label}
  </span>
)

const Stack = [
  { label: 'Go 1.23',          cls: 'text-cyan-400 border-cyan-800/50 bg-cyan-950/30' },
  { label: 'chi router',       cls: 'text-blue-400 border-blue-800/50 bg-blue-950/30' },
  { label: 'GORM',             cls: 'text-violet-400 border-violet-800/50 bg-violet-950/30' },
  { label: 'SQLite',           cls: 'text-amber-400 border-amber-800/50 bg-amber-950/30' },
  { label: 'WebSockets',       cls: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30' },
  { label: 'gorilla/websocket',cls: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30' },
  { label: 'React 18',         cls: 'text-sky-400 border-sky-800/50 bg-sky-950/30' },
  { label: 'Vite',             cls: 'text-purple-400 border-purple-800/50 bg-purple-950/30' },
  { label: 'TailwindCSS',      cls: 'text-teal-400 border-teal-800/50 bg-teal-950/30' },
  { label: 'Recharts',         cls: 'text-rose-400 border-rose-800/50 bg-rose-950/30' },
  { label: 'Groq / Llama 3.1', cls: 'text-orange-400 border-orange-800/50 bg-orange-950/30' },
]

const Infra = [
  { k: 'HTTP server',    v: 'net/http — chi router, structured JSON logging (slog)' },
  { k: 'Worker pool',    v: '5 concurrent goroutines, channel-based in-memory queue (cap 512)' },
  { k: 'Retry engine',   v: 'Exponential backoff (2^n s, capped 60s), per-attempt history' },
  { k: 'Scheduler',      v: 'Polls DB every 10s, promotes scheduled → queued at due time' },
  { k: 'Database',       v: 'SQLite (dev) · PostgreSQL (prod) — GORM auto-migrated' },
  { k: 'Real-time',      v: 'WebSocket hub broadcasts job state changes (gorilla/websocket)' },
  { k: 'AI diagnostics', v: 'Groq llama-3.1-8b-instant — fired automatically on failure, re-runnable' },
  { k: 'Job types',      v: 'csv_processing (8-worker concurrent), log_analysis (real parse), monitoring (real HTTP)' },
  { k: 'Observability',  v: 'Structured slog JSON logs with job_id, worker_id, attempt, duration_ms' },
  { k: 'Graceful stop',  v: 'SIGTERM → HTTP shutdown → queue drain, 10s timeout' },
]

export default function About() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    api.health().then(setHealth).catch(() => {})
  }, [])

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-base font-semibold text-zinc-100 tracking-tight">About</h1>
        <p className="text-zinc-600 text-xs font-mono mt-0.5">architecture & tech stack</p>
      </div>

      <Section title="project">
        <p className="text-sm text-zinc-300 leading-relaxed">
          FlowForge Go is a production-style <span className="text-zinc-100 font-medium">async job orchestration platform</span> written in Go.
          It showcases real concurrency patterns — a fixed worker pool draining a channel-based queue, exponential-backoff retry
          engine, a cron-style scheduler, and WebSocket push for live updates. The frontend is a minimal React SPA.
          Jobs perform <span className="text-zinc-100 font-medium">real work</span>: live HTTP monitoring, genuine log parsing with
          stack-trace detection, and concurrent CSV validation. Failed jobs are automatically diagnosed by an
          LLM (<span className="text-zinc-100 font-medium">Groq / Llama 3.1</span>).
        </p>
      </Section>

      <Section title="infrastructure">
        <div className="divide-y divide-zinc-800/60">
          {Infra.map(({ k, v }) => (
            <div key={k} className="py-2.5 grid grid-cols-[160px_1fr] gap-4 items-start">
              <span className="text-zinc-500 text-xs font-mono shrink-0">{k}</span>
              <span className="text-zinc-300 text-xs">{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="tech stack">
        <div className="flex flex-wrap gap-1.5">
          {Stack.map(s => <Pill key={s.label} {...s} />)}
        </div>
      </Section>

      {health && (
        <Section title="live system status">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'api',      value: health.status,   ok: health.status === 'ok' },
              { label: 'database', value: health.database,  ok: health.database === 'ok' },
              { label: 'groq',     value: health.groq,      ok: health.groq === 'configured' },
              { label: 'queue',    value: `${health.queue_depth} buffered`, ok: true },
            ].map(({ label, value, ok }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-zinc-600 text-2xs font-mono uppercase tracking-widest">{label}</p>
                <p className={`text-xs font-mono mt-1 font-medium ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
