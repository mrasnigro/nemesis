# Sidecar Integration Checklist

**Status:** Standard process for integrating external products into IMP  
**Version:** 1.0  
**Date:** 2026-08-06  
**Baseline architecture:** `docs/IMP_PLATFORM_ARCHITECTURE_V1.md`  
**Reference implementation:** Webinar (`services/webinar` + `src/modules/webinar` launcher)

**Rule:** Do not merge foreign UI into `src/modules`. Sidecars live under `services/<id>/`. IMP owns shell, entitlements, and launch.

Use one copy of this checklist per product. Mark items `[x]` when done; record blockers in the product’s own docs.

---

## How to use

| Step | Output |
|------|--------|
| Clone this checklist into a product note (or track in PR) | Named `docs/<PRODUCT>_SIDECAR_CHECKLIST.md` (optional) |
| Complete sections 1 → 11 in order | Architecture decision locked before coding |
| Do not start IMP launcher (\$9) before security (\$3) and ownership (\$6) | Avoids insecure shortcuts |
| Gate production on \$11 | No “launch then fix secrets” |

---

## 1. Initial source code audit

Confirm the client delivery is usable as a sidecar.

- [ ] Locate uncompiled source (not only binaries / zip of `dist`)
- [ ] Identify stack: frontend framework, backend runtime, DB, auth, realtime/media
- [ ] Inventory entry points (`package.json` scripts, `server.js`, Docker, host YAML)
- [ ] List API surface (routes/prefixes) and public vs authenticated areas
- [ ] List data stores (SQL dump, ORM schema, local sqlite leftovers)
- [ ] Note hardcoded domains, CORS origins, and third-party keys
- [ ] Flag secrets in repo (`.env`, deploy YAML, drizzle config, route fallbacks)
- [ ] Confirm license / ownership allows hosting beside IMP
- [ ] Record product version / release label (e.g. M102.x)

**Exit criteria:** Written inventory of stack, endpoints, DB, and secret hotspots.

---

## 2. Architecture classification

Decide how the product relates to IMP.

| Question | Native module | Sidecar (integrated service) |
|----------|---------------|------------------------------|
| Already a full FE + BE + DB product? | Rarely | **Yes → sidecar** |
| Needs WebRTC / heavy media / own JWT? | Avoid rewrite | **Sidecar** |
| Thin UI over IMP mock data? | **Native** | Overkill |
| Independent deploy / scaling needed? | Shared SPA only | **Sidecar** |

- [ ] Choose **sidecar** vs **native** vs **reject/rewrite** (document why)
- [ ] Assign module `id` (registry id = route segment = `services/<id>` when possible)
- [ ] Place source under `services/<id>/` with boundary folders (`frontend/`, `backend/`, `database/`, `deployment/` as applicable)
- [ ] Prohibit IMP Vite imports from `services/<id>`
- [ ] Update / create architecture note linking to `IMP_PLATFORM_ARCHITECTURE_V1.md`

**Exit criteria:** Explicit “sidecar” decision and target folder layout.

---

## 3. Security review

Treat the sidecar as a production internet surface.

- [ ] Remove or scrub committed passwords, JWT defaults, and DB URLs from tracked files
- [ ] Ensure `.gitignore` ignores `.env`, `.env.production`, and `*.local` (keep `.env.example`)
- [ ] Replace insecure JWT/DB fallbacks in code **or** document as must-fix before prod (prefer fix)
- [ ] Review CORS: no `*` with credentials; env-driven allowlist including IMP origin if needed
- [ ] Review auth: Bearer/cookie model, refresh flow, admin vs client roles
- [ ] Review upload / media limits and path traversal on file storage
- [ ] Confirm HTTPS required for WebRTC / cookies in production
- [ ] Plan secret storage (host env / secret manager — never in git)
- [ ] Rotate any credentials that ever appeared in shared source

**Exit criteria:** No live secrets in git; known code-level secret risks ticketed or fixed.

---

## 4. Environment configuration

Separate IMP build-time config from sidecar runtime config.

### IMP shell

