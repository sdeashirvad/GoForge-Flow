# ── Stage 1: Build React frontend ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# ── Stage 2: Build Go binary (with PostgreSQL support) ─────────────────────────
FROM golang:1.23-alpine AS go-builder
WORKDIR /app

# Use the Docker-specific go.mod which includes gorm postgres driver
COPY go.mod.docker go.mod
RUN go mod download

COPY . .

# Replace the SQLite-only fallback with a real Postgres opener
RUN rm -f internal/storage/nopg.go && \
    printf 'package storage\nimport ("gorm.io/driver/postgres"\n"gorm.io/gorm")\nfunc openPostgres(dsn string, cfg *gorm.Config) (*gorm.DB, error) {\nreturn gorm.Open(postgres.Open(dsn), cfg)\n}\n' \
    > internal/storage/postgres_impl.go

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /flowforge ./cmd/server

# ── Stage 3: Minimal final image ────────────────────────────────────────────────
FROM alpine:3.20
WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=go-builder /flowforge ./flowforge
COPY --from=frontend-builder /app/web/dist ./web/dist

ENV STATIC_DIR=/app/web/dist

EXPOSE 8080

ENTRYPOINT ["./flowforge"]
