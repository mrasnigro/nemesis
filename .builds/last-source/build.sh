#!/bin/bash

set -e

echo "🚀 Iniciando compilação do CRM IMP..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
