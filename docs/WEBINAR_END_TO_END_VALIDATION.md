# Webinar End-to-End Validation (IMP ↔ Sidecar)

**Date:** 2026-08-06  
**Scope:** User journey validation between IMP launcher and `services/webinar`  
**Constraint:** No business-logic changes; temporary validation env files removed after the run

---

## Verdict

| Layer | Result |
|-------|--------|
| IMP auth model (mock) | **Pass** (source + gate wiring) |
| IMP webinar module permission | **Pass** for demo user `bdr` / `imp` → `usr_002` |
| `/modules/webinar` route | **Pass** |
| Launcher URL generation | **Pass** (`VITE_WEBINAR_URL` baked into build) |
| Open Webinar service target | **Pass** (config + live `:3001`) |
| Webinar frontend loading | **Pass** |
| Webinar backend process / HTTP API reachability | **Pass** |
| Webinar MySQL-backed auth success | **Blocked** (no real DB in this run) |
| Browser click-through login UI | **Not automated** (see notes) |

**Overall:** Integration path is ready for Phase 1 launcher usage once `VITE_WEBINAR_URL` is set and the sidecar + MySQL are deployed. Full product login inside Webinar still needs a live database and remains independent of IMP SSO.

---

## Tested flow

```
1. IMP credentials (mock)     bdr/bdr or imp/imp  → role `imp`
2. Workspace access           auth map → usr_002 @ cus_001
3. Module permission          intersection(customer, user) includes `webinar`
4. Navigate                   /modules/webinar (ProtectedRoute + ModuleRoute)
5. Launcher                   build URL from VITE_WEBINAR_URL
6. Open                       window.open(..., 'noopener,noreferrer') → sidecar origin
7. Webinar FE                 GET / + /assets/* from Express static
8. Webinar API                GET /health, POST /api/auth/login, GET /api/auth/me
```

---

## Successful steps

### 1. IMP authentication

| Check | Result |
|-------|--------|
| `bdr` / `bdr` → role `imp`, home `/dashboard` | Pass (AuthContext) |
| `imp` alias → same workspace as `bdr` | Pass |
| `admin` stays on admin surface (not module shell) | Pass |

*Note:* Authentication is mock/sessionStorage-based; validated via source contracts and route guards rather than a headed browser driver.

### 2. IMP Webinar permission

| Check | Result |
|-------|--------|
| `cus_001.modulesEnabled` includes `webinar` | Pass |
| `usr_002.assignedModules` includes `webinar` | Pass |
| Effective access for bdr mapping includes `webinar` | Pass |
| `ModuleAccessRoute` denies when `hasModuleAccess` false | Pass (code path) |
| AppRoutes: `ProtectedRoute(['imp'])` + `ModuleRoute('webinar')` | Pass |

### 3. `/modules/webinar` route

| Check | Result |
|-------|--------|
| Route element `WebinarHomePage` | Pass |
| Prototype `/modules/webinar/:eventId` routes removed | Pass |
| IMP `vite preview` `GET /modules/webinar` → 200 SPA shell | Pass (`http://127.0.0.1:4173`) |

### 4. Launcher URL generation

| Check | Result |
|-------|--------|
| Trailing slash stripped | Pass |
| Empty URL → not configured | Pass |
| Handoff seam adds `imp_handoff` / `return_to` | Pass (unused in Phase 1 UI) |
| Production build with `VITE_WEBINAR_URL=http://localhost:3001` | Pass |
| Built JS bundle contains `http://localhost:3001` | Pass |
| Built JS contains label `Acessar Webinar` | Pass |

### 5. Opening Webinar service

| Check | Result |
|-------|--------|
| Launcher uses `_blank` + `noopener,noreferrer` | Pass |
| Target host matches running sidecar (`:3001`) | Pass |

*Interactive popup click not scripted; open contract verified in `webinarLauncher.js`.*

### 6. Webinar frontend loading

| Check | Result |
|-------|--------|
| Sidecar `GET /` → 200 HTML | Pass |
| JS asset under `/assets/*` → 200 | Pass (~408 KB) |
| Static path resolves to `services/webinar/frontend/dist` | Pass (runtime log) |

