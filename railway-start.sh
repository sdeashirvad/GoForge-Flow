#!/bin/bash
# Start script for Railway deployment
# Installs Node.js and Go, builds frontend and backend, then runs the app
# Frontend serves on PORT (default 8080), backend runs internally on :8081

set -e

PORT=${PORT:-8080}
BACKEND_PORT=8081

echo "==> Railway Startup: Installing runtimes and building"
echo "==> Target Frontend Port: $PORT"
echo "==> Backend Port (internal): $BACKEND_PORT"

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Detect and install Node.js
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "==> Checking for Node.js..."
if ! command -v node &> /dev/null; then
  echo "==> Node.js not found. Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  node_version=$(node -v)
  echo "==> Node.js already installed: $node_version"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Detect and install Go
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "==> Checking for Go..."
if ! command -v go &> /dev/null; then
  echo "==> Go not found. Installing Go 1.23..."
  GO_VERSION="1.23.0"
  GO_OS="linux"
  GO_ARCH="amd64"
  
  # Detect architecture
  if uname -m | grep -q "arm64"; then
    GO_ARCH="arm64"
  fi
  
  wget -q https://go.dev/dl/go${GO_VERSION}.${GO_OS}-${GO_ARCH}.tar.gz -O /tmp/go.tar.gz
  tar -C /usr/local -xzf /tmp/go.tar.gz
  rm /tmp/go.tar.gz
  export PATH=$PATH:/usr/local/go/bin
else
  go_version=$(go version)
  echo "==> Go already installed: $go_version"
fi

# Ensure Go is in PATH
export PATH=$PATH:/usr/local/go/bin

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Install Node.js dependencies
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "==> Installing Node.js dependencies..."
cd web
npm ci --omit=dev
cd ..

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Build frontend (React + Vite)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "==> Building frontend..."
cd web
npm run build
cd ..

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Download Go dependencies
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "==> Downloading Go dependencies..."
go mod download

# ─────────────────────────────────────────────────────────────────────────────
# Step 6: Build Go binary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "==> Building Go backend..."
CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /tmp/flowforge ./cmd/server

# ─────────────────────────────────────────────────────────────────────────────
# Step 7: Run the application
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "==> Starting backend on :$BACKEND_PORT"
echo "==> Serving frontend on :$PORT"
echo ""

# Set environment variables
export PORT=$BACKEND_PORT
export STATIC_DIR=$(pwd)/web/dist

# Start the backend (which serves the frontend from STATIC_DIR)
exec /tmp/flowforge
