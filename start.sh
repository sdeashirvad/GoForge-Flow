#!/bin/bash
# Start script for Replit development
# Runs both the Go API backend (port 8080) and Vite frontend (port 5000)

set -e

echo "==> Starting FlowForge Go"

# Build frontend deps if needed
if [ ! -d "web/node_modules" ]; then
  echo "==> Installing frontend dependencies..."
  cd web && npm install && cd ..
fi

# Start Go backend on port 8080 in background
echo "==> Starting Go API server on :8080"
PORT=8080 go run ./cmd/server &
GO_PID=$!

# Start Vite dev server on port 5000 (proxies /api to :8080)
echo "==> Starting Vite dev server on :5000"
cd web && npm run dev &
VITE_PID=$!

# Trap shutdown — kill both on exit
cleanup() {
  echo "==> Shutting down..."
  kill $GO_PID $VITE_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Wait for either to exit
wait -n $GO_PID $VITE_PID
# Fixed line endings