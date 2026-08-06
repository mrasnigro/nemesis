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

# 2. Configurar variáveis de ambiente (see Environment setup below)

# 3. Importar o banco de dados
mysql -u seu_usuario -p seu_banco < database/webinar.sql
```

## Environment setup

Use the `.env.example` templates (variable names only). **Never commit** real `.env`, `.env.production`, or `backend/.env`.

| Template | Copy to | Used by |
|----------|---------|---------|
| `.env.example` (service root) | `.env` and `.env.production` | `deployment/server.js` (`.env.production`); DB loader when cwd is service root (`.env`) |
| `backend/.env.example` | `backend/.env` | Backend tools / `npm run dev` from `backend/` |
| `frontend/.env.example` | `frontend/.env.local` (optional) | Vite build defines (`REACT_APP_API_URL`, `REACT_APP_ENV`) |

```bash
# From services/webinar/
cp .env.example .env
cp .env.example .env.production
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Fill in real values locally (DB_*, JWT_*, REACT_APP_API_URL, etc.)
```

Backend variables: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY`, `NODE_ENV`.

Frontend build variables: `REACT_APP_API_URL` (e.g. `http://localhost:3001/api`), `REACT_APP_ENV`.

For production `npm start`, keep service-root `.env` and `.env.production` in sync until env loaders are unified.

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

# Set API URL before frontend build when not using defaults:
#   REACT_APP_API_URL=http://localhost:3001/api npm run build --prefix frontend

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

`deployment/server.js` loads `services/webinar/.env.production`.  
When started from the service root, the DB layer also expects `services/webinar/.env`.  
Default port is `3001` (`PORT`).

## Deploy na Hostinger

1. Execute `npm run build` (ou `bash deployment/build.sh`) localmente
2. Suba o conteúdo completo de `services/webinar/` (exceto `node_modules` e arquivos `.env*`) para o servidor
3. Crie `.env` / `.env.production` / `backend/.env` no servidor a partir dos examples
4. No servidor, execute `npm install --production` em cada subprojeto
5. Reinicie o serviço Node.js (`npm start`)

Configuração auxiliar: `deployment/hstng.yml` (replace legacy domain/secrets before use).

## Funcionalidades

- **Streaming Interno**: WebRTC + chunks via servidor (sem dependência de serviços externos)
- **Chat Bidirecional**: Apresentador e participantes interagem em tempo real
- **Registro de Leads**: Formulário público com código de acesso
- **Estúdio do Apresentador**: Câmera, compartilhamento de tela, chat integrado
- **Replay**: Gravação automática para reprodução posterior

## Credenciais

Templates only: `.env.example`, `backend/.env.example`, `frontend/.env.example`.  
Provide real values in local untracked env files — never commit secrets.

## Versão

M102.54 - Correções aplicadas:
- Streaming infinito estável (buffer de 10s + sync 2s delay)
- Chat do apresentador corrigido (permissão admin + fallback público)
- Validação de código de acesso flexível (sem trava de expiração)
