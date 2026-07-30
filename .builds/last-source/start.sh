#!/bin/bash

set -e

echo "🚀 Iniciando servidor CRM IMP..."

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [ ! -d "backend/dist" ]; then
  echo -e "${RED}❌ Backend não foi compilado. Execute build.sh primeiro.${NC}"
  exit 1
fi

if [ ! -f "backend/dist/index.js" ]; then
  echo -e "${RED}❌ Arquivo backend/dist/index.js não encontrado.${NC}"
  exit 1
fi

echo -e "${BLUE}📡 Iniciando servidor via server.js...${NC}"
node server.js
