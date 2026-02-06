#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== Iniciando aplicação ==="

# Criar diretórios necessários
mkdir -p logs
mkdir -p backend/models

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "AVISO: Arquivo .env não encontrado. Copie env.example para .env e configure."
fi

# Iniciar backend Python
echo "Iniciando backend Python..."
cd backend
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual Python..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

# Verificar se o backend já está rodando
if pgrep -f "uvicorn main:app" > /dev/null; then
    echo "Backend já está rodando"
else
    nohup uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2 > ../logs/backend.log 2>&1 &
    echo $! > ../logs/backend.pid
    echo "Backend iniciado (PID: $(cat ../logs/backend.pid))"
fi
deactivate
cd ..

# Iniciar frontend
echo "Iniciando frontend..."
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências do frontend..."
    npm install
fi

# Verificar se o frontend já está rodando
if pgrep -f "vite" > /dev/null; then
    echo "Frontend já está rodando"
else
    # Build para produção
    echo "Fazendo build do frontend..."
    npm run build
    
    # Servir com servidor estático (preview)
    nohup npx serve -s dist -l 8080 > logs/frontend.log 2>&1 &
    echo $! > logs/frontend.pid
    echo "Frontend iniciado (PID: $(cat logs/frontend.pid))"
fi

echo ""
echo "=== Aplicação iniciada ==="
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8080"
echo ""
echo "Logs:"
echo "  Backend: logs/backend.log"
echo "  Frontend: logs/frontend.log"
echo ""
echo "Para parar: ./scripts/stop.sh"
