# ⚡ FlowForge Go

A production-style **async job orchestration platform** built in Go — demonstrating concurrency patterns, worker pools, retry engines, structured logging, and AI-assisted failure diagnostics.

> Built as a high-signal portfolio project for backend/distributed systems engineering roles.

---

## Overview

FlowForge Go is a full-stack system where users submit jobs, monitor execution in real time, inspect logs, retry failures, and view AI-generated diagnostics. Everything runs as a single deployable container.

**Tech stack:** Go 1.23 · Gin · GORM · PostgreSQL/SQLite · React · Vite · TailwindCSS

---

## Features

| Feature | Details |
|---|---|
| **Job Submission** | REST API to create jobs with type, payload, priority, retry count, and optional schedule |
| **Worker Pool** | Configurable goroutine pool with channel-based job dispatch and worker IDs |
| **Retry Engine** | Exponential backoff (`2^n` seconds, capped at 60s), persisted retry history |
| **Scheduler** | Background poller dispatches scheduled jobs when their time arrives |
| **Graceful Shutdown** | Context cancellation, worker draining, clean HTTP shutdown |
| **Structured Logging** | JSON logs via `log/slog` — request IDs, job IDs, timings |
| **AI Diagnostics** | Mock diagnostics out of the box; Groq LLM integration with `GROQ_API_KEY` |
| **Live Dashboard** | React frontend with 3s polling, status charts, job table, log viewer |

---

## Architecture

```
flowforge-go/
├── cmd/server/          # Entrypoint: wires all components, starts HTTP + workers
├── internal/
│   ├── api/             # Gin handlers + route registration
│   ├── workers/         # Worker pool (goroutines + channels)
│   ├── jobs/            # Job type executors (CSV, log analysis, monitoring)
│   ├── scheduler/       # Scheduled job poller
│   ├── queue/           # JobQueue interface + in-memory implementation
│   ├── storage/         # GORM models + DB init + migrations
│   ├── ai/              # Mock + Groq LLM diagnostics engine
│   └── middleware/      # Request ID injection, structured access logging
└── web/                 # React + Vite + TailwindCSS frontend
```

### Concurrency model

```
HTTP handler ──► JobQueue (buffered channel, 512 cap)
                     │
          ┌──────────┴──────────┐
       Worker-01 ... Worker-N    ← configurable pool size
          │
     Executor.Execute()          ← per-job-type logic
          │
    ┌─────┴──────┐
  success     failure
    │              │
  COMPLETED    retry with
             exp. backoff
                   │
             max retries hit?
                   │
               FAILED + async
               AI diagnostic
```

---

## Local Development

### Prerequisites

- Go 1.23+
- Node.js 20+

### Backend only

```bash
cp .env.example .env
go run ./cmd/server
# API available at http://localhost:8080
```

### Frontend only (with API proxy)

```bash
cd web
npm install
npm run dev
# Dev server at http://localhost:5000, proxies /api → :8080
```

### Both together

```bash
chmod +x start.sh
./start.sh
```

---

## Docker Build & Run

### Build

```bash
docker build -t flowforge-go .
```

### Run locally with SQLite

```bash
docker run -p 8080:8080 flowforge-go
```

### Run with PostgreSQL

```bash
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://user:password@host:5432/flowforge" \
  -e PORT=8080 \
  flowforge-go
```

### Run with AI diagnostics (Groq)

```bash
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://..." \
  -e GROQ_API_KEY="gsk_..." \
  flowforge-go
```

---

## Railway Deployment

### Step-by-step

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project**
3. Click **Add a Service** → **Database** → **PostgreSQL**
4. Click **Add a Service** → **GitHub Repo** → select this repo
5. Railway auto-detects the `Dockerfile` and builds it
6. In the app service settings → **Variables**, add:
   ```
   DATABASE_URL   = ${{Postgres.DATABASE_URL}}   ← Railway variable reference
   PORT           = ${{PORT}}                     ← Railway injects this automatically
   GROQ_API_KEY   = gsk_...                       ← optional
   ```
7. Click **Deploy**

### How `PORT` works on Railway

Railway injects `PORT` automatically into every service. The app reads `os.Getenv("PORT")` and binds to `0.0.0.0:$PORT`. You do not need to hard-code a port.

### How `DATABASE_URL` works

When you add a PostgreSQL service on Railway, it exposes `DATABASE_URL` as a connection string. Use the Railway variable reference `${{Postgres.DATABASE_URL}}` to link it to your app service. Migrations run automatically on startup via GORM AutoMigrate.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | _(none)_ | PostgreSQL connection string. If unset, SQLite is used locally. |
| `PORT` | `8080` | HTTP listen port |
| `WORKER_COUNT` | `5` | Number of goroutine workers in the pool |
| `STATIC_DIR` | `./web/dist` | Path to built frontend assets |
| `GROQ_API_KEY` | _(none)_ | Groq API key for LLM diagnostics. Without it, mock diagnostics are used and all other flows work normally. |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check — DB status, Groq status, queue depth |
| `GET` | `/api/stats` | Job counts by status, queue depth, active workers |
| `POST` | `/api/jobs` | Create and enqueue a job |
| `GET` | `/api/jobs` | List jobs (filter by `status`, `type`; paginate with `page`, `limit`) |
| `GET` | `/api/jobs/:id` | Job detail — metadata, logs, retry history, diagnostic |
| `POST` | `/api/jobs/:id/retry` | Re-enqueue a failed job |
| `DELETE` | `/api/jobs/:id` | Delete job and all associated data |
| `POST` | `/api/jobs/:id/diagnose` | Trigger AI diagnostic generation |
| `POST` | `/api/seed` | Seed demo jobs for local exploration |

### Create job payload example

```json
{
  "type": "csv_processing",
  "priority": "high",
  "max_retries": 3,
  "payload": {
    "rows": 500,
    "source": "transactions_q4.csv"
  }
}
```

Valid job types: `csv_processing`, `log_analysis`, `monitoring`

---

## Job Lifecycle

```
QUEUED → RUNNING → COMPLETED
                 ↘
                FAILED (retry?) → QUEUED (backoff)
                               → FAILED (max retries) → AI Diagnostic generated
```

Scheduled jobs start in `SCHEDULED` status and are dispatched to `QUEUED` by the scheduler when their `scheduled_at` time arrives.

---

## Future Improvements

- **Persistent queue**: Replace in-memory channel with Redis Streams or NATS for durability across restarts
- **Job priorities**: Implement priority queue with heap-based ordering
- **Webhook notifications**: POST to a URL when job status changes
- **Rate limiting**: Per-client job submission throttling
- **Metrics endpoint**: Prometheus `/metrics` with job throughput, latency histograms, worker utilization
- **Dead letter queue**: Separate storage for permanently failed jobs with manual inspection tools
- **Job dependencies**: DAG-style job chaining (job B runs only after job A completes)
- **Auth layer**: JWT-based API authentication
- **Real-time updates**: WebSocket push instead of client-side polling
