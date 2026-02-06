#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== Parando aplicação ==="

# Parar backend
if [ -f logs/backend.pid ]; then
    PID=$(cat logs/backend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Parando backend (PID: $PID)..."
        kill $PID
        rm logs/backend.pid
        echo "Backend parado"
    else
        echo "Backend não está rodando"
        rm logs/backend.pid
    fi
else
    # Tentar parar por nome
    pkill -f "uvicorn main:app" && echo "Backend parado" || echo "Backend não estava rodando"
fi

# Parar frontend
if [ -f logs/frontend.pid ]; then
    PID=$(cat logs/frontend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Parando frontend (PID: $PID)..."
        kill $PID
        rm logs/frontend.pid
        echo "Frontend parado"
    else
        echo "Frontend não está rodando"
        rm logs/frontend.pid
    fi
else
    # Tentar parar por nome
    pkill -f "serve -s dist" && echo "Frontend parado" || echo "Frontend não estava rodando"
fi

echo "=== Aplicação parada ==="
