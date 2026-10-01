# Webinar Service — Production Readiness

**Service:** `services/webinar/`  
**Date:** 2026-08-06  
**Scope:** Finalize runtime readiness analysis (MySQL, auth, FE↔BE, production env)  
**Constraint:** Analysis and documentation only — no deployment implementation; IMP architecture unchanged  

**Related:**  
`docs/WEBINAR_SERVICE_STRUCTURE.md` · `docs/WEBINAR_SERVICE_RUNTIME_VALIDATION.md` · `docs/WEBINAR_END_TO_END_VALIDATION.md` · `docs/WEBINAR_ENVIRONMENT_SECURITY_CHECK.md` · `docs/IMP_PLATFORM_ARCHITECTURE_V1.md`

---

## Verdict

| Area | Production-ready? | Notes |
|------|-------------------|--------|
| Install / TypeScript / Vite builds | **Yes** (validated earlier) | Process boots without MySQL |
| MySQL provisioning & import | **Documented; not provisioned here** | Required for real auth |
| Backend DB connection | **Ready when `DB_*` correct** | Pool uses `mysql2` |
| Real authentication flow | **Requires live DB + seeded/admin user** | Independent of IMP SSO |
| Frontend ↔ backend | **Ready if API URL + CORS fixed for target host** | Legacy domain defaults remain |
| Production go-live | **No-go until blockers below cleared** | |

IMP launcher integration is separate and already validated; this document concerns **sidecar runtime only**.

---

## 1. Required infrastructure

| Component | Requirement |
|-----------|-------------|
| **Compute** | Always-on Node.js host (VM, PaaS, or Hostinger-style Node). Prefer **Node 22.x** (declared in service `package.json` engines). |
| **Process** | `deployment/server.js` → loads `backend/dist` and serves `frontend/dist`. |
| **Database** | **MySQL 5.7+** or **MariaDB 10.3+** (dump origin: MariaDB 11.8). Dedicated schema — do not share with IMP mock data. |
| **Network** | Public HTTPS URL for browser clients; WebRTC/streaming needs stable TLS and adequate bandwidth/disk. |
| **Storage** | Local/disk or volume for uploads/recordings (deploy config historically allowed large video types). |
| **Optional** | FFmpeg on PATH if recording/transcode paths that use `fluent-ffmpeg` are exercised. |
| **IMP (adjacent)** | Static IMP build with `VITE_WEBINAR_URL` pointing at this sidecar’s HTTPS origin (shell only). |

**System of record:** Webinar MySQL owns users, webinars, leads, chat, plans, access codes, etc.

---

## 2. Database setup steps

### 2.1 Provisioning requirements

1. Create an empty database (example name: `webinarpro` — choose per environment).  
2. Create an application DB user with rights on that schema only (`SELECT/INSERT/UPDATE/DELETE`; DDL if you run migrations later).  
3. Prefer managed MySQL/MariaDB with automated backups.  
4. **Do not** reuse legacy Hostinger credentials from old deploy samples; provision IMP-controlled credentials and rotate anything previously exposed.  
5. Charset: dump tables use **InnoDB** + **utf8mb4** / `utf8mb4_unicode_ci` — match server defaults accordingly.

### 2.2 Schema import process

Source file: `services/webinar/database/webinar.sql` (~49 KB)

| Property | Value |
|----------|--------|
| Format | MariaDB dump (`mysqldump`-compatible) |
| Tables | **32** `CREATE TABLE` |
| Seed `INSERT`s | **9** tables with data (see below) |

**Seeded tables in dump:**  
`chat_messages`, `client_subscriptions`, `clients`, `leads`, `plans`, `system_settings`, `users`, `webinar_access_codes`, `webinars`

**Import (example):**

```bash
# Create DB first (names are illustrative)
mysql -u ADMIN -p -e "CREATE DATABASE webinarpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema + seed
mysql -u APP_USER -p webinarpro < services/webinar/database/webinar.sql
```

