import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const JOB_TYPES = [
  {
    value: 'csv_processing',
    label: 'CSV Processing',
    desc: 'Validate and process CSV rows concurrently (8 workers)',
    defaultPayload: {
      rows: 200,
      source: 'transactions_q4.csv',
    },
  },
  {
    value: 'log_analysis',
    label: 'Log Analysis',
    desc: 'Parse log content, detect error patterns, extract stack traces',
    defaultPayload: {
      source: 'api-gateway',
      log_content: `[2024-01-15 10:23:41] INFO  server started on :8080
[2024-01-15 10:24:02] INFO  GET /api/users 200 12ms
[2024-01-15 10:24:15] WARN  database pool at 80% capacity (8/10)
[2024-01-15 10:24:31] ERROR nil pointer dereference in handler ServeHTTP
goroutine 47 [running]:
  net/http.(*ServeMux).ServeHTTP(0xc000128000, {0x1234560, 0xc0001b4000}, 0xc0002a8000)
    /usr/local/go/src/net/http/server.go:2547 +0x3b
[2024-01-15 10:24:31] ERROR context deadline exceeded during upstream RPC call
[2024-01-15 10:24:32] WARN  retrying request attempt=2
[2024-01-15 10:24:33] ERROR connection refused: dial tcp 10.0.0.5:5432
[2024-01-15 10:24:33] FATAL panic: runtime error: index out of range [5] with length 3`,
    },
  },
  {
    value: 'monitoring',
    label: 'Endpoint Monitor',
    desc: 'Real HTTP GET — checks status code, measures latency, optionally matches body',
    defaultPayload: {
      endpoint: 'https://httpbin.org/status/200',
      timeout_ms: 10000,
      expected_status: 200,
    },
  },
]

const PRIORITY_OPTS = ['low', 'normal', 'high']

export default function SubmitJob() {
  const navigate = useNavigate()
  const [type, setType] = useState('csv_processing')
  const [priority, setPriority] = useState('normal')
  const [maxRetries, setMaxRetries] = useState(3)
  const [scheduled, setScheduled] = useState('')
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(JOB_TYPES[0].defaultPayload, null, 2)
  )
  const [payloadErr, setPayloadErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectType = (t) => {
    setType(t)
    const jt = JOB_TYPES.find(j => j.value === t)
    setPayloadText(JSON.stringify(jt.defaultPayload, null, 2))
    setPayloadErr('')
  }

  const checkJson = (text) => {
    try { JSON.parse(text); setPayloadErr(''); return true }
    catch (e) { setPayloadErr(e.message); return false }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!checkJson(payloadText)) return
    setSubmitting(true); setError('')
    try {
      const body = {
        type, priority,
        max_retries: maxRetries,
        payload: JSON.parse(payloadText),
        ...(scheduled ? { scheduled_at: new Date(scheduled).toISOString() } : {}),
      }
      const job = await api.createJob(body)
      navigate(`/jobs/${job.id}`)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  const selected = JOB_TYPES.find(j => j.value === type)

  return (
    <div className="max-w-xl space-y-6">

      <div>
        <h1 className="text-base font-semibold text-zinc-100 tracking-tight">New Job</h1>
        <p className="text-zinc-600 text-xs font-mono mt-0.5">configure and enqueue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Job type */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Type</label>
          <div className="space-y-1.5">
            {JOB_TYPES.map(jt => (
              <button
                key={jt.value}
                type="button"
                onClick={() => selectType(jt.value)}
                className={`w-full text-left px-3.5 py-3 rounded-lg border text-xs transition-all ${
                  type === jt.value
                    ? 'border-zinc-500 bg-zinc-800/80'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 font-mono">{jt.value}</span>
                  {type === jt.value && (
                    <span className="text-zinc-400 text-2xs">selected</span>
                  )}
                </div>
                <p className="text-zinc-500 mt-0.5 text-2xs">{jt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Monitoring hint */}
        {type === 'monitoring' && (
          <div className="border border-amber-900/50 bg-amber-950/20 rounded px-3 py-2 text-xs text-amber-400/80 font-mono">
            Real HTTP request — try any URL. Invalid/unreachable hosts will fail with a real error.
          </div>
        )}

        {/* Priority + retries */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
            <div className="flex gap-1">
              {PRIORITY_OPTS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 h-8 text-xs font-mono rounded border transition-colors ${
                    priority === p
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Max Retries</label>
            <input
              type="number" min="0" max="10"
              value={maxRetries}
              onChange={e => setMaxRetries(+e.target.value)}
              className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded px-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Schedule <span className="text-zinc-600 font-normal">(optional — blank = immediate)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduled}
            onChange={e => setScheduled(e.target.value)}
            className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded px-3 text-xs font-mono text-zinc-400 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Payload */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-400">Payload</label>
            <span className={`text-2xs font-mono ${payloadErr ? 'text-red-400' : 'text-zinc-600'}`}>
              {payloadErr ? 'invalid json' : 'json'}
            </span>
          </div>
          <textarea
            rows={9}
            value={payloadText}
            onChange={e => { setPayloadText(e.target.value); checkJson(e.target.value) }}
            spellCheck={false}
            className={`w-full bg-zinc-950 border rounded px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none resize-none transition-colors leading-relaxed ${
              payloadErr ? 'border-red-800' : 'border-zinc-800 focus:border-zinc-600'
            }`}
          />
          {payloadErr && <p className="text-red-400 text-2xs font-mono mt-1">{payloadErr}</p>}
        </div>

        {error && (
          <div className="border border-red-900 bg-red-950/20 rounded px-3 py-2 text-xs text-red-400 font-mono">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting || !!payloadErr}
            className="h-8 px-4 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium rounded disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Enqueue job'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-8 px-4 text-xs font-medium text-zinc-500 hover:text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
