---
name: FlowForge Go environment setup
description: Key constraints and decisions for the FlowForge Go project in Replit
---

# FlowForge Go — Replit Setup Notes

## Blocked packages (Socket Security Policy)
- `github.com/jackc/pgx/v5` — all versions blocked
- `golang.org/x/crypto` — all versions blocked

**Why:** Replit's Socket Security Policy blocks these packages (firewall at package-firewall.replit.local). `pgx/v5` is the PostgreSQL driver used by `gorm.io/driver/postgres`. `x/crypto` is pulled in transitively by `go-playground/validator/v10` (used by Gin).

## Framework decision: chi instead of Gin
Switched from `github.com/gin-gonic/gin` to `github.com/go-chi/chi/v5` because Gin's validator dependency pulls in `golang.org/x/crypto` which is blocked.

**How to apply:** Use chi + standard `net/http` for all new HTTP handlers. Keep JSON encode/decode with standard library.

## PostgreSQL for local vs Docker
- **Replit dev:** SQLite only. `internal/storage/nopg.go` provides the `openPostgres` fallback (logs warning, uses SQLite).
- **Docker/Railway:** `Dockerfile` copies `go.mod.docker` (which includes postgres driver) and generates `internal/storage/postgres_impl.go` at build time, removing `nopg.go`.
- No `//go:build postgres` tagged files should exist in the repo because `go mod tidy` resolves them anyway.

## go.mod.docker
Separate go.mod for Docker builds that includes `gorm.io/driver/postgres`. Never run `go mod tidy` on this file in Replit (pgx/v5 blocked).

## Stack summary
- Go 1.25 + chi v5 + GORM + SQLite (dev) / PostgreSQL (prod)
- React 18 + Vite + TailwindCSS v3
- Workflow: `bash start.sh` → Go on :8080, Vite on :5000
