import React, { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import StatusBadge from '../components/StatusBadge'
import JobTypeTag from '../components/JobTypeTag'
import StatCard from '../components/StatCard'

const fmt = (ms) => {
  if (ms == null) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

const CHART_COLORS = {
  Queued:    '#3f3f46',
  Running:   '#3b82f6',
  Completed: '#22c55e',
  Failed:    '#ef4444',
  Scheduled: '#f59e0b',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs font-mono">
      <span className="text-zinc-400">{label}: </span>
      <span className="text-zinc-100">{payload[0].value}</span>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState(null)
  const [wsStatus, setWsStatus] = useState('connecting')
  // eslint-disable-next-line no-unused-vars
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

  // Initial load
  React.useEffect(() => { fetchAll(filter) }, [])

  // Re-fetch when filter changes
  const handleFilter = (f) => {
    setFilter(f)
    fetchAll(f)
  }

  // WebSocket — react to server-pushed events
  const handleWsMessage = useCallback((event) => {
    if (event.type === '_connected') { setWsStatus('connected'); return }
    if (['job_created', 'job_updated', 'job_deleted', 'jobs_seeded', 'job_diagnosed'].includes(event.type)) {
      fetchAll(filterRef.current)
    }
  }, [fetchAll])

  useWebSocket(handleWsMessage)

  const handleSeed = async () => {
    setSeeding(true)
    try { await api.seedJobs() }
    catch (e) { setError(e.message); setSeeding(false) }
    finally { setSeeding(false) }
  }

  const chartData = stats ? [
    { name: 'Queued',    value: stats.stats.queued },
    { name: 'Running',   value: stats.stats.running },
    { name: 'Completed', value: stats.stats.completed },
    { name: 'Failed',    value: stats.stats.failed },
    { name: 'Scheduled', value: stats.stats.scheduled },
  ] : []

  const filters = ['', 'queued', 'running', 'completed', 'failed', 'scheduled']

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Jobs</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-1 h-1 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <p className="text-zinc-600 text-xs font-mono">
              {wsStatus === 'connected' ? 'real-time' : 'connecting…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="h-8 px-3 text-xs font-medium text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded transition-colors disabled:opacity-40"
          >
            {seeding ? 'Seeding…' : 'Seed demo'}
          </button>
          <Link
            to="/submit"
            className="h-8 px-3 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white rounded transition-colors inline-flex items-center"
          >
            + New job
          </Link>
        </div>
      </div>

      {error && (
        <div className="border border-red-900 bg-red-950/30 rounded px-3 py-2 text-xs text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <StatCard label="total"     value={stats.stats.total}     />
          <StatCard label="queued"    value={stats.stats.queued}    sub={`${stats.queue_depth} buffered`} />
          <StatCard label="running"   value={stats.stats.running}   accent="text-blue-400"    sub={`${stats.active_workers} workers`} />
          <StatCard label="done"      value={stats.stats.completed} accent="text-emerald-400" />
          <StatCard label="failed"    value={stats.stats.failed}    accent="text-red-400"     />
          <StatCard label="scheduled" value={stats.stats.scheduled} accent="text-amber-400"   />
        </div>
      )}

      {/* Chart */}
      {stats && chartData.some(d => d.value > 0) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 pt-4 pb-3">
          <p className="text-zinc-500 text-2xs font-mono uppercase tracking-widest mb-3">distribution</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
              <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3f3f46', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={CHART_COLORS[d.name]} opacity={d.value === 0 ? 0.2 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map(s => (
          <button
            key={s}
            onClick={() => handleFilter(s)}
            className={`h-6 px-2.5 rounded text-2xs font-mono transition-colors ${
              filter === s
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            {s === '' ? 'all' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-zinc-600 text-xs font-mono">loading…</div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-zinc-600 text-xs font-mono">no jobs</p>
            <button onClick={handleSeed} className="text-zinc-500 hover:text-zinc-300 text-xs font-mono underline underline-offset-2">
              seed demo jobs →
            </button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                {['id', 'type', 'status', 'priority', 'retries', 'duration', 'worker', 'created'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-zinc-600 font-mono uppercase text-2xs tracking-widest first:pl-4">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className={`border-b border-zinc-800/60 hover:bg-zinc-900/60 transition-colors last:border-0 ${
                    job.status === 'running' ? 'bg-blue-950/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-zinc-500 text-2xs" title={job.id}>
                      {job.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><JobTypeTag type={job.type} /></td>
                  <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-2xs ${
                      job.priority === 'high' ? 'text-red-400' :
                      job.priority === 'low'  ? 'text-zinc-600' :
                                                 'text-zinc-500'
                    }`}>{job.priority}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-500 text-2xs">
                    {job.retry_count}/{job.max_retries}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400 text-2xs">
                    {fmt(job.duration_ms)}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600 text-2xs">
                    {job.worker_id || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600 text-2xs">
                    {fmtTime(job.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-zinc-500 hover:text-zinc-200 text-xs font-mono transition-colors"
                    >
                      view →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
