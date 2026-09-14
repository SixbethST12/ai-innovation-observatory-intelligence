#!/usr/bin/env bash
# ============================================================
# start-all.sh — Start all Observatory services.
# Usage:  bash start-all.sh
# ============================================================

REPO="/workspaces/ai-innovation-observatory-intelligence"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"

ok()    { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn()  { printf "  \033[33m!\033[0m %s\n" "$1"; }
err()   { printf "  \033[31m✗\033[0m %s\n" "$1"; }
info()  { printf "  \033[36m›\033[0m %s\n" "$1"; }

wait_for() {
  local url="$1" name="$2" tries=15
  for i in $(seq 1 $tries); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
      ok "$name ready ($url)"
      return 0
    fi
    sleep 1
  done
  err "$name failed to start ($url) — check logs"
  return 1
}

echo ""
echo "=================================================="
echo "  AI Innovation Observatory — Service Startup"
echo "=================================================="
echo ""

# ---------- 1. Ollama ----------
echo "[1/3] Ollama (LLM)"
if pgrep -f "ollama serve" > /dev/null; then
  info "already running (pid $(pgrep -f 'ollama serve' | head -1))"
else
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  info "starting…"
fi
wait_for "http://localhost:11434/api/tags" "Ollama"

# Ensure model is present
if ! ollama list 2>/dev/null | grep -q "^${OLLAMA_MODEL}"; then
  warn "model $OLLAMA_MODEL not found — pulling (this may take a few minutes)"
  ollama pull "$OLLAMA_MODEL" || err "pull failed"
else
  ok "model $OLLAMA_MODEL available"
fi
echo ""

# ---------- 2. Backend ----------
echo "[2/3] FastAPI backend"
if pgrep -f "uvicorn app.main:app" > /dev/null; then
  info "already running"
else
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  sleep 1
  cd "$REPO/backend"
  nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 &
  info "starting…"
fi
wait_for "http://localhost:8000/health" "Backend"
echo ""

# ---------- 3. Frontend ----------
echo "[3/3] Vite frontend"
if pgrep -f "vite --host" > /dev/null; then
  info "already running"
else
  pkill -f "vite" 2>/dev/null || true
  sleep 1
  cd "$REPO/frontend"
  nohup npm run dev -- --host 0.0.0.0 --port 5173 --strictPort > /tmp/vite.log 2>&1 &
  info "starting…"
fi
wait_for "http://localhost:5173/" "Frontend"
echo ""

echo "=================================================="
echo "  All services ready"
echo "=================================================="
echo ""
echo "  Frontend:   http://localhost:5173"
echo "  Backend:    http://localhost:8000/docs"
echo "  Ollama:     http://localhost:11434"
echo ""
echo "  Logs:       /tmp/ollama.log  /tmp/api.log  /tmp/vite.log"
echo "  Stop:       bash stop-all.sh"
echo ""
