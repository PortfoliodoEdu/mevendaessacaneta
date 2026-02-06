#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  Setup Completo - MeVendaEssaCaneta"
echo "=========================================="
echo ""

# 1. Instalar dependências do sistema
echo "[1/6] Instalando dependências do sistema..."
./scripts/install.sh

# 2. Criar .env se não existir
echo ""
echo "[2/6] Configurando variáveis de ambiente..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "Arquivo .env criado. Configure as variáveis:"
    echo "  nano .env"
    read -p "Pressione Enter após configurar o .env..."
else
    echo "Arquivo .env já existe"
fi

# 3. Instalar dependências Python
echo ""
echo "[3/6] Instalando dependências Python..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

# 4. Instalar dependências Node
echo ""
echo "[4/6] Instalando dependências Node..."
npm install

# 5. Build do frontend
echo ""
echo "[5/6] Fazendo build do frontend..."
npm run build

# 6. Configurar systemd (opcional)
echo ""
read -p "[6/6] Configurar systemd services? (s/N): " SETUP_SYSTEMD
if [[ $SETUP_SYSTEMD =~ ^[Ss]$ ]]; then
    ./scripts/setup-systemd.sh
fi

# 7. Configurar nginx (opcional)
echo ""
read -p "Configurar Nginx? (s/N): " SETUP_NGINX
if [[ $SETUP_NGINX =~ ^[Ss]$ ]]; then
    ./scripts/setup-nginx.sh
fi

echo ""
echo "=========================================="
echo "  Setup concluído!"
echo "=========================================="
echo ""
echo "Para iniciar a aplicação:"
echo "  ./scripts/start.sh"
echo ""
echo "Para usar systemd:"
echo "  sudo systemctl start backend"
echo "  sudo systemctl start frontend"
