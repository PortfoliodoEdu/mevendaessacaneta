#!/bin/bash
set -e

echo "=== Instalando dependências do sistema ==="

# Detectar distribuição
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    echo "Detectado: Debian/Ubuntu"
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv nodejs npm nginx ffmpeg
    
elif [ -f /etc/redhat-release ]; then
    # RHEL/CentOS/Fedora
    echo "Detectado: RHEL/CentOS/Fedora"
    sudo yum install -y python3 python3-pip nodejs npm nginx ffmpeg || \
    sudo dnf install -y python3 python3-pip nodejs npm nginx ffmpeg
    
else
    echo "Distribuição não reconhecida. Instale manualmente:"
    echo "  - Python 3.8+"
    echo "  - Node.js 18+"
    echo "  - npm"
    echo "  - nginx"
    echo "  - ffmpeg"
    exit 1
fi

echo ""
echo "=== Verificando versões ==="
python3 --version
node --version
npm --version
nginx -v

echo ""
echo "=== Dependências do sistema instaladas ==="
