import React, { useState, useEffect } from 'react'
import {
  ArrowDown, Database, ListChecks, Save, Layers, Clock, Users, Cpu,
  HardDrive, Radio, CheckCircle, RefreshCw, Shield, Sparkles,
} from 'lucide-react'
import { api } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Panel } from '@/components/design-system/Panel'
import { PageSection } from '@/components/design-system/PageSection'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PIPELINE = [
  { icon: Cpu, title: 'Product', pkg: 'cmd/server', desc: 'GoForge HTTP server wires queue, workers, scheduler, and SSE hub into a single deployable binary.' },
  { icon: ListChecks, title: 'Workflow Definition', pkg: 'internal/jobs', desc: 'Job types (CSV, log analysis, monitoring) define executor strategies with typed payloads.' },
  { icon: Shield, title: 'Validation', pkg: 'internal/api', desc: 'REST handlers validate job type, priority, and JSON payload before persistence.' },
  { icon: Save, title: 'Persistence', pkg: 'internal/storage', desc: 'GORM persists jobs, logs, retries, and diagnostics to SQLite or PostgreSQL.' },
  { icon: Layers, title: 'Queue', pkg: 'internal/queue', desc: 'Buffered channel (cap 512) dispatches jobs to workers — swappable via JobQueue interface.' },
  { icon: Clock, title: 'Scheduler', pkg: 'internal/scheduler', desc: '10-second poller promotes scheduled jobs to queued when their time arrives.' },
  { icon: Users, title: 'Worker Pool', pkg: 'internal/workers', desc: 'Fixed goroutine pool dequeues jobs, assigns worker_id, and orchestrates retries.' },
  { icon: Cpu, title: 'Execution', pkg: 'internal/jobs', desc: 'Per-type executors run real work: CSV validation, log parsing, HTTP health checks.' },
  { icon: HardDrive, title: 'State Store', pkg: 'internal/storage', desc: 'Status transitions, durations, and error messages written back to the database.' },
  { icon: Radio, title: 'Events', pkg: 'internal/ws', desc: 'SSE hub broadcasts job_created, job_updated, and jobs_seeded to the Observatory.' },
  { icon: CheckCircle, title: 'Completion', pkg: '—', desc: 'Terminal states (completed/failed) trigger optional AI diagnostics on permanent failure.' },
]

const ROADMAP = [
  { name: 'SentryAI', desc: 'Pipeline failure diagnosis at production scale — companion to AirflowSentry AI.' },
  { name: 'PnLGuard', desc: 'Anomaly detection and root-cause workflows for financial data pipelines.' },
  { name: 'AI Diagnostics', desc: 'Groq LLM integration for failed job analysis (available today as optional hook).' },
]

export default function Architecture() {
  const [health, setHealth] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.health(), api.getStats()])
      .then(([h, s]) => { setHealth(h); setStats(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-12 max-w-4xl">
      <PageHeader
        title="Architecture"
        description="How GoForge orchestrates reliable business process execution — from submission to completion."
      />

      <PageSection title="Execution pipeline" description="Every job follows this path through the system">
        <div className="space-y-0">
          {PIPELINE.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title}>
                <div className="flex gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/20">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      <Badge variant="outline" className="font-mono text-xs">{step.pkg}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="flex justify-center py-1" aria-hidden>
                    <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </PageSection>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Retry strategy" glass>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              On failure, jobs re-enter the queue with exponential backoff: 2<sup>n</sup> seconds
              (2s, 4s, 8s…) where n is the attempt number.
            </p>
            <p>
              Each retry is recorded with timestamps, error messages, and backoff duration.
              After max_retries, the job enters a permanent failed state.
            </p>
            <div className="flex items-center gap-2 text-foreground font-mono text-xs bg-muted/50 rounded-lg p-3">
              <RefreshCw className="h-4 w-4 shrink-0" />
              FAILED → backoff(2^n) → QUEUED → RUNNING
            </div>
          </div>
        </Panel>

        <Panel title="Idempotency" glass>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Each job has a unique UUID primary key. Retries reference the same job ID —
              state transitions are append-only in the retry history table.
            </p>
            <p>
              The JobQueue interface is the seam for persistent queues (Redis Streams, NATS).
              Today&apos;s in-memory channel is an intentional, documented tradeoff.
            </p>
          </div>
        </Panel>
      </div>

      <PageSection title="Future integrations" description="Roadmap — not yet implemented">
        <div className="grid gap-4 sm:grid-cols-3">
          {ROADMAP.map((item) => (
            <div
              key={item.name}
              className={cn(
                'rounded-lg border border-dashed border-border bg-muted/10 p-4',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">Roadmap</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <Panel title="Live system status">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'API', value: health?.status || 'unknown' },
              { label: 'Database', value: health?.database || 'unknown' },
              { label: 'Queue depth', value: stats?.queue_depth ?? health?.queue_depth ?? '—' },
              { label: 'Active workers', value: stats?.active_workers ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="mt-1 text-lg font-semibold capitalize">{String(value)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
