# Webinar Production Remediation Plan

**Service:** `services/webinar/`  
**Date:** 2026-08-06  
**Status:** Plan only — **do not deploy / do not implement in this task**  
**Out of scope:** IMP shell and architecture (`src/`, IMP env beyond noting `VITE_WEBINAR_URL` stays as-is)  
**Source of blockers:** `docs/WEBINAR_PRODUCTION_READINESS.md`

---

## Implementation order (when work begins)

| Order | Issue | Why first |
|-------|--------|-----------|
| 1 | MySQL production setup | Everything auth-shaped depends on DB |
| 2 | Migration/import process | Reproducible environments |
| 3 | Environment loading strategy | Secrets must reach DB + JWT loaders |
| 4 | API host configuration | FE must call the correct backend |
| 5 | CORS production configuration | Split-origin / IMP launcher scenarios |
| 6 | Auth refresh mismatch | Session continuity after login works |

Do **not** change IMP module launchers or architecture docs as part of these fixes.

---

## 1. MySQL production setup

### Current problem

No production-ready MySQL/MariaDB instance is provisioned for IMP-controlled Webinar environments. Prior validation used placeholder credentials; the Node process starts but login and domain APIs fail without a real database.

### Root cause

- Sidecar was validated for **build/boot**, not for a live managed database.  
- Historical Hostinger DB identity must not be reused as IMP production.  
- Application expects `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` via env (`backend/src/db/index.ts`).

### Recommended fix

1. Provision a dedicated MySQL 5.7+ or MariaDB 10.3+ instance (utf8mb4).  
2. Create database + least-privilege app user (DML on app schema; DDL only if migrations need it).  
3. Enable automated backups and network restriction (Node host only).  
4. Store credentials only in server secrets / untracked env files.  
5. Rotate any credentials that ever appeared in tracked samples (`hstng.yml` history, route fallbacks).

### Files affected

| Path | Change type |
|------|-------------|
| Server/secret store (not in repo) | Create secrets |
| `services/webinar/.env.example` | Docs only if new vars appear (unlikely) |
| `docs/WEBINAR_PRODUCTION_READINESS.md` | Update status when done |

No application business logic required for provisioning itself.

### Risk level

**Critical** — without this, production auth and webinars cannot function.

### Validation method

```text
1. mysql client connects with app user to DB_NAME
2. Start sidecar with real DB_*
3. Startup logs show successful pool connection test (not Access denied)
4. SELECT 1 / SHOW TABLES via app user succeeds
```

---

## 2. Database migration / import process

### Current problem

Schema + seed live in a single dump (`database/webinar.sql`), but there is no standardized, documented, repeatable import runbook executed in IMP environments, and seed data may include PII / legacy passwords.

### Root cause

- Product delivered as MariaDB dump (32 tables, 9 seeded tables), not as a migration pipeline wired into deploy.  
- Drizzle config exists (`backend/drizzle.config.json`) but runtime relies on the SQL dump as source of truth for full schema.  
- Seed includes `users`, `leads`, `webinars`, etc.

### Recommended fix

**Short term (recommended for first prod/staging):**

1. Formalize import script/runbook (ops doc or `deployment/import-db.sh` later — not now).  
2. Steps: create empty DB → import `database/webinar.sql` → verify table count → sanitize seeds.  
3. Post-import: ensure at least one **admin** and one **client** with known bcrypt (or decided) passwords.  
4. Prefer schema+seed for staging; for greenfield prod, consider schema-only + controlled seed (`plans`, settings) after sanitization.

**Medium term:**

5. Prefer Drizzle migrations for forward changes; keep dump as bootstrap only.  
6. Remove plaintext password rows; force bcrypt on `users.password_hash`.

### Files affected

| Path | Change type |
|------|-------------|
| `services/webinar/database/webinar.sql` | Possibly sanitized fork / `webinar.schema.sql` + `webinar.seed.sql` (later) |
| `services/webinar/deployment/` | Optional import script (later) |
| `services/webinar/backend/drizzle.config.json` | Credentials remain env/placeholder only |
| README / readiness docs | Runbook |

### Risk level

**Critical** for first environment stand-up; **High** for PII if raw client dump is imported into shared hosts.

### Validation method

```sql
SHOW TABLES;                    -- ~32
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM plans;
SELECT id, email, role FROM users WHERE role IN ('admin','client') LIMIT 20;
```

Then: `POST /api/auth/login` with a known user → 200 + tokens.

---

## 3. CORS production configuration

### Current problem

Browser clients from origins other than the legacy Hostinger domain are blocked by the live CORS allowlist in the Express entrypoint. Local FE (`localhost:3000`) and future IMP origin are not represented in the **active** `index.ts` cors config.

### Root cause

```ts
// backend/src/index.ts — hardcoded
origin: ['https://s1m0ne.tec.br', 'https://www.s1m0ne.tec.br']
```

