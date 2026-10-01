# Webinar Service — Runtime Validation

**Service:** `services/webinar/`  
**Date:** 2026-08-06  
**Scope:** Independent application validation (no IMP integration)  
**Host:** Windows / Node `v24.16.0` / npm `11.13.0`  
**Related:** `docs/WEBINAR_SERVICE_STRUCTURE.md`, `docs/WEBINAR_SIDECAR_INTEGRATION_PLAN.md`

---

## Summary

| Area | Result |
|------|--------|
| Backend install | **Pass** (after removing unused native dep) |
| Backend TypeScript build (`dist/`) | **Pass** — 128 files, `dist/index.js` present |
| Backend server startup | **Pass** — listens on `:3001` |
| `/health` | **Pass** — HTTP 200 |
| SPA static serve | **Pass** — HTTP 200 from `frontend/dist` |
| Frontend install | **Pass** |
| Frontend Vite production build | **Pass** — `index.html` + CSS/JS assets |
| MySQL connectivity | **Fail / blocked** — no real DB + credentials in this run |
| Env / secrets readiness | **Partial** — example present; production secrets must be supplied |
| Old domain / hardcoded paths | **Found** — see blockers |

Temporary placeholder `.env` files used for startup were **deleted** after validation.

---

## 1. Backend status

### Install

1. Initial `npm install` in `backend/` **failed** on `better-sqlite3` native compile:
   - Node 24 has no prebuild
   - No Visual Studio C++ toolchain on this host
2. Code search: **no imports** of `better-sqlite3` under `backend/src` (app uses **mysql2** + Drizzle).
3. **Config-only fix applied:** removed unused `better-sqlite3` from `backend/package.json`.
4. Reinstall succeeded: **156 packages**, exit 0.

### Build

```text
cd services/webinar/backend
npm run build   # tsc
```

| Check | Result |
|-------|--------|
| Exit code | 0 |
| `backend/dist/index.js` | Present |
| Dist file count | 128 |

### Server startup

```text
cd services/webinar
# temporary .env.production + .env (placeholders) — deleted after test
node deployment/server.js
```

Observed:

- Loads via `deployment/server.js`
- Resolves SPA path to `services/webinar/frontend/dist` (**correct** after service boundary)
- Mounts auth + API routes
- `🚀 Servidor rodando na porta 3001`
- DB pool created; connection test **failed** with placeholder user (expected)

### HTTP checks

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /health` | 200 | Returns `status: ok` |
| `GET /` | 200 | Serves built SPA HTML (~550 bytes) |

**Caveat:** `/health` always reports `"database":"connected"` even when the pool connection test fails. Treat health as process-up, not DB-up.

### Engine note

Root `package.json` declares `engines.node: "22.x"`. Validation ran on **Node 24** (`EBADENGINE` warning only). Prefer Node 22 for production parity.

---

## 2. Frontend status

### Install

```text
cd services/webinar/frontend
npm install
```

**Pass** (also refreshed via service-root `postinstall`).

### Production build

```text
cd services/webinar/frontend
npm run build   # vite build
```

| Artifact | Size (approx.) |
|----------|----------------|
| `frontend/dist/index.html` | 0.55 kB |
| `frontend/dist/assets/index-*.css` | 40.38 kB |
| `frontend/dist/assets/index-*.js` | 408.51 kB |

Build time ~6s, exit 0.

### API URL bake-in

Vite `define` uses `REACT_APP_API_URL`. If unset at build time and `NODE_ENV=production`, default is:

`https://s1m0ne.tec.br/api`

**Implication:** production builds on this machine without overriding env will target the **legacy Hostinger domain**, not local `:3001`.

`frontend/.env.local` currently has `VITE_API_URL=...`, which **does not** match the `REACT_APP_API_URL` key used by Vite/config — ineffective for the current build pipeline.

---

## 3. Database status

### Files

