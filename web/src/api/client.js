const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getStats: () => request('/stats'),
  listJobs: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/jobs${q ? '?' + q : ''}`)
  },
  getJob: (id) => request(`/jobs/${id}`),
  createJob: (data) => request('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  retryJob: (id) => request(`/jobs/${id}/retry`, { method: 'POST' }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),
  diagnoseJob: (id) => request(`/jobs/${id}/diagnose`, { method: 'POST' }),
  seedJobs: () => request('/seed', { method: 'POST' }),
  health: () => request('/health'),
}
