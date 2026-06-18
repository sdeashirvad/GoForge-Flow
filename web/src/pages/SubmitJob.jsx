import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, ScrollText, Globe } from 'lucide-react'
import { api } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

const JOB_TYPES = [
  {
    value: 'csv_processing',
    label: 'CSV Processing',
    icon: FileSpreadsheet,
    desc: 'Validate and process CSV rows concurrently (8 workers)',
    defaultPayload: { rows: 200, source: 'transactions_q4.csv' },
  },
  {
    value: 'log_analysis',
    label: 'Log Analysis',
    icon: ScrollText,
    desc: 'Parse log content, detect error patterns, extract stack traces',
    defaultPayload: {
      source: 'api-gateway',
      log_content: `[2024-01-15 10:23:41] INFO  server started on :8080
[2024-01-15 10:24:02] INFO  GET /api/users 200 12ms
[2024-01-15 10:24:15] WARN  database pool at 80% capacity (8/10)
[2024-01-15 10:24:31] ERROR nil pointer dereference in handler ServeHTTP
[2024-01-15 10:24:33] ERROR connection refused: dial tcp 10.0.0.5:5432
[2024-01-15 10:24:33] FATAL panic: runtime error: index out of range`,
    },
  },
  {
    value: 'monitoring',
    label: 'Endpoint Monitor',
    icon: Globe,
    desc: 'Real HTTP GET — checks status code, measures latency',
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
    const jt = JOB_TYPES.find((j) => j.value === t)
    setPayloadText(JSON.stringify(jt.defaultPayload, null, 2))
    setPayloadErr('')
  }

  const checkJson = (text) => {
    try {
      JSON.parse(text)
      setPayloadErr('')
      return true
    } catch (e) {
      setPayloadErr(e.message)
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!checkJson(payloadText)) return
    setSubmitting(true)
    setError('')
    try {
      const body = {
        type,
        priority,
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

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        title="New Job"
        description="Configure and enqueue a job into the worker pool."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <Label>Job Type</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {JOB_TYPES.map((jt) => {
              const Icon = jt.icon
              const selected = type === jt.value
              return (
                <button
                  key={jt.value}
                  type="button"
                  onClick={() => selectType(jt.value)}
                  className={cn(
                    'text-left rounded-lg border p-4 transition-all',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/30'
                  )}
                >
                  <Icon className={cn('h-5 w-5 mb-2', selected ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="text-sm font-medium text-foreground">{jt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{jt.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {type === 'monitoring' && (
          <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-200">
            Real HTTP request — invalid or unreachable hosts will fail with a genuine error.
          </Alert>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {PRIORITY_OPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex-1 h-10 rounded-md border text-sm font-medium capitalize transition-colors',
                    priority === p
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-retries">Max Retries</Label>
            <Input
              id="max-retries"
              type="number"
              min="0"
              max="10"
              value={maxRetries}
              onChange={(e) => setMaxRetries(+e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule">
            Schedule <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="schedule"
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="payload">Payload (JSON)</Label>
            {payloadErr && <span className="text-xs text-destructive">Invalid JSON</span>}
          </div>
          <Textarea
            id="payload"
            rows={10}
            value={payloadText}
            onChange={(e) => { setPayloadText(e.target.value); checkJson(e.target.value) }}
            spellCheck={false}
            className="font-mono text-sm min-h-[200px]"
          />
          {payloadErr && <p className="text-xs text-destructive">{payloadErr}</p>}
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/')} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !!payloadErr} className="sm:flex-1 w-full">
            {submitting ? 'Enqueueing…' : 'Enqueue Job'}
          </Button>
        </div>
      </form>
    </div>
  )
}