| Path | Status |
|------|--------|
| `database/webinar.sql` | Present (~49 KB) — MySQL dump |
| `database/sqlite.db` | Present — local artifact; **not** used by MySQL runtime code |
| `backend/src/db/schema.ts` | Drizzle MySQL schema (subset of dump tables) |
| `backend/drizzle.config.json` | Points at MySQL; contains **legacy credentials** (see secrets) |

### Dump vs Drizzle

Dump includes ~32 tables (`users`, `webinars`, `leads`, `plans`, recordings, polls, payments, etc.).

Drizzle `schema.ts` currently models a **subset** (e.g. users, plans, subscriptions, webinars, access codes, leads, chat-related). Other tables exist in SQL for features still using raw SQL / alternate routes.

### Runtime connectivity (this validation)

- No local MySQL with imported `database/webinar.sql` was available.
- Placeholder credentials → `Access denied for user 'validation_user'@'localhost'`.
- Server still started (pool create does not abort boot).

**Required for full functional validation:** MySQL/MariaDB + import `database/webinar.sql` + real `DB_*` env.

---

## 4. Required environment variables

### Documented in `backend/.env.example`

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | Yes | Default 3001 |
| `DB_HOST` | Yes | e.g. `127.0.0.1` |
| `DB_PORT` | Yes | Default 3306 |
| `DB_USER` | Yes | |
| `DB_PASSWORD` | Yes | |
| `DB_NAME` | Yes | |
| `JWT_SECRET` | Yes | Used for access tokens |
| `NODE_ENV` | Recommended | `production` / `development` |

### Used in code but missing from `.env.example`

| Variable | Where | Notes |
|----------|-------|--------|
| `JWT_REFRESH_SECRET` | `backend/src/utils/jwt.ts` | Falls back to hardcoded default string |
| `JWT_EXPIRY` | jwt utils | Default `15m` |
| `JWT_REFRESH_EXPIRY` | jwt utils | Default `7d` |

### Frontend build-time

| Variable | Required for correct deploy | Notes |
|----------|----------------------------|--------|
| `REACT_APP_API_URL` | Yes | e.g. `http://localhost:3001/api` or production API origin |
| `REACT_APP_ENV` | Optional | Defaults via Vite `define` |

### Env file load paths (important)

| Loader | File resolved |
|--------|----------------|
| `deployment/server.js` | `services/webinar/.env.production` |
| `backend/src/db/index.ts` | `process.cwd()/.env` |
| `backend/src/utils/jwt.ts` | `.env.production` relative to cwd |

**Deployment requirement:** when using `npm start` / `node deployment/server.js` from service root, provide **both** `.env.production` (service root) and `.env` (service root), **or** align loaders later. `backend/.env` alone is insufficient if cwd is the service root.

---

## 5. Configuration audit — missing secrets & old references

### Missing / placeholder secrets

- No committed real `backend/.env` (correct).
- `.env.example` uses placeholders only.
- JWT code has **insecure fallback secrets** if env unset.
- `deployment/hstng.yml` still embeds:
  - Legacy domain `s1m0ne.tec.br`
  - `DATABASE_URL` with embedded user/password patterns
  - Placeholder JWT strings  
  **Do not use as production secrets.** Rotate anything that ever matched those values.
- `backend/drizzle.config.json` embeds legacy DB user/password/database name (config tooling only; still a secret hygiene issue).
- Some routes (`publicLeadRoutes`, `webinarLeadsRoutes`, `diagnostic.ts`) fall back to **hardcoded legacy DB credentials** if `DB_*` unset — config smell / security risk if env missing.

### Old domain / CORS references

| Location | Reference |
|----------|-----------|
| `backend/src/index.ts` | CORS origin allowlist hardcoded to `https://s1m0ne.tec.br` (+ www) |
| `backend/src/middleware/cors.ts` | Includes localhost + `s1m0ne.tec.br` (file may be unused if index inlines cors) |
| `frontend/src/services/api.ts` | Fallback API `https://s1m0ne.tec.br/api` |
| `frontend/vite.config.ts` | Production default API same host |
| `deployment/hstng.yml` | Domain, CORS, API_URL, REACT_APP_API_URL |

