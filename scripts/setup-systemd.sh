#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Configurando systemd services ==="

# Solicitar caminho de instalação
read -p "Caminho de instalação da aplicação [/var/www/mevendaessacaneta]: " INSTALL_PATH
INSTALL_PATH=${INSTALL_PATH:-/var/www/mevendaessacaneta}

# Copiar arquivos de serviço
sudo cp "$PROJECT_DIR/systemd/backend.service" /etc/systemd/system/
sudo cp "$PROJECT_DIR/systemd/frontend.service" /etc/systemd/system/

# Atualizar caminhos nos arquivos de serviço
sudo sed -i "s|/var/www/mevendaessacaneta|$INSTALL_PATH|g" /etc/systemd/system/backend.service
sudo sed -i "s|/var/www/mevendaessacaneta|$INSTALL_PATH|g" /etc/systemd/system/frontend.service

# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar serviços
sudo systemctl enable backend.service
sudo systemctl enable frontend.service

echo ""
echo "=== Systemd services configurados ==="
echo ""
echo "Para iniciar:"
echo "  sudo systemctl start backend"
echo "  sudo systemctl start frontend"
echo ""
echo "Para ver status:"
echo "  sudo systemctl status backend"
echo "  sudo systemctl status frontend"
echo ""
echo "Para ver logs:"
echo "  sudo journalctl -u backend -f"
echo "  sudo journalctl -u frontend -f"
