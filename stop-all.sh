#!/usr/bin/env bash
# ============================================================
# stop-all.sh — Stop all Observatory services.
# ============================================================
echo "🛑 Stopping services..."
pkill -f "ollama serve" 2>/dev/null || true
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2
echo "✅ Stopped."
