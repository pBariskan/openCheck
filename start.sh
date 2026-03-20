#!/bin/bash
# ─────────────────────────────────────────────
#  Grammarly OSS — Launcher
#  Starts the FastAPI server (with venv) and
#  opens the app in your default browser.
# ─────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
PORT=8000
URL="http://localhost:$PORT"

echo "🚀  Starting openCheck..."

# ── Check if server is already running ──
if curl -s "$URL/health" | grep -q '"ok"'; then
    echo "✅  Server is already running at $URL"
else
    echo "⚙️   Activating virtual environment..."
    source "$SERVER_DIR/venv/bin/activate"

    echo "⚙️   Launching FastAPI server..."
    cd "$SERVER_DIR"
    # Run in background, redirect logs to a temp file
    nohup python server.py > /tmp/grammarly_oss.log 2>&1 &
    SERVER_PID=$!
    echo "   PID: $SERVER_PID"

    # Wait until server is up (max 30 seconds)
    echo -n "   Waiting for server"
    for i in $(seq 1 30); do
        sleep 1
        if curl -s "$URL/health" | grep -q '"ok"'; then
            echo ""
            echo "✅  Server ready!"
            break
        fi
        echo -n "."
        if [ $i -eq 30 ]; then
            echo ""
            echo "❌  Server failed to start. Check /tmp/grammarly_oss.log"
            exit 1
        fi
    done
fi

# ── Open browser ──
echo "🌐  Opening $URL ..."
open "$URL"
