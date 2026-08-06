#!/bin/bash

# Script de inicialização para Hostinger
# Este script inicia o servidor backend
# Run from anywhere; resolves to services/webinar root.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVICE_ROOT"

echo "🚀 Iniciando servidor..."
echo "📂 Service root: $SERVICE_ROOT"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o backend foi compilado
if [ ! -d "backend/dist" ]; then
  echo -e "${RED}❌ Backend não foi compilado. Execute deployment/build.sh primeiro.${NC}"
  exit 1
fi

# Verificar se o arquivo principal existe
if [ ! -f "backend/dist/index.js" ]; then
  echo -e "${RED}❌ Arquivo backend/dist/index.js não encontrado.${NC}"
  exit 1
fi

# Iniciar o servidor através do wrapper deployment/server.js para carregar o .env corretamente
echo -e "${BLUE}📡 Iniciando servidor via deployment/server.js...${NC}"

# Executar o servidor
node deployment/server.js