### 7. Webinar backend API connectivity

| Check | Result | Notes |
|-------|--------|-------|
| Process listens on `3001` | Pass | |
| `GET /health` → 200 | Pass | Reports `database: connected` even when DB auth fails (known quirk) |
| `POST /api/auth/login` reachable | Pass | Returned **500** without MySQL credentials |
| `GET /api/auth/me` | Pass | **401** without token (expected) |

---

## Blockers

| ID | Severity | Blocker | Impact on journey |
|----|----------|---------|-------------------|
| E1 | **High** | No provisioned MySQL + imported `database/webinar.sql` | User cannot complete Webinar login / webinars after opening sidecar |
| E2 | **Medium** | Independent Webinar JWT login (no SSO yet) | User must authenticate twice (IMP then Webinar) |
| E3 | **Medium** | Sidecar CORS allowlist still includes legacy Hostinger domains | Breaks split-origin FE (IMP or WP FE on another host) talking to API; same-origin Express static OK |
| E4 | **Medium** | `/health` false-positive DB status | Ops may think DB is fine when it is not |
| E5 | **Low** | Headed browser E2E (fill login forms, click CTA) not run | Manual QA recommended once envs are live |
| E6 | **Low** | Frontend production default API host may still bake `s1m0ne.tec.br` if WP rebuilt without `REACT_APP_API_URL` | Prefer same-origin `/api` when Express serves FE |

---

## Required environment variables

### IMP (build/dev time)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_WEBINAR_URL` | `http://localhost:3001` | Absolute sidecar origin opened by launcher |

Template: repo root `.env.example`

### Webinar sidecar (runtime)

| Variable | Purpose |
|----------|---------|
| `PORT` | API/static port (default 3001) |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL |
| `JWT_SECRET` `JWT_REFRESH_SECRET` | Auth tokens |
| `JWT_EXPIRY` `JWT_REFRESH_EXPIRY` | Optional |
| `NODE_ENV` | `production` / `development` |

When using `npm start` / `deployment/server.js` from service root, provide:

- `services/webinar/.env.production` (loaded by `deployment/server.js`)
- `services/webinar/.env` (DB loader when cwd is service root)

Templates: `services/webinar/.env.example`, `backend/.env.example`, `frontend/.env.example`

### Webinar frontend (build time, if rebuilt)

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | API base (use same origin `/api` or absolute backend URL) |

---

## Deployment notes

1. **Deploy sidecar first** — MySQL import `database/webinar.sql`, set secrets, `npm run build` + `npm start` (or `deployment/build.sh` / `start.sh`).  
2. **Deploy IMP** with `VITE_WEBINAR_URL` pointing at the public HTTPS sidecar origin (no trailing slash required).  
3. **Phase 1 UX** — users with webinar module access open IMP → Webinar → **Acessar Webinar** (new tab) → Webinar login.  
4. **Do not** embed sidecar source into IMP; keep boundary documented in `docs/WEBINAR_IMP_LAUNCHER.md`.  
5. Before production, scrub/replace legacy domain CORS and rotate any historical credentials (see `docs/WEBINAR_ENVIRONMENT_SECURITY_CHECK.md`).  
6. Validation used temporary placeholder DB users; those files were deleted after the run — do not commit `.env` / `.env.production`.

### Runtime topology used in this validation

| Process | URL |
|---------|-----|
| IMP `vite preview` | `http://127.0.0.1:4173` |
| Webinar Express (`deployment/server.js`) | `http://127.0.0.1:3001` |

Both processes were stopped after checks.

---

## Related docs

- `docs/WEBINAR_IMP_LAUNCHER.md`
- `docs/WEBINAR_SIDECAR_INTEGRATION_PLAN.md`
- `docs/WEBINAR_SERVICE_RUNTIME_VALIDATION.md`
- `docs/WEBINAR_ENVIRONMENT_SECURITY_CHECK.md`

---

## Suggested commit name (docs only)

```
docs(webinar): add IMP–sidecar end-to-end validation report
```
