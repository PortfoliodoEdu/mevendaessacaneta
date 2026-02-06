#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== Deploy da aplicação ==="

# Parar serviços
./scripts/stop.sh

# Atualizar código (se usando git)
if [ -d .git ]; then
    echo "Atualizando código do repositório..."
    git pull
fi

# Instalar/atualizar dependências Python
echo "Instalando dependências Python..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

# Instalar/atualizar dependências Node
echo "Instalando dependências Node..."
npm install

# Build do frontend
echo "Fazendo build do frontend..."
npm run build

# Verificar .env
if [ ! -f .env ]; then
    echo "AVISO: Arquivo .env não encontrado!"
    echo "Copie env.example para .env e configure as variáveis:"
    echo "  cp env.example .env"
    echo "  nano .env"
    exit 1
fi

# Iniciar serviços
./scripts/start.sh

echo ""
echo "=== Deploy concluído ==="
