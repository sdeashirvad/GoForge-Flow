import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Panel } from '@/components/design-system/Panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { WizardSteps, ICONS } from '@/components/jobs/JobWizard/WizardSteps'
import { JOB_TYPES, WIZARD_STEPS, PRIORITY_OPTS } from '@/components/jobs/JobWizard/constants'

export default function SubmitJob() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [label, setLabel] = useState('')
  const [type, setType] = useState('csv_processing')
  const [priority, setPriority] = useState('normal')
  const [maxRetries, setMaxRetries] = useState(3)
  const [scheduled, setScheduled] = useState('')
  const [payload, setPayload] = useState(JOB_TYPES[0].defaultPayload)
  const [payloadText, setPayloadText] = useState(JSON.stringify(JOB_TYPES[0].defaultPayload, null, 2))
  const [payloadErr, setPayloadErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectType = (t) => {
    setType(t)
    const jt = JOB_TYPES.find((j) => j.value === t)
    setPayload(jt.defaultPayload)
    setPayloadText(JSON.stringify(jt.defaultPayload, null, 2))
    setPayloadErr('')
  }

  const syncPayload = useCallback((updates) => {
    const next = { ...payload, ...updates }
    if (label) next._label = label
    setPayload(next)
    setPayloadText(JSON.stringify(next, null, 2))
    setPayloadErr('')
  }, [payload, label])

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

  const buildBody = () => {
    const p = { ...JSON.parse(payloadText) }
    if (label) p._label = label
    return {
      type,
      priority,
      max_retries: maxRetries,
      payload: p,
      ...(scheduled ? { scheduled_at: new Date(scheduled).toISOString() } : {}),
    }
  }

  const handleSubmit = async () => {
    if (!checkJson(payloadText)) return
    setSubmitting(true)
    setError('')
    try {
      const job = await api.createJob(buildBody())
      toast.success('Job enqueued', { description: `Job ${job.id.slice(0, 8)} created` })
      navigate(`/jobs/${job.id}`)
    } catch (e) {
      setError(e.message)
      toast.error('Failed to enqueue', { description: e.message })
      setSubmitting(false)
    }
  }

  const next = () => {
    if (step === 5 && !checkJson(payloadText)) return
    if (step < WIZARD_STEPS.length - 1) setStep(step + 1)
    else handleSubmit()
  }

  const back = () => {
    if (step > 0) setStep(step - 1)
    else navigate('/')
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Label htmlFor="label">Job label (optional)</Label>
            <Input
              id="label"
              placeholder="e.g. Q4 transaction import"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Stored in payload metadata for identification. Does not affect execution.
            </p>
          </div>
        )
      case 1:
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            {JOB_TYPES.map((jt) => {
              const Icon = ICONS[jt.value]
              const selected = type === jt.value
              return (
                <button
                  key={jt.value}
                  type="button"
                  onClick={() => selectType(jt.value)}
                  className={cn(
                    'text-left rounded-lg border p-4 transition-all min-h-[44px]',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  )}
                >
                  <Icon className={cn('h-5 w-5 mb-2', selected ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="text-sm font-medium">{jt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{jt.desc}</p>
                </button>
              )
            })}
          </div>
        )
      case 2:
        return (
          <div className="flex gap-2">
            {PRIORITY_OPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  'flex-1 h-12 rounded-lg border text-sm font-medium capitalize transition-all min-h-[44px]',
                  priority === p
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule (optional)</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
              />
            </div>
            {type === 'monitoring' && (
              <Alert>Real HTTP request — unreachable hosts will fail with genuine errors.</Alert>
            )}
          </div>
        )
      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-retries">Max retries</Label>
              <Input
                id="max-retries"
                type="number"
                min="0"
                max="10"
                value={maxRetries}
                onChange={(e) => setMaxRetries(+e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Failed jobs re-queue with exponential backoff: 2s, 4s, 8s… up to max retries.
            </p>
            {type === 'csv_processing' && (
              <div className="space-y-2">
                <Label>Row count</Label>
                <Input
                  type="number"
                  value={payload.rows || 200}
                  onChange={(e) => syncPayload({ rows: +e.target.value })}
                />
              </div>
            )}
            {type === 'monitoring' && (
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input
                  value={payload.endpoint || ''}
                  onChange={(e) => syncPayload({ endpoint: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Payload (JSON)</Label>
              <Textarea
                rows={8}
                value={payloadText}
                onChange={(e) => { setPayloadText(e.target.value); checkJson(e.target.value) }}
                className="font-mono text-sm"
                spellCheck={false}
              />
              {payloadErr && <p className="text-xs text-destructive">{payloadErr}</p>}
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><span className="text-muted-foreground">Type:</span> {type}</div>
              <div><span className="text-muted-foreground">Priority:</span> {priority}</div>
              <div><span className="text-muted-foreground">Max retries:</span> {maxRetries}</div>
              <div><span className="text-muted-foreground">Scheduled:</span> {scheduled || 'Immediate'}</div>
              {label && <div className="sm:col-span-2"><span className="text-muted-foreground">Label:</span> {label}</div>}
            </div>
            <pre className="rounded-lg bg-muted/30 border p-4 font-mono text-xs overflow-x-auto">
              {payloadText}
            </pre>
          </div>
        )
      case 6:
        return (
          <div className="text-center space-y-4 py-4">
            <p className="text-muted-foreground">
              Ready to enqueue this job into the worker pool.
            </p>
            {error && <Alert variant="destructive">{error}</Alert>}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        title="New Job"
        description="Step-by-step wizard to configure and enqueue a workflow job."
      />

      <WizardSteps currentStep={step} />

      <Panel title={WIZARD_STEPS[step].label}>
        {renderStep()}
      </Panel>

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button type="button" variant="outline" onClick={back} className="sm:w-auto w-full">
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          type="button"
          onClick={next}
          disabled={submitting || (step === 4 && !!payloadErr)}
          className="sm:flex-1 w-full"
        >
          {step === WIZARD_STEPS.length - 1
            ? (submitting ? 'Enqueueing…' : 'Enqueue Job')
            : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