`backend/src/middleware/cors.ts` has a broader list (includes localhost) but is **not** what `index.ts` mounts today.

### Recommended fix

1. Drive allowlist from env, e.g. `CORS_ORIGINS=https://webinar.example.com,https://app.example.com,http://localhost:3000`.  
2. Parse CSV → array; fail closed in production if unset.  
3. Prefer **same-origin** deploy (Express serves SPA) to minimize CORS need; still allow IMP origin if browser ever calls API cross-origin.  
4. Align or delete unused `middleware/cors.ts` to avoid dual sources of truth.  
5. Keep `credentials` / headers policy explicit (`Authorization`, `Content-Type`).

### Files affected

| Path | Change type |
|------|-------------|
| `services/webinar/backend/src/index.ts` | Replace hardcoded cors |
| `services/webinar/backend/src/middleware/cors.ts` | Unify or deprecate |
| `services/webinar/.env.example` | Add `CORS_ORIGINS=` |
| `services/webinar/deployment/hstng.yml` | Placeholder origins only |

### Risk level

**High** — blocks real browser usage except same-origin or legacy domain.

### Validation method

```text
1. From allowed origin: preflight OPTIONS /api/auth/login → 204/200 with ACAO
2. From disallowed origin: browser blocks (or server omits ACAO)
3. Same-origin SPA login works without CORS errors
4. If IMP page ever calls API directly, IMP origin must be listed
```

---

## 4. API host configuration

### Current problem

Production frontend builds can silently target the legacy Hostinger API if `REACT_APP_API_URL` is not set at build time.

### Root cause

- `frontend/src/services/api.ts` fallback: `https://s1m0ne.tec.br/api`  
- `frontend/vite.config.ts` `define` production default: same legacy URL  
- API base is **bake-time** (Vite define), not runtime

### Recommended fix

1. **Require** `REACT_APP_API_URL` for production builds (CI fails if missing).  
2. Change production default from legacy host to empty/safe fail, or to relative `/api` **only if** client supports it (today axios `baseURL` expects absolute including `/api`).  
3. Standard prod value when Express serves SPA: `https://<webinar-host>/api`.  
4. Document in README / deploy checklist: rebuild FE after URL change.  
5. Remove legacy domain from defaults once env is mandatory.

### Files affected

| Path | Change type |
|------|-------------|
| `services/webinar/frontend/vite.config.ts` | Defaults / fail-fast |
| `services/webinar/frontend/src/services/api.ts` | Fallback policy |
| `services/webinar/frontend/.env.example` | Already has `REACT_APP_API_URL=` |
| `services/webinar/deployment/build.sh` | Optionally export/check env |
| CI (future) | Guardrail |

### Risk level

**High** — users hit wrong backend or broken prod silently.

### Validation method

```text
1. Build with REACT_APP_API_URL=https://staging.example/api
2. Grep frontend/dist assets for staging host; assert legacy host absent
3. Browser Network tab: XHR/fetch base matches configured API
4. Login succeeds against that API
```

---

## 5. Frontend / backend auth refresh mismatch

### Current problem

After access-token expiry, the frontend attempts token refresh and cannot rely on a real backend endpoint. Long sessions break or force re-login; refresh may 404.

### Root cause

| Side | Behavior |
|------|----------|
| FE `api.ts` | On 401, `POST ${API_URL}/auth/refresh` with `refreshToken` |
| BE `index.ts` | Mounts register/login/me/logout/forgot/reset — **no refresh** |
| BE `routes/authRoutes.ts` | Also has no refresh route (and is not even wired in `index.ts`) |
| BE `services/authService.ts` | `refresh` returns **placeholder** `"new_access_token_placeholder"` — obsolete stub |

Login/register already mint real JWTs via `authController` + `utils/jwt.ts` (`verifyRefreshToken` exists).

### Recommended fix

**Preferred:** implement real refresh on the backend.

1. Add `authController.refresh` using `verifyRefreshToken` → issue new access (and optionally rotate refresh).  
2. Mount `POST /api/auth/refresh` next to other auth routes in `index.ts` (or wire `authRoutes` and add the route there).  
3. Do **not** use `authService.refresh` placeholder.  
4. Keep FE path as `/auth/refresh` under `baseURL` ending in `/api` (i.e. full path `/api/auth/refresh`).  
5. Optionally short-circuit FE refresh if product accepts re-login only — not recommended for studio/live sessions.

### Files affected

| Path | Change type |
|------|-------------|
| `services/webinar/backend/src/controllers/authController.ts` | Add `refresh` |
| `services/webinar/backend/src/index.ts` and/or `routes/authRoutes.ts` | Mount route |
| `services/webinar/backend/src/utils/jwt.ts` | Likely reuse as-is |
| `services/webinar/backend/src/services/authService.ts` | Deprecate/remove stub (avoid accidental use) |
| `services/webinar/frontend/src/services/api.ts` | Only if path/contract must change |

### Risk level