**Post-import checks:**

```sql
SHOW TABLES;                 -- expect ~32 tables
SELECT COUNT(*) FROM users;
SELECT id, email, role, is_active FROM users LIMIT 20;
SELECT id, name FROM plans;
```

**Operational notes**

- Dump historically targeted DB name `u926851054_webinarpro`; import into **your** database name (mysql client selects DB via CLI arg / `USE`).  
- Seed includes **users and leads** — treat as **PII**. For a clean production tenant, either sanitize seeds or import schema-only and create admin via register/SQL after security review.  
- `database/sqlite.db` is a local leftover artifact; **not** the production store.  
- Drizzle `schema.ts` models a **subset** of tables; other tables are used via SQL/routes — full dump is still required.

### 2.3 Backend database connection

Configured in `backend/src/db/index.ts`:

| Setting | Source |
|---------|--------|
| Host / port / user / password / database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Driver | `mysql2` connection pool → Drizzle |
| Behavior on failure | Server **still starts**; connection errors logged — APIs that hit DB will fail |

**Loader caveat:** pool reads `process.cwd()/.env`.  
`deployment/server.js` loads **`services/webinar/.env.production`**.  

For `npm start` from service root, keep **both** `.env` and `.env.production` populated identically until loaders are unified (config debt — not fixed in this pass).

**Acceptance probe after env + import:**

1. Start service.  
2. Logs should show successful DB connection test (not “Access denied”).  
3. Prefer a real query (login/`/api/auth/me`) — do not trust `/health` alone (it can claim `database: "connected"` even when the pool test failed).

---

## 3. Real authentication flow

### 3.1 Endpoints (mounted)

| Method | Path | Role |
|--------|------|------|
| POST | `/api/auth/register` | Create `client` user (+ trial subscription if `Trial` plan exists) |
| POST | `/api/auth/login` | Email/password → `accessToken` + `refreshToken` |
| GET | `/api/auth/me` | Bearer access token → user profile |
| POST | `/api/auth/logout` | Client-side session clear companion |
| POST | `/api/auth/forgot-password` | Stub messaging today |
| POST | `/api/auth/reset-password` | Stub today |

Roles in schema: **`admin`** | **`client`**.

### 3.2 Login behavior

1. Lookup `users` by email; reject inactive.  
2. Password check supports **plaintext equality** and **bcrypt** compare (legacy compatibility).  
3. Issues JWT access + refresh via `JWT_SECRET` / `JWT_REFRESH_SECRET`.

### 3.3 Frontend participation

- Zustand auth store holds tokens.  
- Axios client attaches `Authorization: Bearer <accessToken>`.  
- On 401, client attempts **`POST ${API_URL}/auth/refresh`**.  

**Gap:** Backend `index.ts` does **not** currently mount a `/api/auth/refresh` route. Refresh UX may fail until that endpoint exists or the client is adjusted — treat as a production blocker for long sessions.

### 3.4 Production auth requirements

- [ ] Live MySQL with `users` (and preferably `plans` for registration trial).  
- [ ] Known admin and/or client credentials (from sanitized seed or created post-import).  
- [ ] Strong unique `JWT_SECRET` / `JWT_REFRESH_SECRET` (no code fallbacks in prod).  
- [ ] Decision on plaintext passwords in DB (seed/legacy): migrate to bcrypt-only before public launch if possible.  
- [ ] Confirm register open vs closed (IMP may later be sole identity gateway).

**IMP relationship:** Phase 1 remains **independent login** after launcher open (`VITE_WEBINAR_URL`). SSO handoff is future work — not required for sidecar DB readiness.

---

## 4. Frontend ↔ backend communication

### 4.1 Intended production pattern

Prefer **same origin**: Express serves `frontend/dist` and APIs under `/api/*`.

```
Browser → https://webinar.example.com/        (SPA)
       → https://webinar.example.com/api/...  (Express)
```

