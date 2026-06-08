import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../api/client'
import { usePolling } from '../hooks/usePolling'
import StatusBadge from '../components/StatusBadge'
import JobTypeTag from '../components/JobTypeTag'
import StatCard from '../components/StatCard'

const fmt = (ms) => {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const [s, j] = await Promise.all([
        api.getStats(),
        api.listJobs(filter ? { status: filter } : {}),
      ])
      setStats(s)
      setJobs(j.jobs || [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  usePolling(refresh, 3000)

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.seedJobs()
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  const chartData = stats ? [
    { name: 'Queued',    value: stats.stats.queued,    fill: '#64748b' },
    { name: 'Running',   value: stats.stats.running,   fill: '#3b82f6' },
    { name: 'Completed', value: stats.stats.completed, fill: '#10b981' },
    { name: 'Failed',    value: stats.stats.failed,    fill: '#ef4444' },
    { name: 'Scheduled', value: stats.stats.scheduled, fill: '#f59e0b' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Live polling every 3s</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-medium transition-colors disabled:opacity-50 border border-slate-700"
          >
            {seeding ? 'Seeding...' : '🌱 Seed Demo Jobs'}
          </button>
          <Link
            to="/submit"
            className="px-4 py-2 bg-forge-600 hover:bg-forge-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + New Job
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.stats.total} color="slate" />
          <StatCard label="Queued" value={stats.stats.queued} sub={`${stats.queue_depth} in channel`} color="slate" />
          <StatCard label="Running" value={stats.stats.running} sub={`${stats.active_workers} active workers`} color="blue" />
          <StatCard label="Completed" value={stats.stats.completed} color="emerald" />
          <StatCard label="Failed" value={stats.stats.failed} color="red" />
          <StatCard label="Scheduled" value={stats.stats.scheduled} color="amber" />
        </div>
      )}

      {/* Chart */}
      {stats && chartData.some(d => d.value > 0) && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Job Status Distribution</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500">Filter:</span>
        {['', 'queued', 'running', 'completed', 'failed', 'scheduled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-forge-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm mb-3">No jobs found.</p>
            <button
              onClick={handleSeed}
              className="text-forge-400 hover:text-forge-300 text-sm underline"
            >
              Seed demo jobs to get started
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Job ID</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Priority</th>
                  <th className="px-4 py-3 text-left font-medium">Retries</th>
                  <th className="px-4 py-3 text-left font-medium">Duration</th>
                  <th className="px-4 py-3 text-left font-medium">Worker</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <tr
                    key={job.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                      i % 2 === 0 ? '' : 'bg-slate-900/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-400" title={job.id}>
                        {job.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3"><JobTypeTag type={job.type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        job.priority === 'high' ? 'text-red-400' :
                        job.priority === 'low'  ? 'text-slate-500' :
                                                   'text-slate-400'
                      }`}>{job.priority}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {job.retry_count}/{job.max_retries}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {fmt(job.duration_ms)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {job.worker_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {fmtDate(job.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-forge-400 hover:text-forge-300 text-xs font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
