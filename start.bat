@echo off
echo "==> Starting FlowForge Go"

REM Build frontend deps if needed
if not exist "web\node_modules" (
  echo "==> Installing frontend dependencies..."
  cd web
  call npm install
  cd ..
)

REM Start Go backend on port 8080 in a new window
echo "==> Starting Go API server on :8080"
set PORT=8080
start "Go_API_Server" go run ./cmd/server

REM Start Vite dev server on port 5000 in a new window
echo "==> Starting Vite dev server on :5000"
cd web
start "Vite_Dev_Server" npm run dev
cd ..

echo.
echo "==> Servers are starting in separate command prompt windows."
echo "==> To stop everything, just close those new windows."