Set at **frontend build** time:

```bash
REACT_APP_API_URL=https://webinar.example.com/api
# or same-origin relative strategy if you later change the client;
# today the client expects an absolute baseURL including /api
```

### 4.2 Local / split-origin pattern

| App | Typical URL |
|-----|-------------|
| FE Vite dev | `http://localhost:3000` |
| BE | `http://localhost:3001` |
| `REACT_APP_API_URL` | `http://localhost:3001/api` |

### 4.3 Current risks

| Risk | Detail |
|------|--------|
| Default API host | If `REACT_APP_API_URL` unset in production build, fallback is legacy `https://s1m0ne.tec.br/api` |
| CORS in `backend/src/index.ts` | Hardcoded allowlist: `https://s1m0ne.tec.br` (+ www) — blocks IMP origin and local FE unless same-origin static or CORS is changed |
| `frontend/.env.example` | Documents `REACT_APP_*` (correct for current Vite `define`) |
| Auth refresh | Client calls `/auth/refresh`; server route not mounted |

### 4.4 Connectivity acceptance tests

1. `GET /` → SPA HTML 200.  
2. `GET /assets/*` → 200.  
3. `GET /health` → 200 (process up only).  
4. `POST /api/auth/login` with valid DB user → 200 + tokens.  
5. `GET /api/auth/me` with Bearer → 200.  
6. From browser SPA (same build), login UI succeeds without console CORS/API host errors.

---

## 5. Production environment requirements

### 5.1 Sidecar runtime (service root)

Copy from `.env.example` → `.env` **and** `.env.production` (see loader caveat).

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | Yes | Listen port (commonly `3001` behind reverse proxy) |
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | Yes | Usually `3306` |
| `DB_USER` | Yes | App user |
| `DB_PASSWORD` | Yes | App password |
| `DB_NAME` | Yes | Schema name |
| `JWT_SECRET` | Yes | Access token signing |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing |
| `JWT_EXPIRY` | Recommended | Default in code `15m` if unset |
| `JWT_REFRESH_EXPIRY` | Recommended | Default in code `7d` if unset |
| `NODE_ENV` | Yes | `production` |

Also keep `backend/.env` in sync when running tools with cwd `backend/`.

### 5.2 Frontend build-time

| Variable | Required | Purpose |
|----------|----------|---------|
| `REACT_APP_API_URL` | Yes for prod | Absolute API base ending in `/api` |
| `REACT_APP_ENV` | Optional | Environment label |

### 5.3 IMP shell (adjacent, not part of sidecar deploy)

| Variable | Purpose |
|----------|---------|
| `VITE_WEBINAR_URL` | Absolute sidecar origin for launcher new-tab open |

### 5.4 Reverse proxy / TLS

- Terminate TLS at edge.  
- Proxy `/` and `/api` to Node.  
- WebSocket/WebRTC: confirm proxy buffers/timeouts suitable for streaming.  
- Do not expose MySQL publicly.

---

## 6. Deployment checklist

Ordered for first production (or staging) cutover. **Do not implement here — execute later.**

### A. Infrastructure

- [ ] Provision Node 22.x host + TLS hostname  
- [ ] Provision dedicated MySQL/MariaDB + app user  
- [ ] Attach durable disk for uploads/recordings  

### B. Database

- [ ] Create empty schema (utf8mb4)  
- [ ] Import `database/webinar.sql`  
- [ ] Verify table count and critical rows (`users`, `plans`)  
- [ ] Sanitize or replace seed PII; set known admin password (prefer bcrypt)  
- [ ] Configure backups  

### C. Secrets & env

- [ ] Generate unique JWT secrets  
- [ ] Write `.env` + `.env.production` (+ `backend/.env` if needed) on server only  
- [ ] Confirm no secrets in git / deploy YAML  

### D. Build

