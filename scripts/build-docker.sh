#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== Build Docker ==="

# Build frontend primeiro
echo "Build do frontend..."
npm install
npm run build

# Build e iniciar containers
echo "Build e iniciar containers Docker..."
docker-compose build
docker-compose up -d

echo ""
echo "=== Docker iniciado ==="
echo ""
echo "Para ver logs:"
echo "  docker-compose logs -f"
echo ""
echo "Para parar:"
echo "  docker-compose down"