Local FE originating from `http://localhost:3000` talking to API on `:3001` will be **CORS-blocked** by the live `index.ts` allowlist unless origins are updated (config change) or FE is served from the same Express origin (as in this production start test).

### Path references after service boundary

| Check | Status |
|-------|--------|
| `deployment/server.js` → `../backend/dist/index.js` | OK |
| `backend` SPA path `../../frontend/dist` | OK (verified at runtime) |
| `package.json` `start` → `deployment/server.js` | OK |
| `database/webinar.sql` path in README | OK |

### Repo hygiene

Root `.gitignore` ignores `node_modules` / `dist` but **does not clearly ignore `.env` / `.env.production`**. Recommend adding them before committing local secrets.

---

## 6. Deployment requirements

To run as an independent production-style service:

1. **Node 22.x** (declared) or verified later Node 24 without native sqlite (already removed).
2. **MySQL/MariaDB** instance; import `database/webinar.sql`.
3. Set real `DB_*`, `JWT_SECRET`, `JWT_REFRESH_SECRET` in:
   - `services/webinar/.env.production`
   - `services/webinar/.env` (until loaders unified)
4. Build:
   ```bash
   cd services/webinar
   npm run build
   # or: bash deployment/build.sh
   ```
5. Frontend API URL at **build** time:
   ```bash
   # example local same-origin via Express static:
   set REACT_APP_API_URL=http://localhost:3001/api
   cd frontend && npm run build
   ```
6. Start:
   ```bash
   npm start
   # or: node deployment/server.js
   # or: bash deployment/start.sh
   ```
7. Before public deploy: replace CORS allowlist / bake-in API host away from `s1m0ne.tec.br`; scrub `hstng.yml` and drizzle config secrets.

Optional: FFmpeg available on PATH if recording/transcode features that use `fluent-ffmpeg` are exercised.

---

## 7. Known blockers

| ID | Severity | Blocker |
|----|----------|---------|
| B1 | **High** | No provisioned MySQL + imported dump → auth/webinars/leads will fail at runtime despite process start |
| B2 | **High** | Hardcoded CORS to legacy domain in `backend/src/index.ts` blocks typical local FE↔API split |
| B3 | **High** | Production frontend build defaults API to `https://s1m0ne.tec.br/api` unless `REACT_APP_API_URL` set at build |
| B4 | **Medium** | `.env.example` incomplete vs JWT refresh vars; insecure JWT fallbacks if unset |
| B5 | **Medium** | Dual env file expectation (`.env` vs `.env.production`) depending on cwd/loader |
| B6 | **Medium** | Legacy credentials in `hstng.yml`, `drizzle.config.json`, and some route fallbacks |
| B7 | **Medium** | `/health` reports DB connected even when DB auth fails |
| B8 | **Low** | Version label mismatch: README **M102.54** vs `/health` **M100.82** |
| B9 | **Low** | `frontend/.env.local` uses `VITE_API_URL` but build reads `REACT_APP_API_URL` |
| B10 | **Info** | Node engines want 22.x; validated on 24.x |
| B11 | **Info** | npm audit reports vulnerabilities in deps (not explored in this pass) |

---

## 8. Fixes applied during this validation (config only)

| Change | Why |
|--------|-----|
| Removed `better-sqlite3` from `backend/package.json` | Unused; blocked `npm install` on Windows/Node 24 without VS Build Tools |

No frontend/backend business logic or SQL schema changes.

---

## 9. Reproduction commands

```bash
cd services/webinar/backend
npm install
npm run build

cd ../frontend
npm install
npm run build

cd ..
# Provide .env.production and .env with real or local DB settings
npm start
# curl http://127.0.0.1:3001/health
```

---

## 10. Verdict

**Build & process independence: YES** — backend and frontend install/build; Express starts and serves the Vite production bundle as a standalone sidecar candidate.

**Full product runtime: NO** until MySQL is imported, secrets are set, and legacy Hostinger domain/CORS/API defaults are replaced for the target environment.

IMP integration remains out of scope for this document.