- [ ] `npm run install-all` (or CI equivalent) at `services/webinar`  
- [ ] Build frontend with production `REACT_APP_API_URL`  
- [ ] Build backend (`tsc` → `backend/dist`)  
- [ ] Verify `frontend/dist/index.html` and `backend/dist/index.js`  

### E. Config hardening (before public traffic)

- [ ] Replace hardcoded CORS origins for the real frontend origin(s)  
- [ ] Confirm API URL is not the legacy Hostinger domain  
- [ ] Remove or override hardcoded DB credential fallbacks in routes if still present  
- [ ] Decide register-open vs invite-only  

### F. Start & smoke

- [ ] `npm start` / `node deployment/server.js` under process manager  
- [ ] DB connection log success  
- [ ] SPA + `/health` + login + `/api/auth/me`  
- [ ] Spot-check webinar list / studio only after auth works  

### G. IMP wiring

- [ ] Rebuild IMP with `VITE_WEBINAR_URL=https://<sidecar-host>`  
- [ ] Entitled user: IMP → **Acessar Webinar** → sidecar login  

---

## 7. Remaining blockers

| ID | Severity | Blocker | Needed action (later) |
|----|----------|---------|------------------------|
| P1 | **Critical** | No environment MySQL imported in this workspace validation | Provision + import dump |
| P2 | **Critical** | Hardcoded CORS to legacy domain | Env-driven allowlist including prod FE origin |
| P3 | **High** | Production FE build defaults API to legacy host if env unset | Always set `REACT_APP_API_URL` at build |
| P4 | **High** | `/api/auth/refresh` called by FE but not mounted on BE | Add route or change client |
| P5 | **High** | Dual env file expectation (`.env` vs `.env.production`) | Document ops discipline or unify loaders |
| P6 | **Medium** | Plaintext password support / possible plaintext seeds | Force bcrypt; rotate credentials |
| P7 | **Medium** | `/health` DB status unreliable | Use query-based readiness for ops |
| P8 | **Medium** | Seed dump may contain client PII | Sanitize for greenfield prod |
| P9 | **Medium** | Route-level legacy DB credential fallbacks (if still in tree) | Remove before prod |
| P10 | **Low** | Auth refresh / forgot-password stubs incomplete | Product backlog |
| P11 | **Info** | Independent login vs IMP (expected Phase 1) | SSO later per architecture V1 |

---

## 8. Production acceptance criteria

Ship sidecar to production users only when **all** critical criteria pass:

### Infrastructure & data

1. Dedicated MySQL/MariaDB reachable from the Node host.  
2. `webinar.sql` imported; application user can read/write.  
3. Backup job verified with a restore drill (at least once).

### Security

4. No production passwords/JWTs in git.  
5. CORS and API URL match the live hostname(s).  
6. TLS valid on the public webinar origin.  
7. JWT secrets are unique and long; no insecure defaults used at runtime.

### Functional

8. `POST /api/auth/login` succeeds for a known user.  
9. Authenticated `GET /api/auth/me` succeeds.  
10. SPA loads from the same public origin and completes login in the browser without CORS/API-host errors.  
11. Core post-login navigation works (client dashboard / webinars list) against the live DB.

### Integration (IMP)

12. IMP `VITE_WEBINAR_URL` points at the production sidecar.  
13. Workspace user with `webinar` module access can open the sidecar from `/modules/webinar`.

### Explicitly out of scope for “sidecar runtime ready”

- IMP↔Webinar SSO handoff  
- Rewriting Webinar into native IMP modules  
- Changing IMP architecture standards  

---

## 9. Recommended next implementation sequence

*(Documentation foresight only — not executed in this task.)*

1. Provision MySQL + import + verify connection logs.  
2. Create/rotate admin user; prove login + `/me`.  
3. Fix CORS + rebuild FE with correct `REACT_APP_API_URL`.  
4. Resolve refresh-token route mismatch.  
5. Re-run E2E smoke; then point IMP `VITE_WEBINAR_URL` at staging/prod.  

---

*End of production readiness analysis.*
