#!/usr/bin/env bash
set -e

echo "================================================================="
echo " Starting Reservoir & Thermal Advanced Twin Screen (Well B-17)"
echo "================================================================="

# 1. Start Backend in Background
echo "[1/2] Launching FastAPI Backend on Port 8000..."
cd "$(dirname "$0")/backend"
python3 -m pip install -r requirements.txt --quiet || true
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# 2. Start Frontend
echo "[2/2] Launching React Vite Frontend on Port 5173..."
cd "$(dirname "$0")/frontend"
npm install --silent
npm run dev -- --host 127.0.0.1

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
