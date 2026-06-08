import React, { useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import StatusBadge from '../components/StatusBadge'
import JobTypeTag from '../components/JobTypeTag'

const fmt = (ms) => ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(3)}s`
const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—'

const LOG_COLORS = {
  INFO:  'text-zinc-400',
  WARN:  'text-amber-400',
  ERROR: 'text-red-400',
  FATAL: 'text-red-300 font-medium',
  DEBUG: 'text-zinc-600',
}

function Section({ title, badge, action, children }) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
        <span className="text-xs font-medium text-zinc-400 font-mono">{title}</span>
        <div className="flex items-center gap-3">
          {badge != null && <span className="text-zinc-600 text-2xs font-mono">{badge}</span>}
          {action}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value, mono = false }) {
  return (
    <div className="space-y-0.5">
      <p className="text-zinc-600 text-2xs font-mono uppercase tracking-widest">{label}</p>
      <p className={`text-xs ${mono ? 'font-mono text-zinc-300' : 'text-zinc-300'}`}>{value || '—'}</p>
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
  const idRef = useRef(id)

  const job = data?.job

  const refresh = useCallback(async () => {
    try {
      setData(await api.getJob(idRef.current))
      setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { refresh() }, [refresh])

  // WebSocket — update this job when server pushes changes
  const handleWsMessage = useCallback((event) => {
    if (event.type === 'job_updated' && event.payload?.id === idRef.current) {
      refresh()
    }
    if (event.type === 'job_diagnosed' && event.payload?.job_id === idRef.current) {
      refresh()
    }
    if (event.type === 'job_deleted' && event.payload?.id === idRef.current) {
      navigate('/')
    }
  }, [refresh, navigate])

  useWebSocket(handleWsMessage)

  const handleDiagnose = async () => {
    setDiagLoading(true)
    try {
      await api.diagnoseJob(id)
      await refresh()
    } catch (e) { setError(e.message) }
    finally { setDiagLoading(false) }
  }

  const handleRetry = async () => {
    setRetrying(true)
    try { await api.retryJob(id); await refresh() }
    catch (e) { setError(e.message) }
    finally { setRetrying(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await api.deleteJob(id); navigate('/') }
    catch (e) { setError(e.message); setDeleting(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-zinc-600 text-xs font-mono">loading…</div>
  )
  if (error && !data) return (
    <div className="space-y-4">
      <div className="border border-red-900 bg-red-950/20 rounded px-3 py-2 text-xs text-red-400 font-mono">{error}</div>
      <Link to="/" className="text-zinc-500 text-xs font-mono hover:text-zinc-300">← dashboard</Link>
    </div>
  )

  const { logs = [], retries = [], diagnostic } = data || {}
  const isFailed = job?.status === 'failed'
  const isDone = job?.status === 'completed' || job?.status === 'failed'

  return (
    <div className="space-y-4 max-w-4xl">

      {/* Breadcrumb */}
      <Link to="/" className="text-zinc-600 text-xs font-mono hover:text-zinc-400 transition-colors">
        ← jobs
      </Link>

      {/* Job header card */}
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/20">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <JobTypeTag type={job.type} />
              <StatusBadge status={job.status} />
              <span className={`text-2xs font-mono ${
                job.priority === 'high' ? 'text-red-400' :
                job.priority === 'low'  ? 'text-zinc-600' :
                                           'text-zinc-500'
              }`}>{job.priority}</span>
            </div>
            <p className="font-mono text-zinc-600 text-2xs">{job.id}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isDone && (
              <button
                onClick={handleDiagnose}
                disabled={diagLoading}
                className="h-7 px-3 text-xs font-mono text-violet-400 bg-violet-950/40 border border-violet-800/60 rounded hover:bg-violet-900/40 disabled:opacity-40 transition-colors"
              >
                {diagLoading ? 'analysing…' : diagnostic ? '↺ re-diagnose' : 'ai diagnose'}
              </button>
            )}
            {isFailed && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="h-7 px-3 text-xs font-mono text-blue-400 bg-blue-950/40 border border-blue-800/60 rounded hover:bg-blue-900/40 disabled:opacity-40 transition-colors"
              >
                {retrying ? 'retrying…' : 'retry'}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-7 px-3 text-xs font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 rounded hover:text-red-400 hover:border-red-900 disabled:opacity-40 transition-colors"
            >
              {deleting ? 'deleting…' : 'delete'}
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-zinc-800">
          <KV label="worker"   value={job.worker_id} mono />
          <KV label="duration" value={fmt(job.duration_ms)} mono />
          <KV label="retries"  value={`${job.retry_count} / ${job.max_retries}`} mono />
          <KV label="created"  value={fmtDate(job.created_at)} />
          <KV label="started"  value={fmtDate(job.started_at)} />
          <KV label="finished" value={fmtDate(job.completed_at)} />
          {job.scheduled_at && <KV label="scheduled" value={fmtDate(job.scheduled_at)} />}
        </div>

        {job.error_message && (
          <div className="mt-3 px-3 py-2 bg-red-950/20 border border-red-900/50 rounded">
            <p className="text-2xs text-red-600 font-mono uppercase tracking-widest mb-1">error</p>
            <p className="text-xs font-mono text-red-300">{job.error_message}</p>
          </div>
        )}
      </div>

      {/* AI Diagnostic — shown for completed AND failed */}
      {isDone && (
        <Section
          title="ai diagnostic"
          badge={diagnostic?.model_used}
          action={
            <button
              onClick={handleDiagnose}
              disabled={diagLoading}
              className="text-2xs font-mono text-violet-500 hover:text-violet-300 disabled:opacity-40 transition-colors"
            >
              {diagLoading ? 'running…' : diagnostic ? '↺ regenerate' : 'run analysis'}
            </button>
          }
        >
          {diagLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <span className="w-3 h-3 border border-violet-600 border-t-transparent rounded-full animate-spin" />
              querying llama-3.1-8b-instant…
            </div>
          ) : diagnostic ? (
            <div className="space-y-3">
              <div>
                <p className="text-2xs font-mono text-zinc-600 uppercase tracking-widest mb-1">summary</p>
                <p className="text-xs text-zinc-200">{diagnostic.summary}</p>
              </div>
              <div>
                <p className="text-2xs font-mono text-zinc-600 uppercase tracking-widest mb-1">root cause</p>
                <p className="text-xs text-zinc-400">{diagnostic.root_cause}</p>
              </div>
              <div>
                <p className="text-2xs font-mono text-zinc-600 uppercase tracking-widest mb-1">suggestions</p>
                <ul className="space-y-1">
                  {diagnostic.suggestions.split('|').map((s, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                      <span className="text-violet-600 shrink-0 mt-0.5">›</span>
                      {s.trim()}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-zinc-700 text-2xs font-mono pt-1">
                generated {fmtDate(diagnostic.created_at)}
              </p>
            </div>
          ) : (
            <div className="text-center py-4 space-y-2">
              <p className="text-zinc-600 text-xs font-mono">no diagnostic yet</p>
              <button
                onClick={handleDiagnose}
                className="text-violet-500 hover:text-violet-300 text-xs font-mono underline underline-offset-2 transition-colors"
              >
                run ai analysis →
              </button>
            </div>
          )}
        </Section>
      )}

      {/* Retry history */}
      {retries.length > 0 && (
        <Section title="retry history" badge={`${retries.length} attempts`}>
          <div className="space-y-2">
            {retries.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-4 border-l-2 border-zinc-700 pl-3 py-0.5">
                <div>
                  <span className="text-zinc-600 text-2xs font-mono">attempt #{r.attempt_num}</span>
                  <p className="text-xs font-mono text-red-400 mt-0.5">{r.error_msg}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-zinc-600 text-2xs font-mono">{fmtDate(r.failed_at)}</p>
                  {r.backoff_secs > 0 && (
                    <p className="text-amber-600 text-2xs font-mono">+{r.backoff_secs}s backoff</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Execution logs */}
      <Section title="execution logs" badge={`${logs.length} entries`}>
        {logs.length === 0 ? (
          <p className="text-zinc-600 text-xs font-mono">no logs yet</p>
        ) : (
          <div className="bg-zinc-950 rounded border border-zinc-800/60 p-3 max-h-80 overflow-y-auto space-y-0.5">
            {logs.map(l => (
              <div key={l.id} className="flex gap-3 hover:bg-zinc-800/20 px-1 py-0.5 rounded">
                <span className="text-zinc-700 text-2xs font-mono shrink-0 select-none w-20 text-right">
                  {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`text-2xs font-mono shrink-0 w-10 ${LOG_COLORS[l.level] || 'text-zinc-500'}`}>
                  {l.level}
                </span>
                <span className="text-xs font-mono text-zinc-300 break-all">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Payload */}
      <Section title="payload">
        <pre className="bg-zinc-950 rounded border border-zinc-800/60 p-3 text-2xs font-mono text-zinc-400 overflow-x-auto leading-relaxed">
          {(() => { try { return JSON.stringify(JSON.parse(job.payload), null, 2) } catch { return job.payload } })()}
        </pre>
      </Section>
    </div>
  )
}
