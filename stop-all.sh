#!/usr/bin/env bash
pkill -f "ollama serve" 2>/dev/null || true
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
echo "Stopped."
