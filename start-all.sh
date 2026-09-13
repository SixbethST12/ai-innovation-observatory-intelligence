#!/usr/bin/env bash
# start-all.sh — start Ollama, backend, frontend.
REPO="/workspaces/ai-innovation-observatory-intelligence"

echo "[1/3] Starting Ollama..."
pkill -f "ollama serve" 2>/dev/null || true
sleep 1
nohup ollama serve > /tmp/ollama.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "  ollama:   %{http_code}\n" http://localhost:11434/api/tags || true

echo "[2/3] Starting backend..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1
cd "$REPO/backend"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "  backend:  %{http_code}\n" http://localhost:8000/health || true

echo "[3/3] Starting frontend..."
pkill -f "vite" 2>/dev/null || true
sleep 1
cd "$REPO/frontend"
nohup npm run dev -- --host 0.0.0.0 --port 5173 --strictPort > /tmp/vite.log 2>&1 &
sleep 8
curl -s -o /dev/null -w "  frontend: %{http_code}\n" http://localhost:5173/ || true

echo ""
echo "Done. Check logs if any service shows 000:"
echo "  /tmp/ollama.log  /tmp/api.log  /tmp/vite.log"
