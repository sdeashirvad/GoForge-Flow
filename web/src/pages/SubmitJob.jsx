import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const jobTypes = [
  {
    value: 'csv_processing',
    label: 'CSV Processing',
    icon: '📊',
    description: 'Validate and process CSV rows concurrently',
    defaultPayload: { rows: 150, source: 'transactions_export.csv' },
  },
  {
    value: 'log_analysis',
    label: 'Log Analysis',
    icon: '🔍',
    description: 'Categorize log entries, identify root cause',
    defaultPayload: { source: 'api-gateway', log_content: 'sample application logs' },
  },
  {
    value: 'monitoring',
    label: 'Endpoint Monitor',
    icon: '📡',
    description: 'Health check a remote endpoint with retry',
    defaultPayload: { endpoint: 'https://api.example.com/health', timeout_ms: 5000 },
  },
]

export default function SubmitJob() {
  const navigate = useNavigate()
  const [type, setType] = useState('csv_processing')
  const [priority, setPriority] = useState('normal')
  const [maxRetries, setMaxRetries] = useState(3)
  const [scheduled, setScheduled] = useState('')
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(jobTypes[0].defaultPayload, null, 2)
  )
  const [payloadError, setPayloadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleTypeChange = (t) => {
    setType(t)
    const jt = jobTypes.find(j => j.value === t)
    setPayloadText(JSON.stringify(jt.defaultPayload, null, 2))
    setPayloadError('')
  }

  const validatePayload = (text) => {
    try {
      JSON.parse(text)
      setPayloadError('')
      return true
    } catch (e) {
      setPayloadError('Invalid JSON: ' + e.message)
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validatePayload(payloadText)) return

    setSubmitting(true)
    setError('')
    try {
      const data = {
        type,
        priority,
        max_retries: maxRetries,
        payload: JSON.parse(payloadText),
      }
      if (scheduled) {
        data.scheduled_at = new Date(scheduled).toISOString()
      }
      const job = await api.createJob(data)
      navigate(`/jobs/${job.id}`)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Submit Job</h1>
        <p className="text-slate-500 text-sm mt-1">Configure and enqueue a new job</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Job type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Job Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {jobTypes.map(jt => (
              <button
                key={jt.value}
                type="button"
                onClick={() => handleTypeChange(jt.value)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  type === jt.value
                    ? 'border-forge-500 bg-forge-900/30 ring-1 ring-forge-500'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div className="text-lg mb-1">{jt.icon}</div>
                <div className="text-sm font-medium text-white">{jt.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{jt.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Priority + retries row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-forge-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Max Retries</label>
            <input
              type="number"
              min="0"
              max="10"
              value={maxRetries}
              onChange={e => setMaxRetries(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-forge-500"
            />
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Schedule At <span className="text-slate-600 font-normal">(optional — leave blank to run immediately)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduled}
            onChange={e => setScheduled(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-forge-500"
          />
        </div>

        {/* Payload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Payload <span className="text-slate-600 font-normal">(JSON)</span>
          </label>
          <textarea
            rows={7}
            value={payloadText}
            onChange={e => {
              setPayloadText(e.target.value)
              validatePayload(e.target.value)
            }}
            className={`w-full bg-slate-900 border rounded-md px-3 py-2 text-sm font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-forge-500 resize-none ${
              payloadError ? 'border-red-700' : 'border-slate-700'
            }`}
          />
          {payloadError && (
            <p className="text-red-400 text-xs mt-1">{payloadError}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !!payloadError}
            className="px-6 py-2.5 bg-forge-600 hover:bg-forge-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Job'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-medium transition-colors border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
