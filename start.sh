#!/usr/bin/env bash
# TubeGraph Startup Script
# Backend: Port 5417 | Frontend: Port 5416

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🌌 Starting TubeGraph Backend on port 5417..."
"$DIR/.venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 5417 > "$DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$DIR/backend.pid"

echo "🌌 Starting TubeGraph Frontend on port 5416..."
cd "$DIR/frontend"
npm run dev -- --port 5416 --host > "$DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$DIR/frontend.pid"

echo "✅ TubeGraph is running!"
echo "   Frontend: http://localhost:5416"
echo "   Backend:  http://localhost:5417"
