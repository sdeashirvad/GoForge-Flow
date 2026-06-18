import React, { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ListTodo, Layers, Play, CheckCircle2, XCircle, Clock, Plus, Zap,
} from 'lucide-react'
import { api } from '@/api/client'
import { useSSE } from '@/hooks/useSSE'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { MetricCard } from '@/components/observatory/MetricCard'
import { WorkerPoolStrip } from '@/components/observatory/WorkerPoolStrip'
import { QueueDepthBar } from '@/components/observatory/QueueDepthBar'
import { StatusDistributionChart } from '@/components/observatory/StatusDistributionChart'
import { JobFilters } from '@/components/jobs/JobFilters'
import { JobTable } from '@/components/jobs/JobTable'
import { JobCard } from '@/components/jobs/JobCard'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState(null)
  const filterRef = useRef(filter)
  filterRef.current = filter

  const fetchAll = useCallback(async (f) => {
    try {
      const [s, j] = await Promise.all([
        api.getStats(),
        api.listJobs(f ? { status: f } : {}),
      ])
      setStats(s)
      setJobs(j.jobs || [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchAll(filter) }, [])

  const handleFilter = (f) => {
    setFilter(f)
    fetchAll(f)
  }

  const handleWsMessage = useCallback((event) => {
    if (['job_created', 'job_updated', 'job_deleted', 'jobs_seeded', 'job_diagnosed'].includes(event.type)) {
      fetchAll(filterRef.current)
    }
  }, [fetchAll])

  useSSE(handleWsMessage)

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.seedJobs()
    } catch (e) {
      setError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Observatory"
        description="Watch the orchestrator breathe — worker pool, queue depth, and job lifecycle in real time."
      >
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
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard label="Total" value={stats.stats.total} icon={ListTodo} />
              <MetricCard label="Queued" value={stats.stats.queued} sub={`${stats.queue_depth} buffered`} icon={Layers} />
              <MetricCard label="Running" value={stats.stats.running} sub={`${stats.active_workers} workers`} icon={Play} accent="text-blue-400" />
              <MetricCard label="Done" value={stats.stats.completed} icon={CheckCircle2} accent="text-emerald-400" />
              <MetricCard label="Failed" value={stats.stats.failed} icon={XCircle} accent="text-red-400" />
              <MetricCard label="Scheduled" value={stats.stats.scheduled} icon={Clock} accent="text-amber-400" />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <WorkerPoolStrip jobs={jobs} activeWorkers={stats?.active_workers || 5} />
            <QueueDepthBar depth={stats?.queue_depth || 0} />
          </div>

          <StatusDistributionChart stats={stats?.stats} />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold">Jobs</h2>
              <JobFilters value={filter} onChange={handleFilter} />
            </div>

            {jobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground mb-4">No jobs yet. Run the load demo or create one.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                      <Zap className="h-4 w-4" />
                      Run load demo
                    </Button>
                    <Button asChild>
                      <Link to="/submit">New Job</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <JobTable jobs={jobs} />
                <div className="lg:hidden space-y-3">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
