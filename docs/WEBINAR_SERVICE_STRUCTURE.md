# Webinar Service Structure

**Service root:** `services/webinar/`  
**Role:** Sidecar WebinarPro application (not part of `src/modules`)  
**Version:** M102.54 (see `VERSION_STATUS.md`)  
**Related:** `docs/WEBINAR_SIDECAR_INTEGRATION_PLAN.md`

---

## Target layout

```
services/
└── webinar/
    ├── frontend/           # React 18 + TypeScript + Vite + Tailwind
    ├── backend/            # Express + TypeScript + Drizzle + MySQL
    ├── database/           # SQL dump + local DB artifacts
    ├── deployment/         # Build/start/entry/Hostinger config
    ├── package.json        # Service orchestrator (npm scripts)
    ├── package-lock.json
    ├── README.md
    └── VERSION_STATUS.md
```

IMP Platform shell remains under `src/`. Do **not** import this tree into the IMP Vite app.

---

## Folder responsibilities

| Path | Purpose |
|------|---------|
| `frontend/` | WebinarPro SPA source and build (`frontend/dist`) |
| `backend/` | Express API source and build (`backend/dist`); env example |
| `database/` | `webinar.sql` (MySQL dump); optional local `sqlite.db` artifact |
| `deployment/` | `build.sh`, `start.sh`, `server.js`, `hstng.yml`, `get-docker.sh` |
| Service root `package.json` | `dev` / `build` / `start` / `install-all` orchestration |

---

## Path contracts (validated)

### Package orchestrator (`package.json`)

| Script | Resolves to |
|--------|-------------|
| `npm run dev` | `backend` + `frontend` via `--prefix` |
| `npm run build` | `frontend` then `backend` builds |
| `npm start` | `node deployment/server.js` |
| `main` | `deployment/server.js` |

### Production entry (`deployment/server.js`)

- Service root = parent of `deployment/`
- Loads `services/webinar/.env.production`
- Imports `backend/dist/index.js`

### Backend static SPA (`backend/src/index.ts`)

- From compiled `backend/dist/index.js`, `../../frontend/dist` → `services/webinar/frontend/dist`
- Unchanged; still correct after folder organization

### Deployment scripts

- `deployment/build.sh` and `deployment/start.sh` `cd` to service root automatically
- Build outputs: `frontend/dist/`, `backend/dist/`
- Start: `node deployment/server.js`

### Database

- Import: `mysql … < database/webinar.sql`
- Schema/source dump content was not modified in this boundary pass

### Hostinger config (`deployment/hstng.yml`)

- `rootDirectory`: `services/webinar`
- `installCommand` / `buildCommand` / `startCommand` assume cwd = service root
- `outputDirectory`: `frontend/dist`

---

## Boundary rules

1. Do not merge `services/webinar` into `src/modules/webinar`.
2. Do not rewrite frontend/backend business logic for structure-only work.
3. Do not change MySQL schema / dump semantics when only organizing files.
4. IMP integrates via URLs/config (sidecar), not source imports.

---

## Leftover non-service files

These remain at `services/webinar/` and are **not** part of the product boundary:

- `filelist.txt` (empty)
- `myfile.txt` (large listing artifact)

Safe to delete in a later cleanup commit; left untouched in this pass.

---

## Quick commands

```bash
cd services/webinar
npm run install-all
cp backend/.env.example backend/.env
mysql -u USER -p DB < database/webinar.sql
npm run dev          # development
npm run build && npm start   # production-style
# or
bash deployment/build.sh && bash deployment/start.sh
```
