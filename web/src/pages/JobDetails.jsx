import React, { useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Sparkles, RotateCcw, Trash2 } from 'lucide-react'
import { api } from '@/api/client'
import { useSSE } from '@/hooks/useSSE'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { JobTypeBadge } from '@/components/jobs/JobTypeBadge'
import { RetryTimeline } from '@/components/observatory/RetryTimeline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

const fmt = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(3)}s`)
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—')

const LOG_COLORS = {
  INFO: 'text-muted-foreground',
  WARN: 'text-amber-400',
  ERROR: 'text-red-400',
  FATAL: 'text-red-300 font-medium',
  DEBUG: 'text-muted-foreground/60',
}

function KV({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} text-foreground break-all`}>{value || '—'}</p>
    </div>
  )
}

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
    } catch (e) {
      setError(e.message)
    } finally {
      setDiagLoading(false)
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await api.retryJob(id)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setRetrying(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteJob(id)
      navigate('/')
    } catch (e) {
      setError(e.message)
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const copyId = () => {
    navigator.clipboard.writeText(job?.id || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Alert variant="destructive">{error}</Alert>
        <Button variant="ghost" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Observatory</Link>
        </Button>
      </div>
    )
  }

  const { logs = [], retries = [], diagnostic } = data || {}
  const isFailed = job?.status === 'failed'
  const isDone = job?.status === 'completed' || job?.status === 'failed'

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/"><ArrowLeft className="h-4 w-4" /> Observatory</Link>
      </Button>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <JobTypeBadge type={job.type} />
                <StatusBadge status={job.status} />
                <span className="text-sm text-muted-foreground capitalize">{job.priority} priority</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground break-all">{job.id}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyId}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isDone && (
                <Button variant="outline" size="sm" onClick={handleDiagnose} disabled={diagLoading}>
                  <Sparkles className="h-4 w-4" />
                  {diagLoading ? 'Analysing…' : diagnostic ? 'Re-diagnose' : 'AI Diagnose'}
                </Button>
              )}
              {isFailed && (
                <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
                  <RotateCcw className="h-4 w-4" />
                  {retrying ? 'Retrying…' : 'Retry'}
                </Button>
              )}
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete job?</DialogTitle>
                    <DialogDescription>
                      This permanently removes the job and all logs, retries, and diagnostics.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 pt-2 border-t border-border">
            <KV label="Worker" value={job.worker_id} mono />
            <KV label="Duration" value={fmt(job.duration_ms)} mono />
            <KV label="Retries" value={`${job.retry_count} / ${job.max_retries}`} mono />
            <KV label="Created" value={fmtDate(job.created_at)} />
            <KV label="Started" value={fmtDate(job.started_at)} />
            <KV label="Finished" value={fmtDate(job.completed_at)} />
            {job.scheduled_at && <KV label="Scheduled" value={fmtDate(job.scheduled_at)} />}
          </div>
          {job.error_message && (
            <Alert variant="destructive" className="mt-4">
              <p className="font-mono text-sm">{job.error_message}</p>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
          <TabsTrigger value="retries">Retries ({retries.length})</TabsTrigger>
          {isDone && <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>}
          <TabsTrigger value="payload">Payload</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {retries.length > 0 && <RetryTimeline retries={retries} />}
          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Logs</CardTitle>
                <CardDescription>Last {Math.min(5, logs.length)} entries</CardDescription>
              </CardHeader>
              <CardContent>
                <LogViewer logs={logs.slice(-5)} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No logs yet.</p>
              ) : (
                <LogViewer logs={logs} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retries" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <RetryTimeline retries={retries} />
            </CardContent>
          </Card>
        </TabsContent>

        {isDone && (
          <TabsContent value="diagnostic" className="mt-4">
            <Card className="border-l-4 border-l-violet-500">
              <CardContent className="pt-6">
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
                            <span className="text-violet-400 shrink-0">•</span>
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
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No diagnostic yet.</p>
                    <Button variant="outline" onClick={handleDiagnose}>
                      <Sparkles className="h-4 w-4" />
                      Run AI Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="payload" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <pre className="rounded-md bg-muted/50 border p-4 text-sm font-mono text-foreground overflow-x-auto leading-relaxed">
                {(() => {
                  try { return JSON.stringify(JSON.parse(job.payload), null, 2) }
                  catch { return job.payload }
                })()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LogViewer({ logs }) {
  return (
    <div className="rounded-md border bg-muted/20 max-h-96 overflow-y-auto font-mono text-sm">
      {logs.map((l, i) => (
        <div key={l.id} className="flex gap-3 px-4 py-1.5 hover:bg-muted/30 border-b border-border/40 last:border-0">
          <span className="text-muted-foreground shrink-0 w-6 text-right text-xs select-none">{i + 1}</span>
          <span className="text-muted-foreground shrink-0 w-16 text-xs">
            {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className={`shrink-0 w-12 text-xs font-medium ${LOG_COLORS[l.level] || 'text-muted-foreground'}`}>
            {l.level}
          </span>
          <span className="text-foreground break-all flex-1">{l.message}</span>
        </div>
      ))}
    </div>
  )
}
