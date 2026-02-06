#!/bin/bash
# Script rápido para iniciar tudo de uma vez

cd "$(dirname "$0")/.."

# Verificar se está tudo instalado
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
fi

if [ ! -d "backend/venv" ]; then
    echo "Criando ambiente Python..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
    cd ..
fi

# Iniciar
./scripts/start.sh
