import React, { useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import { api } from '@/api/client'
import { useSSE } from '@/hooks/useSSE'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge, getRetryingBadge } from '@/components/jobs/StatusBadge'
import { JobTypeBadge } from '@/components/jobs/JobTypeBadge'
import { JobLifecycleTimeline } from '@/components/jobs/JobLifecycleTimeline'
import { JobMetadataPanel } from '@/components/jobs/JobMetadataPanel'
import { JobActionsBar } from '@/components/jobs/JobActionsBar'
import { LogViewer } from '@/components/jobs/LogViewer'
import { RetryTimeline } from '@/components/observatory/RetryTimeline'
import { LoadingState } from '@/components/design-system/LoadingState'
import { Panel } from '@/components/design-system/Panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(3)}s`)
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—')

export default function JobDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const idRef = useRef(id)
  idRef.current = id

  const job = data?.job

  const refresh = useCallback(async () => {
    try {
      setData(await api.getJob(idRef.current))
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { refresh() }, [refresh])

  const handleWsMessage = useCallback((event) => {
    if (event.type === 'job_updated' && event.payload?.id === idRef.current) refresh()
    if (event.type === 'job_diagnosed' && event.payload?.job_id === idRef.current) refresh()
    if (event.type === 'job_deleted' && event.payload?.id === idRef.current) navigate('/')
  }, [refresh, navigate])

  useSSE(handleWsMessage)

  const handleDiagnose = async () => {
    setDiagLoading(true)
    try {
      await api.diagnoseJob(id)
      await refresh()
      toast.success('Diagnostic complete')
    } catch (e) {
      setError(e.message)
      toast.error('Diagnosis failed', { description: e.message })
    } finally {
      setDiagLoading(false)
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await api.retryJob(id)
      await refresh()
      toast.success('Job re-queued for retry')
    } catch (e) {
      setError(e.message)
      toast.error('Retry failed', { description: e.message })
    } finally {
      setRetrying(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteJob(id)
      toast.success('Job deleted')
      navigate('/')
    } catch (e) {
      setError(e.message)
      setDeleting(false)
      setDeleteOpen(false)
      toast.error('Delete failed', { description: e.message })
    }
  }

  const copyId = () => {
    navigator.clipboard.writeText(job?.id || '')
    setCopied(true)
    toast.success('Job ID copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <LoadingState variant="detail" />

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">{error}</Alert>
        <Button variant="ghost" asChild>
          <Link to="/">Back to Observatory</Link>
        </Button>
      </div>
    )
  }

  const { logs = [], retries = [], diagnostic } = data || {}
  const isDone = job?.status === 'completed' || job?.status === 'failed'

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={`Job ${job.id.slice(0, 8)}`}
        description={`${job.type.replace(/_/g, ' ')} · ${fmt(job.duration_ms)} · ${job.priority} priority`}
        breadcrumbs={[
          { to: '/', label: 'Observatory' },
          { label: `Job ${job.id.slice(0, 8)}` },
        ]}
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <JobTypeBadge type={job.type} />
          <StatusBadge status={getRetryingBadge(job)} />
          <span className="text-sm text-muted-foreground">Duration: {fmt(job.duration_ms)}</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-muted-foreground break-all">{job.id}</code>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyId} aria-label="Copy job ID">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <JobActionsBar
          job={job}
          diagnostic={diagnostic}
          diagLoading={diagLoading}
          retrying={retrying}
          deleting={deleting}
          deleteOpen={deleteOpen}
          setDeleteOpen={setDeleteOpen}
          onDiagnose={handleDiagnose}
          onRetry={handleRetry}
          onDelete={handleDelete}
        />
        {job.error_message && (
          <Alert variant="destructive">
            <p className="font-mono text-sm">{job.error_message}</p>
          </Alert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Lifecycle" description="State transitions from creation to completion">
          <JobLifecycleTimeline job={job} />
        </Panel>
        <JobMetadataPanel job={job} />
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
          <TabsTrigger value="retries">Retries ({retries.length})</TabsTrigger>
          {isDone && <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>}
          <TabsTrigger value="payload">Payload</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4">
          <Panel title="Execution logs">
            <LogViewer logs={logs} autoScroll={job.status === 'running'} />
          </Panel>
        </TabsContent>

        <TabsContent value="retries" className="mt-4">
          <Panel title="Retry history" description={`${retries.length} attempt(s) with exponential backoff`}>
            <RetryTimeline retries={retries} />
          </Panel>
        </TabsContent>

        {isDone && (
          <TabsContent value="diagnostic" className="mt-4">
            <Panel title="AI Diagnostic" description="Optional Groq-powered root cause analysis">
              {diagLoading ? (
                <div className="flex items-center gap-3 py-6">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <p className="text-sm text-muted-foreground">Querying Llama 3.1…</p>
                </div>
              ) : diagnostic ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Summary</p>
                    <p className="text-sm text-foreground">{diagnostic.summary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Root Cause</p>
                    <p className="text-sm text-muted-foreground">{diagnostic.root_cause}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Suggestions</p>
                    <ul className="space-y-2">
                      {diagnostic.suggestions.split('|').map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary shrink-0">•</span>
                          {s.trim()}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Model: {diagnostic.model_used} · {fmtDate(diagnostic.created_at)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  No diagnostic yet. Use the AI Diagnose button above.
                </p>
              )}
            </Panel>
          </TabsContent>
        )}

        <TabsContent value="payload" className="mt-4">
          <Panel title="Job payload">
            <pre className="rounded-lg bg-muted/30 border p-4 text-sm font-mono text-foreground overflow-x-auto leading-relaxed">
              {(() => {
                try { return JSON.stringify(JSON.parse(job.payload), null, 2) }
                catch { return job.payload }
              })()}
            </pre>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
