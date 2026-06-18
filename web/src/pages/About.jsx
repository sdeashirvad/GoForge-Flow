import React, { useState, useEffect } from 'react'
import { Activity, Database, Cpu, Radio } from 'lucide-react'
import { api } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const packages = [
  { name: 'queue', role: 'Channel-based job dispatch (cap 512)' },
  { name: 'workers', role: 'Fixed goroutine pool + retry engine' },
  { name: 'jobs', role: 'Per-type executors (CSV, logs, HTTP)' },
  { name: 'scheduler', role: 'Promotes scheduled → queued every 10s' },
  { name: 'storage', role: 'GORM + SQLite/PostgreSQL' },
  { name: 'ws', role: 'SSE hub for live dashboard updates' },
]

export default function About() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.health()
      .then(setHealth)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="About FlowForge"
        description="Orchestration primitives in Go — the engine behind Airflow/Celery, made visible."
      />

      <Card>
        <CardHeader>
          <CardTitle>The Story</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            After migrating production treasury pipelines to distributed Airflow with Celery —
            retries, failover, SLA monitoring — I asked a simple question: do I understand what
            the orchestrator is doing, or am I just configuring DAGs?
          </p>
          <p>
            FlowForge Go reimplements the core primitives in ~1,700 lines of Go: a channel-based
            queue, fixed worker pool, exponential-backoff retry engine, cron-style scheduler,
            and graceful shutdown. The dashboard is an <span className="text-foreground font-medium">observatory</span>,
            not the product.
          </p>
          <p>
            <span className="text-foreground font-medium">What to watch in the demo:</span> click
            Run load demo and observe exactly 5 workers activate, queue depth rise, and retry
            backoff timestamps on failed jobs. That is what Celery does inside Airflow workers —
            made visible.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Architecture</CardTitle>
          <CardDescription>Read the entire orchestration layer in one sitting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 py-4 text-sm font-mono">
            <Badge variant="outline" className="px-3 py-1">HTTP API</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="px-3 py-1">queue</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="px-3 py-1 border-primary/50 text-primary">workers</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="px-3 py-1">executor</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="px-3 py-1">retry / SSE</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {packages.map((p) => (
              <div key={p.name} className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-border/60 last:border-0">
                <code className="text-sm font-mono text-primary shrink-0 sm:w-28">internal/{p.name}</code>
                <span className="text-sm text-muted-foreground">{p.role}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tech Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['Go 1.23', 'chi', 'GORM', 'PostgreSQL', 'SQLite', 'SSE', 'React 18', 'Vite', 'TailwindCSS', 'Groq / Llama 3.1'].map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live System Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : health ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'API', value: health.status, ok: health.status === 'ok', icon: Activity },
                { label: 'Database', value: health.database, ok: health.database === 'ok', icon: Database },
                { label: 'Groq AI', value: health.groq, ok: health.groq === 'configured', icon: Cpu },
                { label: 'Queue', value: `${health.queue_depth} buffered`, ok: true, icon: Radio },
              ].map(({ label, value, ok, icon: Icon }) => (
                <div key={label} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
                  </div>
                  <p className={`text-sm font-medium capitalize ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to reach API.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
