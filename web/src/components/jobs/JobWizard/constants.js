export const JOB_TYPES = [
  {
    value: 'csv_processing',
    label: 'CSV Processing',
    desc: 'Validate and process CSV rows concurrently (8 workers)',
    defaultPayload: { rows: 200, source: 'transactions_q4.csv' },
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
[2024-01-15 10:24:33] ERROR connection refused: dial tcp 10.0.0.5:5432
[2024-01-15 10:24:33] FATAL panic: runtime error: index out of range`,
    },
  },
  {
    value: 'monitoring',
    label: 'Endpoint Monitor',
    desc: 'Real HTTP GET — checks status code, measures latency',
    defaultPayload: {
      endpoint: 'https://httpbin.org/status/200',
      timeout_ms: 10000,
      expected_status: 200,
    },
  },
]

export const WIZARD_STEPS = [
  { id: 'metadata', label: 'Metadata' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'priority', label: 'Priority' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'retry', label: 'Retry policy' },
  { id: 'preview', label: 'Preview' },
  { id: 'confirm', label: 'Confirm' },
]

export const PRIORITY_OPTS = ['low', 'normal', 'high']