**High** for UX of authenticated long sessions; **Medium** if all sessions are short and re-login is acceptable temporarily.

### Validation method

```text
1. Login → receive accessToken + refreshToken
2. Call GET /api/auth/me with access token → 200
3. POST /api/auth/refresh with refreshToken → 200 + new accessToken
4. Expire/corrupt access token; trigger FE 401 interceptor → refresh succeeds → retry OK
5. Invalid refresh → 401; FE clears store and redirects to login (non-public routes)
```

---

## 6. Environment loading strategy

### Current problem

Different modules load **different env files** relative to **different cwds**, so a single `.env.production` is insufficient for reliable production starts. Operators can set secrets that JWT or DB code never sees.

### Root cause

| Loader | File resolved |
|--------|----------------|
| `deployment/server.js` | `services/webinar/.env.production` (service root) |
| `backend/src/db/index.ts` | `process.cwd()/.env` |
| `backend/src/utils/jwt.ts` | `.env.production` relative to cwd |
| `diagnostic.ts` / some routes | Own dotenv paths / hardcoded DB fallbacks |

When `npm start` runs from service root: `.env.production` is loaded for the process via `server.js`, but `db/index.ts` also calls `dotenv.config({ path: cwd/.env })` — if `.env` is missing, `DB_*` may already be in `process.env` from the first load **if** `server.js` ran first and used the same variable names. JWT loader looking for `.env.production` from cwd is OK at service root, fragile if started from `backend/`.

Hardcoded fallbacks in `publicLeadRoutes.ts`, `webinarLeadsRoutes.ts`, `diagnostic.ts` mask missing env with legacy identities.

### Recommended fix

**Unify on one strategy (choose A or B):**

**A — Single file at service root (recommended)**  
1. Load **once** in `deployment/server.js` (and `backend` dev entry) from `path.resolve(serviceRoot, '.env')` or `.env.production` based on `NODE_ENV`.  
2. Remove redundant `dotenv.config` from `db/index.ts` and `jwt.ts` (or point them at the same absolute service-root file).  
3. Document: only `services/webinar/.env` (dev) / `.env.production` (prod) needed.

**B — Explicit dual copy (ops discipline)**  
1. Keep current loaders.  
2. Require deploy scripts to copy/sync `.env.production` → `.env` at service root.  
3. Higher human-error rate — acceptable only short term.

**Also:**

4. Delete hardcoded DB user/password fallbacks in routes/diagnostic — fail fast if `DB_*` missing.  
5. Delete insecure JWT string fallbacks in production (`jwt.ts`) — require env.  
6. Keep `.env.example` name-only; never commit real files.

### Files affected

| Path | Change type |
|------|-------------|
| `services/webinar/deployment/server.js` | Canonical load |
| `services/webinar/backend/src/db/index.ts` | Align/remove dotenv |
| `services/webinar/backend/src/utils/jwt.ts` | Align/remove dotenv; no weak defaults in prod |
| `services/webinar/backend/src/routes/publicLeadRoutes.ts` | Remove credential fallbacks |
| `services/webinar/backend/src/routes/webinarLeadsRoutes.ts` | Remove credential fallbacks |
| `services/webinar/backend/src/diagnostic.ts` | Remove credential fallbacks |
| `services/webinar/.env.example` | Document single strategy |
| `services/webinar/README.md` | Operator instructions |

### Risk level

**High** — silent misconfiguration → empty DB vars, insecure JWT defaults, or legacy DB fallbacks.

### Validation method

```text
1. Start with only the documented env file present
2. Log (non-secret) that DB_HOST / DB_NAME / NODE_ENV are set
3. Intentionally omit JWT_SECRET in staging → process should refuse to sign (after fix)
4. Intentionally omit DB_* → no legacy username should appear in logs/connections
5. Login + me succeed with one-file setup
```

---

## Cross-cutting risks (track with remediation)

| Item | Notes |
|------|--------|
| Plaintext password compare in `authController` | Separate hardening ticket after DB seed sanitization |
| `/health` false DB status | Improve readiness probe when implementing ops monitoring |
| `authService.ts` hardcoded demo login | Dead/parallel path — ensure unused; remove before prod |
| IMP `VITE_WEBINAR_URL` | No change in this plan; set when sidecar HTTPS URL is stable |

---

## Acceptance criteria for “remediation complete”

All must pass on staging before production traffic:

1. Dedicated MySQL imported and backed up.  
2. One documented env-loading strategy; no legacy DB fallbacks hit.  
3. FE production build contains only the intended API host.  
4. CORS allowlist matches staging/prod origins (or same-origin only).  
5. Login → me → refresh → me works.  
6. IMP launcher still only opens URL (no IMP code changes required for these backend/FE fixes).

---

## Suggested future commit theme (when implementing)

```
fix(webinar): remediate prod CORS, env loading, API URL, and auth refresh
```

*(Do not create that commit until implementation is explicitly requested.)*

---

*End of remediation plan.*
