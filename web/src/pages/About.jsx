import React, { useState, useEffect } from 'react'
import { Activity, Database, Cpu, Radio, Layers, Users, Clock, Workflow } from 'lucide-react'
import { api } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Panel } from '@/components/design-system/Panel'
import { PageSection } from '@/components/design-system/PageSection'
import { LabsBranding } from '@/components/layout/LabsBranding'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const concepts = [
  { icon: Layers, title: 'Jobs', desc: 'Typed workflow units with payload, priority, and retry policy.' },
  { icon: Users, title: 'Worker Pool', desc: 'Fixed goroutine pool with channel-based dispatch and worker_id tracking.' },
  { icon: Clock, title: 'Scheduler', desc: 'Promotes future-dated jobs from scheduled to queued every 10 seconds.' },
  { icon: Radio, title: 'SSE Observatory', desc: 'Server-sent events push live status updates to the dashboard.' },
]

const roadmap = [
  'Persistent queue (Redis Streams / NATS)',
  'Priority queue enforcement',
  'DAG dependencies between jobs',
  'Horizontal worker scaling',
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
    <div className="space-y-12 max-w-3xl">
      <PageHeader
        title="About GoForge"
        description="A workflow orchestration platform for reliable business process execution."
      />

      <Panel glass>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p className="text-base text-foreground font-medium">
            GoForge reimplements Airflow/Celery orchestration primitives in Go — made visible through a live observatory.
          </p>
          <p>
            After migrating production treasury pipelines to distributed Airflow with Celery,
            I asked: do I understand what the orchestrator is doing, or am I just configuring DAGs?
            GoForge answers that question with ~1,700 lines of readable Go.
          </p>
        </div>
      </Panel>

      <PageSection title="Problem solved">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Business processes need reliable async execution — retries, scheduling, observability —
          without framework lock-in. GoForge provides the core primitives (queue, pool, backoff, shutdown)
          as a deployable system you can read in an afternoon.
        </p>
      </PageSection>

      <PageSection title="Core concepts">
        <div className="grid gap-4 sm:grid-cols-2">
          {concepts.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Design philosophy">
        <Panel>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong className="text-foreground">Intentional smallness</strong> — entire backend fits one PR review</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong className="text-foreground">Honest tradeoffs</strong> — in-memory queue documented, not hidden</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong className="text-foreground">Observatory-first</strong> — watch workers breathe in real time via SSE</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong className="text-foreground">Pattern portability</strong> — same ideas as Airflow/Celery, framework-free</span>
            </li>
          </ul>
        </Panel>
      </PageSection>

      <PageSection title="Roadmap">
        <div className="flex flex-wrap gap-2">
          {roadmap.map((item) => (
            <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
          ))}
        </div>
      </PageSection>

      <PageSection title="System status">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Activity, label: 'API', value: health?.status },
              { icon: Database, label: 'Database', value: health?.database },
              { icon: Cpu, label: 'Groq AI', value: health?.groq },
              { icon: Workflow, label: 'Queue', value: `${health?.queue_depth ?? 0} buffered` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium capitalize">{value || 'unknown'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      <footer className="pt-8 border-t border-border">
        <LabsBranding />
      </footer>
    </div>
  )
}
