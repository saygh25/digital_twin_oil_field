#!/bin/bash

echo "================================================================="
echo "  🚀 Starting Baghewala Satellite GIS Map Subsystem (Standalone)"
echo "================================================================="

# Detect Python
if command -v python3 &> /dev/null; then
    PY_CMD=python3
else
    PY_CMD=python
fi

echo "1. Starting FastAPI GIS Backend on Port 8003..."
cd backend
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    $PY_CMD -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

$PY_CMD -m uvicorn app.main:app --host 127.0.0.1 --port 8003 --reload &
BACKEND_PID=$!
cd ..

echo "2. Starting Vite Frontend on Port 5174..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd ..

echo "================================================================="
echo "  🌐 Subsystem Running!"
echo "  - Frontend: http://127.0.0.1:5174"
echo "  - Backend:  http://127.0.0.1:8003/docs"
echo "================================================================="

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