- [ ] Add `VITE_<SERVICE>_URL` (absolute `http`/`https`) to root `.env.example`
- [ ] Document rebuild requirement after env change
- [ ] Never commit real `.env` / `.env.local`

### Sidecar

- [ ] Provide `.env.example` with **variable names only** (empty or safe placeholders)
- [ ] Document which files loaders read (e.g. `.env` vs `.env.production` vs `backend/.env`)
- [ ] Align frontend build vars (`REACT_APP_*` / `VITE_*`) with what the sidecar actually uses
- [ ] List required vars: `PORT`, `DB_*`, `JWT_*`, API public URL, `NODE_ENV`, …

**Exit criteria:** Examples committed; real values only in local/untracked or secret store.

---

## 5. Deployment validation

Prove the sidecar runs **independently** before IMP launchers.

- [ ] `npm install` (or equivalent) succeeds on target Node major
- [ ] Backend builds (e.g. `tsc` → `dist/`)
- [ ] Frontend production build succeeds
- [ ] Process starts and binds configured port
- [ ] Health (or equivalent) returns success for process-up
- [ ] Static SPA (if served by BE) returns `index.html` + assets
- [ ] Document host requirements (Node version, FFmpeg, disk for media, etc.)
- [ ] Prefer dedicated CI pipeline for `services/<id>` separate from IMP SPA

**Exit criteria:** Written runtime validation note (install/build/start/HTTP).

---

## 6. Database ownership decision

Lock the system of record.

- [ ] Decide SoR: **sidecar DB** (default) vs shared IMP DB (exception — justify)
- [ ] Provision a **new** database for IMP-controlled environments (do not reuse client shared prod casually)
- [ ] Import schema/dump; record migration tool (Drizzle/Prisma/raw SQL)
- [ ] Clarify what IMP may eventually sync (IDs, leads) vs what stays sidecar-only
- [ ] No schema rewrites “for IMP convenience” without product owner approval
- [ ] Backup / retention ownership assigned

**Exit criteria:** One-sentence ownership statement (“`<product>` MySQL is SoR for …”).

---

## 7. Authentication strategy

Pick the phase and do not skip docs.

| Phase | Strategy | When |
|-------|----------|------|
| 1 | Independent login in sidecar | First integration |
| 2 | Deep links + return-to-IMP | UX polish |
| 3 | One-time handoff code → sidecar JWT | After stable deploy |
| 4 | Shared IdP (OIDC/SAML) | Platform-wide SSO |

- [ ] Phase 1: confirm double-login is acceptable temporarily
- [ ] Reserve handoff hooks in IMP config/launcher (no long-lived tokens in URLs)
- [ ] Design identity map table: IMP user/workspace → sidecar user + role
- [ ] Forbid accepting raw IMP mock passwords as sidecar JWTs
- [ ] Document logout / session expiry expectations across products

**Exit criteria:** Chosen phase documented; handoff design sketched for Phase 3+.

---

## 8. Permission mapping

Map IMP entitlements to sidecar authorization.

- [ ] Register module in `src/modules/registry.js`
- [ ] Ensure customer `modulesEnabled` and user `assignedModules` can grant the module
- [ ] Gate IMP routes with `ProtectedRoute` + `ModuleAccessRoute`
- [ ] Define mapping matrix (example):

| IMP condition | Sidecar outcome |
|---------------|-----------------|
| No module access | Do not launch / no handoff |
| `imp` + module access | Sidecar end-user role (e.g. `client`) |
| IMP `admin` + policy | Sidecar `admin` **or** deny (product decision) |
| Public attendees | Sidecar public routes only (no IMP login) |

- [ ] Add fine-grained permission catalog stubs only if admin UI needs them
- [ ] Avoid inventing sidecar ACL features inside IMP

**Exit criteria:** Matrix agreed; module grant path verified for at least one demo user.

---

## 9. IMP launcher creation

Build the shell integration — not a UI port.

