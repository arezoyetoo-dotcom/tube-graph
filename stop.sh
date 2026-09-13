#!/usr/bin/env bash
# TubeGraph Stop Script

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$DIR/backend.pid" ]; then
    kill $(cat "$DIR/backend.pid") 2>/dev/null || true
    rm -f "$DIR/backend.pid"
fi

if [ -f "$DIR/frontend.pid" ]; then
    kill $(cat "$DIR/frontend.pid") 2>/dev/null || true
    rm -f "$DIR/frontend.pid"
fi

# Fallback clean port kill
fuser -k 5417/tcp 2>/dev/null || true
fuser -k 5416/tcp 2>/dev/null || true

echo "🛑 TubeGraph stopped."
