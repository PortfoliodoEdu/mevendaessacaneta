#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Configurando Nginx ==="

# Solicitar domínio
read -p "Domínio da aplicação [meuapp.com]: " DOMAIN
DOMAIN=${DOMAIN:-meuapp.com}

# Copiar configuração
sudo cp "$PROJECT_DIR/nginx/mevendaessacaneta.conf" /etc/nginx/sites-available/mevendaessacaneta

# Atualizar domínio
sudo sed -i "s/server_name _;/server_name $DOMAIN;/g" /etc/nginx/sites-available/mevendaessacaneta

# Criar link simbólico
sudo ln -sf /etc/nginx/sites-available/mevendaessacaneta /etc/nginx/sites-enabled/

# Remover default se existir
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar nginx
sudo systemctl reload nginx

echo ""
echo "=== Nginx configurado ==="
echo ""
echo "Configuração: /etc/nginx/sites-available/mevendaessacaneta"
echo ""
echo "Para SSL (Let's Encrypt):"
echo "  sudo apt-get install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d $DOMAIN"