- [ ] Create thin module under `src/modules/<id>/`:
  - [ ] `config/<id>Config.js` — read `VITE_<SERVICE>_URL`
  - [ ] `services/<id>Launcher.js` — validate absolute URL; `window.open(..., 'noopener,noreferrer')`
  - [ ] `pages/<Id>Home.jsx` — CTA to open sidecar; disabled state if URL missing
  - [ ] Optional SSO seam: `buildLaunchUrl({ handoffCode })` / `launchWithHandoff`
- [ ] Wire `AppRoutes` to a single home route (no foreign nested routers)
- [ ] Keep IMP visual system (layout/CSS); do not import sidecar components
- [ ] Update module registry copy (launcher wording, version badge if useful)
- [ ] Document in `docs/<PRODUCT>_IMP_LAUNCHER.md`

**Exit criteria:** Entitled user can open sidecar from IMP; source boundary intact.

---

## 10. End-to-end testing

Validate the full journey.

- [ ] IMP login succeeds for test workspace user
- [ ] User **without** module access is denied
- [ ] User **with** module access reaches launcher page
- [ ] Built/dev bundle contains correct service URL when env set
- [ ] CTA opens correct origin (new tab / chosen mode)
- [ ] Sidecar frontend loads (HTML + assets)
- [ ] Sidecar API reachable (`/health`, auth probe)
- [ ] Document DB-dependent failures separately from “process up”
- [ ] Record results in `docs/<PRODUCT>_END_TO_END_VALIDATION.md`
- [ ] Clean up temporary env files after the run

**Exit criteria:** Pass/fail table with blockers and required env vars.

---

## 11. Production readiness checklist

Ship only when all critical items pass.

### Security

- [ ] No secrets in git history for this release (or rotated if leaked)
- [ ] TLS on IMP and sidecar public URLs
- [ ] CORS allowlist matches real IMP + sidecar origins
- [ ] JWT secrets are unique, long, and env-injected

### Operations

- [ ] Dedicated DB backup verified
- [ ] Health monitoring / alerting defined
- [ ] Log retention and PII handling agreed
- [ ] Rollback plan (IMP static + sidecar Node independently)

### Product

- [ ] Double-login or SSO behavior accepted by stakeholders
- [ ] Support runbook: where to look (IMP vs `services/<id>`)
- [ ] Architecture V1 compliance confirmed (launcher-only IMP module)

### Config

- [ ] Production `VITE_<SERVICE>_URL` points at HTTPS sidecar
- [ ] Sidecar `REACT_APP_*` / API URL not pointed at foreign legacy domains
- [ ] `.env.example` files remain placeholders only

**Exit criteria:** Explicit “go / no-go” with owner sign-off.

---

## Deliverables matrix (per product)

| Artifact | Required |
|----------|----------|
| `services/<id>/` boundary layout | Yes |
| `src/modules/<id>/` launcher | Yes |
| Registry + routes + entitlements | Yes |
| `.env.example` (IMP + sidecar) | Yes |
| Security / env scrub notes | Yes |
| Runtime validation doc | Yes |
| IMP launcher doc | Yes |
| E2E validation doc | Yes |
| Checklist completion record | Recommended |

---

## Anti-patterns (do not do)

1. Copying sidecar React pages into `src/modules/<id>`  
2. Importing `services/<id>` from the IMP Vite app  
3. Rewriting a mature sidecar “to match native modules” without a rewrite project  
4. Putting long-lived JWTs in query strings  
5. Sharing one production DB password across clients and IMP  
6. Calling the journey “done” when only the process starts but DB auth fails  
7. Using iframes for WebRTC/studio apps without a dedicated framing design  

---

## Quick reference — Webinar (example)

| Checklist area | Webinar outcome |
|----------------|-----------------|
| Classification | Sidecar |
| Path | `services/webinar` + `src/modules/webinar` launcher |
| Env | `VITE_WEBINAR_URL` |
| Auth phase | 1 — independent login |
| SoR | Webinar MySQL |
| Docs | `docs/WEBINAR_*.md` |

---

*This checklist is the standard IMP process for future external product integration. Deviations require an architecture note and explicit stakeholder approval.*
