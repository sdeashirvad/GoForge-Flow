import React, { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { usePolling } from '../hooks/usePolling'
import StatusBadge from '../components/StatusBadge'
import JobTypeTag from '../components/JobTypeTag'

const fmt = (ms) => {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—'

const logLevelColor = {
  INFO:  'text-slate-400',
  WARN:  'text-amber-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-slate-600',
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

  const isActive = data?.job?.status === 'running' || data?.job?.status === 'queued'

  const refresh = useCallback(async () => {
    try {
      const d = await api.getJob(id)
      setData(d)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  usePolling(refresh, 3000, isActive || loading)

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

  const handleDelete = async () => {
    if (!confirm('Delete this job and all its logs?')) return
    setDeleting(true)
    try {
      await api.deleteJob(id)
      navigate('/')
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
      Loading job...
    </div>
  )

  if (error && !data) return (
    <div className="space-y-4">
      <div className="bg-red-900/30 border border-red-800 rounded-md p-4 text-red-300 text-sm">{error}</div>
      <Link to="/" className="text-forge-400 text-sm">← Back to dashboard</Link>
    </div>
  )

  const { job, logs = [], retries = [], diagnostic } = data || {}

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <Link to="/" className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1">
        ← Dashboard
      </Link>

      {/* Job header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <JobTypeTag type={job.type} />
              <StatusBadge status={job.status} />
              <span className={`text-xs font-medium ${
                job.priority === 'high' ? 'text-red-400' :
                job.priority === 'low'  ? 'text-slate-500' :
                                           'text-slate-400'
              }`}>{job.priority}</span>
            </div>
            <p className="font-mono text-xs text-slate-500">{job.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {job.status === 'failed' && (
              <>
                <button
                  onClick={handleDiagnose}
                  disabled={diagLoading}
                  className="px-3 py-1.5 bg-violet-900/50 hover:bg-violet-800/50 border border-violet-700 text-violet-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {diagLoading ? 'Analysing...' : '🤖 AI Diagnose'}
                </button>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-700 text-blue-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {retrying ? 'Retrying...' : '↻ Retry'}
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Worker</p>
            <p className="font-mono text-xs text-slate-400">{job.worker_id || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Duration</p>
            <p className="font-mono text-sm text-white">{fmt(job.duration_ms)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Retries</p>
            <p className="font-mono text-sm text-white">{job.retry_count} / {job.max_retries}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Created</p>
            <p className="text-xs text-slate-400">{fmtDate(job.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Started</p>
            <p className="text-xs text-slate-400">{fmtDate(job.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Completed</p>
            <p className="text-xs text-slate-400">{fmtDate(job.completed_at)}</p>
          </div>
          {job.scheduled_at && (
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Scheduled</p>
              <p className="text-xs text-slate-400">{fmtDate(job.scheduled_at)}</p>
            </div>
          )}
        </div>

        {job.error_message && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
            <p className="text-xs text-red-500 uppercase tracking-wide mb-1">Error</p>
            <p className="font-mono text-xs text-red-300">{job.error_message}</p>
          </div>
        )}
      </div>

      {/* AI Diagnostic */}
      {diagnostic && (
        <div className="bg-slate-900 border border-violet-800/50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🤖</span>
            <h2 className="text-sm font-semibold text-violet-300">AI Diagnostic</h2>
            <span className="text-xs text-slate-600 font-mono">· {diagnostic.model_used}</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-sm text-white">{diagnostic.summary}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Root Cause</p>
              <p className="text-sm text-slate-300">{diagnostic.root_cause}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Suggestions</p>
              <ul className="space-y-1">
                {diagnostic.suggestions.split('|').map((s, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">→</span>
                    {s.trim()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Retry history */}
      {retries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Retry History <span className="text-slate-600 font-normal">({retries.length} attempts)</span>
          </h2>
          <div className="space-y-2">
            {retries.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-4 text-xs border-l-2 border-red-800 pl-3 py-1">
                <div>
                  <span className="text-slate-500">Attempt #{r.attempt_num}</span>
                  <p className="font-mono text-red-300 mt-0.5">{r.error_msg}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-slate-500">{fmtDate(r.failed_at)}</p>
                  {r.backoff_secs > 0 && (
                    <p className="text-amber-600">backoff: {r.backoff_secs}s</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          Execution Logs <span className="text-slate-600 font-normal">({logs.length} entries)</span>
        </h2>
        {logs.length === 0 ? (
          <p className="text-slate-600 text-sm">No logs yet.</p>
        ) : (
          <div className="bg-[#0a0c14] rounded-md p-3 max-h-96 overflow-y-auto font-mono text-xs space-y-0.5">
            {logs.map((l) => (
              <div key={l.id} className="flex gap-3 hover:bg-white/[0.02] px-1 py-0.5 rounded">
                <span className="text-slate-700 shrink-0 select-none">
                  {new Date(l.created_at).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 w-12 ${logLevelColor[l.level] || 'text-slate-500'}`}>
                  {l.level}
                </span>
                <span className="text-slate-300">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw payload */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Payload</h2>
        <pre className="bg-[#0a0c14] rounded-md p-3 text-xs font-mono text-slate-400 overflow-x-auto">
          {(() => {
            try { return JSON.stringify(JSON.parse(job.payload), null, 2) }
            catch { return job.payload }
          })()}
        </pre>
      </div>
    </div>
  )
}
