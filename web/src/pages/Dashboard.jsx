import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ListTodo, Layers, Play, CheckCircle2, XCircle, Clock, Plus, Zap, Radio,
} from 'lucide-react'
import { api } from '@/api/client'
import { useSSE } from '@/hooks/useSSE'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageSection } from '@/components/design-system/PageSection'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { MetricWidget } from '@/components/design-system/MetricWidget'
import { LoadingState } from '@/components/design-system/LoadingState'
import { EmptyState } from '@/components/design-system/EmptyState'
import { WorkerPoolStrip } from '@/components/observatory/WorkerPoolStrip'
import { QueueDepthBar } from '@/components/observatory/QueueDepthBar'
import { StatusDistributionChart } from '@/components/observatory/StatusDistributionChart'
import { ThroughputSparkline } from '@/components/observatory/ThroughputSparkline'
import { JobFilters } from '@/components/jobs/JobFilters'
import { JobTable } from '@/components/jobs/JobTable'
import { JobCard } from '@/components/jobs/JobCard'

const STATUS_MAP = {
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  scheduled: 'scheduled',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [throughputHistory, setThroughputHistory] = useState([])
  const filterRef = useRef({ status: filter, type: typeFilter })
  filterRef.current = { status: filter, type: typeFilter }

  const buildParams = (f) => {
    const params = {}
    if (f.status) params.status = f.status
    if (f.type) params.type = f.type
    return params
  }

  const fetchAll = useCallback(async (f) => {
    try {
      const [s, j] = await Promise.all([
        api.getStats(),
        api.listJobs(buildParams(f)),
      ])
      setStats(s)
      setJobs(j.jobs || [])
      setLastUpdated(new Date())
      setThroughputHistory((prev) => {
        const next = [
          ...prev,
          {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            completed: s.stats?.completed || 0,
          },
        ]
        return next.slice(-20)
      })
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll(filterRef.current) }, [])

  const handleFilter = (status) => {
    setFilter(status)
    fetchAll({ status, type: typeFilter })
  }

  const handleTypeFilter = (type) => {
    setTypeFilter(type)
    fetchAll({ status: filter, type })
  }

  const handleWsMessage = useCallback((event) => {
    if (event.type === 'jobs_seeded') {
      toast.success('Load demo started', {
        description: 'Watch workers saturate as jobs enter the queue.',
      })
      document.getElementById('worker-pool')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (['job_created', 'job_updated', 'job_deleted', 'jobs_seeded', 'job_diagnosed'].includes(event.type)) {
      fetchAll(filterRef.current)
    }
  }, [fetchAll])

  useSSE(handleWsMessage)

  const handleSeed = async () => {
    setSeeding(true)
    toast.loading('Seeding demo jobs…', { id: 'seed' })
    try {
      await api.seedJobs()
      toast.dismiss('seed')
    } catch (e) {
      toast.dismiss('seed')
      setError(e.message)
      toast.error('Failed to run demo', { description: e.message })
    } finally {
      setSeeding(false)
    }
  }

  const metricFilter = (status) => () => handleFilter(STATUS_MAP[status] || '')

  return (
    <div className="space-y-10">
      <PageHeader
        title="Observatory"
        description="Infrastructure control plane — worker pool, queue depth, and job lifecycle in real time."
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-status-completed animate-status-pulse" />
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Connecting…'}
        </div>
        <Button variant="outline" onClick={handleSeed} disabled={seeding}>
          <Zap className="h-4 w-4" />
          {seeding ? 'Running…' : 'Run load demo'}
        </Button>
        <Button asChild>
          <Link to="/submit">
            <Plus className="h-4 w-4" />
            New Job
          </Link>
        </Button>
      </PageHeader>

      {error && <Alert variant="destructive">{error}</Alert>}

      {loading ? (
        <LoadingState variant="metrics" />
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricWidget label="Total" value={stats.stats.total} icon={ListTodo} />
              <MetricWidget
                label="Queued"
                value={stats.stats.queued}
                subtext={`${stats.queue_depth} buffered`}
                icon={Layers}
                onClick={metricFilter('queued')}
                active={filter === 'queued'}
              />
              <MetricWidget
                label="Running"
                value={stats.stats.running}
                subtext={`${stats.active_workers} workers`}
                icon={Play}
                onClick={metricFilter('running')}
                active={filter === 'running'}
              />
              <MetricWidget
                label="Done"
                value={stats.stats.completed}
                icon={CheckCircle2}
                onClick={metricFilter('completed')}
                active={filter === 'completed'}
              />
              <MetricWidget
                label="Failed"
                value={stats.stats.failed}
                icon={XCircle}
                onClick={metricFilter('failed')}
                active={filter === 'failed'}
              />
              <MetricWidget
                label="Scheduled"
                value={stats.stats.scheduled}
                icon={Clock}
                onClick={metricFilter('scheduled')}
                active={filter === 'scheduled'}
              />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <WorkerPoolStrip jobs={jobs} activeWorkers={stats?.active_workers || 5} />
            <QueueDepthBar depth={stats?.queue_depth || 0} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusDistributionChart stats={stats?.stats} />
            <ThroughputSparkline history={throughputHistory} />
          </div>

          <PageSection title="Job stream" description="Live job list with status and type filters">
            <JobFilters
              value={filter}
              onChange={handleFilter}
              typeValue={typeFilter}
              onTypeChange={handleTypeFilter}
            />

            <div className="mt-4">
              {jobs.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title="No jobs match your filters"
                  description={
                    filter || typeFilter
                      ? 'Try clearing filters or create a new job.'
                      : 'Run the load demo to watch workers saturate, or create your first job.'
                  }
                >
                  <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                    <Zap className="h-4 w-4" />
                    Run load demo
                  </Button>
                  <Button asChild>
                    <Link to="/submit">New Job</Link>
                  </Button>
                </EmptyState>
              ) : (
                <>
                  <JobTable jobs={jobs} />
                  <div className="lg:hidden space-y-3 mt-3">
                    {jobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </PageSection>
        </>
      )}
    </div>
  )
}
