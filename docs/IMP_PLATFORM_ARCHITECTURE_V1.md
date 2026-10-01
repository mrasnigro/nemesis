# IMP Platform Architecture V1

**Status:** Architecture standard (post–Webinar sidecar integration)  
**Date:** 2026-08-06  
**Scope:** Establish how the IMP shell, native modules, and integrated external products coexist  
**Code changes in this deliverable:** None

Related documents:

- `docs/WEBINAR_SIDECAR_INTEGRATION_PLAN.md`
- `docs/WEBINAR_IMP_LAUNCHER.md`
- `docs/WEBINAR_SERVICE_STRUCTURE.md`
- `docs/WEBINAR_END_TO_END_VALIDATION.md`
- `docs/WEBINAR_ENVIRONMENT_SECURITY_CHECK.md`

---

## 1. Platform overview

IMP (CRM IMP) is a **multi-module commercial platform shell**: authentication, workspace tenancy, module catalog, admin surface, and in-app module experiences.

```
┌─────────────────────────────────────────────────────────────┐
│                     IMP Platform Shell                       │
│  React 19 + Vite + React Router                              │
│  Auth · Workspace · Module Registry · Admin · Launcher UI    │
├──────────────────────────┬──────────────────────────────────┤
│   Native modules         │   Integrated services (sidecars) │
│   (in-bundle SPA)        │   (separate deployables)         │
│   training-ai, bdr,      │   webinar → services/webinar     │
│   prospecting, radar,    │   (React + Express + MySQL)      │
│   vsl, …                 │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

**Principles**

1. **IMP is the shell** — identity gateway (today mock), entitlements, navigation, branding.  
2. **Modules are products** — either implemented natively in `src/modules/*` or launched as external services.  
3. **Sidecars stay independent** — their source, runtime, and data stores are not merged into the IMP Vite graph.  
4. **Entitlements stay in IMP** — workspace + module access gate the launcher; the sidecar owns its own domain auth until SSO exists.

---

## 2. Native modules vs integrated services

| Kind | Definition | Location | Runtime |
|------|------------|----------|---------|
| **Native module** | UI and (mock) logic ship inside the IMP SPA | `src/modules/<id>/` | Same origin as IMP |
| **Integrated service (sidecar)** | Mature external product; IMP exposes a launcher + config + future bridge | `services/<id>/` + thin `src/modules/<id>/` launcher | Separate origin/process |

### Current inventory

| Module ID | Type | Notes |
|-----------|------|--------|
| `training-ai` | Native | In-SPA training / simulation flows |
| `bdr` | Native | Dialer / outbound operations |
| `prospecting` | Native | Prospect search and BDR handoff |
| `radar` | Native | Trends / intelligence views |
| `vsl` | Native | VSL campaigns and metrics |
| `webinar` | **Integrated service** | Launcher only in IMP; product in `services/webinar` |

### Decision rule

Prefer **sidecar** when the product already exists as a full stack (own API, DB, realtime/media) and rewriting into IMP would destroy value.

Prefer **native** when the feature is small, mock-friendly, tightly coupled to IMP UX, and has no independent deploy lifecycle.

---

## 3. Current folder structure

```
imp-platform/
├── src/                          # IMP shell + native modules
│   ├── auth/                     # Mock auth (AuthContext)
│   ├── workspace/                # Customer/user module entitlements
│   ├── modules/
│   │   ├── registry.js           # Module catalog (launcher cards, paths)
│   │   ├── training-ai/
│   │   ├── bdr/
│   │   ├── prospecting/
│   │   ├── radar/
│   │   ├── vsl/
│   │   └── webinar/              # LAUNCHER ONLY (not WebinarPro UI)
│   │       ├── config/webinarConfig.js
│   │       ├── services/webinarLauncher.js
│   │       ├── pages/WebinarHome.jsx
│   │       └── …
│   ├── routes/                   # AppRoutes, ProtectedRoute, ModuleAccessRoute
│   ├── layouts/                  # Shell / module / admin layouts
│   ├── pages/                    # Login, dashboard, admin pages
│   └── data/                     # Mock admin + access layer
├── services/
│   └── webinar/                  # WebinarPro sidecar (independent app)
│       ├── frontend/
│       ├── backend/
│       ├── database/
│       ├── deployment/
│       ├── package.json
│       └── README.md
├── docs/                         # Architecture & integration records
├── public/
├── .env.example                  # VITE_WEBINAR_URL=…
├── package.json                  # IMP Vite app
└── vite.config.js
```

**Hard boundary:** `src/` must not import from `services/webinar` (no shared React tree, no bundling sidecar pages).

---

## 4. Authentication model

### Today (V1)

| Surface | Mechanism |
|---------|-----------|
| IMP | Mock users in `src/auth/AuthContext.jsx` (`admin`, `bdr`, `sdr`, `imp`); session in `sessionStorage` |
| Roles | `admin` → `/admin`; `imp` → workspace `/dashboard` and modules |
| Webinar sidecar | Independent JWT (`admin` / `client` in Webinar DB); Phase 1 = second login after launch |

### Workspace binding

Login username maps to a workspace user/customer via `src/data/access` (`authWorkspaceMap`), e.g. `bdr` / `imp` → `usr_002` @ `cus_001`.

### Implications

- IMP auth ≠ Webinar auth in V1.  
- Admin IMP users do not automatically become Webinar admins.  
- Future SSO must preserve this separation until an explicit identity map exists.

---

## 5. Permission model

### Layers

```
Platform role (admin | imp)
    → Workspace customer modulesEnabled
        → User assignedModules
            → Effective modules = intersection
                → ModuleAccessRoute(moduleId)
                    → (optional) fine-grained permission keys per module
```

### Enforcement

| Gate | Where |
|------|--------|
| Must be logged in + role | `ProtectedRoute` |
| Must have module entitlement | `ModuleAccessRoute` / `ModuleRoute` |
| Catalog / launcher visibility | `registry.js` + workspace `availableModules` |
| Admin RBAC catalog | `src/data/admin/permissions.js` (+ per-module `*Permissions.js`) |

### Webinar-specific

- Entitlement key: module id `webinar`.  
- Fine-grained keys (`webinar.manage`, `webinar.participants`, `webinar.metrics`) exist for admin catalog / future mapping; Phase 1 launcher relies primarily on **module access**.  
- Sidecar roles remain `admin` | `client` until a handoff maps IMP grants → Webinar identity.

---

## 6. Webinar sidecar architecture

```
IMP  /modules/webinar
        │  VITE_WEBINAR_URL
        │  launchWebinarService() → window.open(..., noopener,noreferrer)
        ▼
services/webinar
   ├── frontend/     React 18 + Vite + Tailwind (SPA)
   ├── backend/      Express + TypeScript + Drizzle + JWT + WebRTC APIs
   ├── database/     MySQL dump (webinar.sql)
   └── deployment/   server.js, build/start scripts, host config
```

### Responsibilities

| Owner | Owns |
|-------|------|
| IMP | Entry route, entitlement, safe open, env URL, future handoff caller |
| Webinar service | Streaming, chat, leads, studio, plans, its MySQL SoR |

### Config

```bash
# IMP
VITE_WEBINAR_URL=https://webinar.example.com

# Sidecar (see services/webinar/.env.example)
PORT= DB_HOST= DB_USER= DB_PASSWORD= DB_NAME= JWT_SECRET= …
```

### Non-negotiables

- Do **not** copy Webinar components into `src/modules/webinar`.  
- Do **not** rewrite Webinar features “into” IMP native style.  
- Do **not** point production at legacy Hostinger credentials; use dedicated MySQL + rotated secrets.

---

## 7. Future SSO strategy

Phased path (already reserved in code seams):

| Phase | Experience |
|-------|------------|
| **1 (current)** | Independent login after new-tab launch |
| **2** | Deep links / return-to-IMP navigation polish |
| **3** | JWT / one-time **handoff code** (IMP entitlement → Webinar session) |
| **4+** | Platform IdP (OIDC/SAML); both IMP and sidecars as RPs |

### Handoff rules (Phase 3)

1. Verify IMP session + `hasModuleAccess('<service>')`.  
2. Mint a **short-lived, one-time** code (not a long-lived JWT in the query string).  
3. Redirect/open sidecar with code; sidecar exchanges code **server-side** for its own tokens.  
4. Persist mapping: `imp_user_id` / `workspace_id` → sidecar `user_id` + role.

Seams today:

- `buildWebinarLaunchUrl({ handoffCode, returnTo })`
- `launchWebinarWithHandoff(code)`

---

## 8. Rules for adding future integrated products

Use this checklist for every new sidecar (e.g. future “MailPro”, “EventsCloud”):

### A. Placement

1. Put product source under `services/<product-id>/` with clear `frontend/`, `backend/`, `database/`, `deployment/` (adapt as needed).  
2. Add a **thin** IMP module under `src/modules/<product-id>/` that only does: config, launcher, home page, permission catalog stubs.  
3. Register the module in `src/modules/registry.js`.  
4. Wire routes with `ProtectedRoute` + `ModuleAccessRoute` — never mount foreign routers inside IMP.

### B. Boundaries

| Allowed in IMP | Forbidden in IMP |
|----------------|------------------|
| `VITE_<PRODUCT>_URL` (or similar) | Importing `services/<id>` into Vite |
| `*Launcher.js` / `*Config.js` | Copy-paste of sidecar pages/components |
| Docs under `docs/` | Rewriting sidecar domain logic |
| One-time handoff client calls | Embedding long-lived secrets in the SPA |

### C. Security & config

1. Extend root `.gitignore` for env patterns; commit only `.env.example` (names/placeholders).  
2. Scrub deploy samples of real passwords before merge.  
3. Prefer new-tab launch for media/WebRTC apps; treat iframe as explicit later design.  
4. Document CORS origins for sidecar API when IMP and service differ by origin.

### D. Documentation (minimum set)

For each integrated product, add:

1. Sidecar structure note  
2. IMP launcher note  
3. Runtime/E2E validation note when first go-live  

### E. Naming

- Module `id` matches registry, route segment, and `services/` folder when possible (`webinar` ↔ `services/webinar`).  
- Env prefix consistent: `VITE_<SERVICE>_URL`.

---

## 9. Deployment model

### IMP shell

| Item | Model |
|------|--------|
| Artifact | Static Vite build (`dist/`) |
| Hosting | CDN / static host / any static file server |
| Env | Bake `VITE_*` at **build** time |
| Backend | None required for Phase 1 shell (mock data in SPA) |

### Webinar sidecar

| Item | Model |
|------|--------|
| Frontend | Vite build; often served by Express from `frontend/dist` |
| Backend | Always-on Node (Express) |
| Data | Dedicated MySQL/MariaDB |
| Entry | `deployment/server.js` or `npm start` from `services/webinar` |

### Topology (recommended)

```
https://app.example.com          → IMP static
https://webinar.example.com      → Webinar FE + API (or split FE/API deliberately)
```

Same-parent-domain reverse proxy is optional; subdomain isolation is simpler for cookies/CSP/WebRTC.

### CI suggestion

- Pipeline A: build/test IMP (`src/`).  
- Pipeline B: build/test/deploy `services/webinar` (and future sidecars).  
- Do not couple release trains unless handoff protocol requires coordinated versions.

---

## 10. Known limitations

| Area | Limitation |
|------|------------|
| IMP auth | Mock credentials; not production IdP |
| IMP data | Admin/access layer is in-memory / seeded JS, not a real API |
| Webinar auth | Separate login until SSO handoff |
| Webinar DB | Requires real MySQL; health endpoint can report DB “connected” falsely |
| CORS | Sidecar historically hardcoded legacy production domains — must be env-driven per environment |
| Launcher | New tab only; no iframe shell integration |
| Fine-grained webinar perms | Catalog exists; not enforced inside sidecar |
| Version labels | Sidecar product version (e.g. M102.x) may differ from `/health` string |
| Node engines | Sidecar prefers Node 22.x; hosts may run other majors with warnings |
| Monorepo hygiene | Never treat `services/*` as shared libraries for IMP imports |

---

## Architecture standard (summary)

1. **Shell + entitlement in IMP; product depth in native modules or sidecars.**  
2. **Sidecars are first-class deployables under `services/`.**  
3. **IMP modules for sidecars are launchers, not ports of foreign UIs.**  
4. **SSO is additive** via handoff/IdP — never by merging codebases.  
5. **Secrets stay out of git;** examples stay name-only.  
6. **New products follow §8** or they are out of compliance with V1.

This document is the baseline for future IMP platform development after Webinar sidecar integration.
