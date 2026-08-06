#!/bin/bash

# Script de compilação para Hostinger
# Este script instala dependências e compila o projeto
# Run from anywhere; resolves to services/webinar root.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVICE_ROOT"

echo "🚀 Iniciando compilação do projeto..."
echo "📂 Service root: $SERVICE_ROOT"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Passo 1: Instalar dependências do projeto raiz
echo -e "${BLUE}📦 Instalando dependências do projeto raiz...${NC}"
npm install

# Passo 2: Instalar dependências do frontend
echo -e "${BLUE}📦 Instalando dependências do frontend...${NC}"
cd frontend
npm install
echo -e "${GREEN}✅ Frontend instalado${NC}"
cd ..

# Passo 3: Instalar dependências do backend
echo -e "${BLUE}📦 Instalando dependências do backend...${NC}"
cd backend
npm install
echo -e "${GREEN}✅ Backend instalado${NC}"
cd ..

# Passo 4: Compilar frontend
echo -e "${BLUE}🔨 Compilando frontend...${NC}"
cd frontend
npm run build
echo -e "${GREEN}✅ Frontend compilado${NC}"
cd ..

# Passo 5: Compilar backend
echo -e "${BLUE}🔨 Compilando backend...${NC}"
cd backend
rm -rf dist
npm run build
echo -e "${GREEN}✅ Backend compilado${NC}"
cd ..

echo -e "${GREEN}✅ Compilação concluída com sucesso!${NC}"
echo -e "${YELLOW}📁 Arquivos prontos em:${NC}"
echo "   - Frontend: frontend/dist/"
echo "   - Backend: backend/dist/"
echo ""
echo -e "${YELLOW}🚀 Para iniciar o servidor, execute:${NC}"
echo "   npm start"
echo "   # or: node deployment/server.js"
