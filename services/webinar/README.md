# WebinarPro - Plataforma de Webinars ao Vivo

Versão: **M102.54** (Streaming Estável + Chat Corrigido)

**Service boundary:** `services/webinar/` (sidecar — not part of `src/modules`).

## Estrutura do Projeto

```
services/webinar/
├── frontend/          # React + TypeScript + Vite + Tailwind
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Express + TypeScript + Drizzle ORM + MySQL
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── database/          # SQL dump and local DB artifacts
│   └── webinar.sql
├── deployment/        # Build, start, Hostinger config, prod entry
│   ├── build.sh
│   ├── start.sh
│   ├── server.js
│   ├── hstng.yml
│   └── get-docker.sh
├── package.json       # Service orchestrator (dev/build/start)
├── README.md
└── VERSION_STATUS.md
```

## Pré-requisitos

- Node.js 18+
- npm 9+
- MySQL 5.7+ ou MariaDB 10.3+

## Instalação

```bash
# From services/webinar/
# 1. Instalar dependências (root + frontend + backend)
npm run install-all

# 2. Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Editar backend/.env com suas credenciais de banco de dados

# 3. Importar o banco de dados
mysql -u seu_usuario -p seu_banco < database/webinar.sql
```

## Desenvolvimento

```bash
# From services/webinar/ — both apps
npm run dev

# Or individually:
# Frontend (porta 3000 per vite.config)
cd frontend && npm run dev

# Backend (porta 3001)
cd backend && npm run dev
```

## Compilação (Build)

```bash
# From services/webinar/
npm run build

# Or via deployment script (resolves service root automatically):
bash deployment/build.sh

# Individualmente:
cd frontend && npm run build    # Gera frontend/dist/
cd backend && npm run build     # Gera backend/dist/
```

## Execução em Produção

```bash
# Após o build, from services/webinar/:
npm start
# Ou:
node deployment/server.js
# Ou:
bash deployment/start.sh
```

O servidor inicia na porta definida em `backend/.env` (padrão: 3001).
Carrega `.env.production` na raiz do serviço (`services/webinar/.env.production`).

## Deploy na Hostinger

1. Execute `npm run build` (ou `bash deployment/build.sh`) localmente
2. Suba o conteúdo completo de `services/webinar/` (exceto `node_modules`) para o servidor
3. No servidor, execute `npm install --production` em cada subprojeto
4. Reinicie o serviço Node.js (`npm start`)

Configuração auxiliar: `deployment/hstng.yml`.

## Funcionalidades

- **Streaming Interno**: WebRTC + chunks via servidor (sem dependência de serviços externos)
- **Chat Bidirecional**: Apresentador e participantes interagem em tempo real
- **Registro de Leads**: Formulário público com código de acesso
- **Estúdio do Apresentador**: Câmera, compartilhamento de tela, chat integrado
- **Replay**: Gravação automática para reprodução posterior

## Credenciais de Banco (Produção)

Veja `backend/.env.example` para o formato. As credenciais reais devem ser configuradas no arquivo `backend/.env`.

## Versão

M102.54 - Correções aplicadas:
- Streaming infinito estável (buffer de 10s + sync 2s delay)
- Chat do apresentador corrigido (permissão admin + fallback público)
- Validação de código de acesso flexível (sem trava de expiração)
