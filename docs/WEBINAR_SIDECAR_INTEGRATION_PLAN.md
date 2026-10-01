# WebinarPro Sidecar Integration Plan

**Status:** Planning document (no implementation in this deliverable)  
**Decision:** Sidecar Service  
**Product versions referenced:** IMP Platform (Vite React shell) + WebinarPro M102.54 (`services/webinar`)  
**Date:** 2026-08-06

---

## Executive summary

WebinarPro is a mature, standalone SaaS (frontend + Express API + MySQL + WebRTC streaming). IMP is a platform shell with a module registry and a **placeholder** webinar UI backed by seeds.

**Do not** merge WebinarPro source into IMP, rewrite WebinarPro, or port its UI into `src/modules/webinar`.

**Do** keep WebinarPro as an independently deployed sidecar. IMP’s Webinar module becomes a **launcher / integration surface** that opens and (over time) soft-unifies with WebinarPro.

```
IMP Platform (shell)
    └── Webinar Module (launcher + optional adapters)
            └── WebinarPro (sidecar)
                    ├── Frontend React/Vite
                    ├── Backend Express
                    └── MySQL
```

---

## 1. Current IMP Webinar module structure

### Registry and routes

| Concern | Location | Notes |
|--------|----------|--------|
| Module catalog | `src/modules/registry.js` | `id: 'webinar'`, path `/modules/webinar`, status `available` |
| Routes | `src/routes/AppRoutes.jsx` | Nested under `ProtectedRoute` (`imp`) + `ModuleRoute` (`webinar`) |
| Page barrel | `src/pages/modules/Webinar.jsx` | Re-exports events page |
| Module export | `src/modules/webinar/index.js` | Layout + Events / Detail / Metrics |

**Routes today**

- `/modules/webinar` → events list  
- `/modules/webinar/:eventId` → detail / attendance  
- `/modules/webinar/:eventId/metricas` → metrics  

### Module internals

```
src/modules/webinar/
├── Layout.jsx              # ModuleWorkspaceLayout + WebinarProvider
├── context/WebinarContext.jsx
├── data/seeds.js           # Mock events / participants / metrics
├── pages/Events.jsx | Detail.jsx | Metrics.jsx
├── components/             # Cards, toolbar, empty state, icons
├── services/webinarPermissions.js
├── styles/webinar.css
└── utils/status.js
```

### Auth and permissions (IMP side)

- **Auth:** Mock accounts in `src/auth/AuthContext.jsx` (`admin`, `bdr`, `sdr`, `imp`). Workspace users use role `imp`.
- **Module gate:** `WorkspaceContext.hasModuleAccess('webinar')` via `ModuleRoute`.
- **Fine-grained keys** (local to webinar stub only):

  | Key | Intent |
  |-----|--------|
  | `webinar.manage` | Create / edit / publish |
  | `webinar.participants` | Attendance |
  | `webinar.metrics` | Metrics |

  Today, if module access is granted, **all three keys are granted**. There is no call to a real webinar API.

### What the stub is (and is not)

| Is | Is not |
|----|--------|
| UX prototype aligned with other IMP modules | Production streaming / chat / leads |
| Seeded in-memory state | Connected to MySQL or Express |
| Gated by workspace + module access | WebinarPro JWT / roles |

**Implication for sidecar:** keep this module as the IMP-facing surface; replace seed-driven “product UI” over time with a launch experience into WebinarPro, not with a rewrite of WebinarPro screens inside IMP.

---

## 2. Current WebinarPro architecture

Source of truth: repository folder `services/webinar/` (client-provided uncompiled source of the Lite-running product, organized as a sidecar service).

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind, Zustand, Axios, HLS.js |
| Backend | Express, TypeScript, Drizzle ORM, Zod, JWT (`jsonwebtoken`), bcrypt |
| Database | MySQL (production); dump `database/webinar.sql` |
| Media | Internal WebRTC + chunk streaming; replay manager / scheduler |
| Deploy helpers | `deployment/server.js` (prod entry → `backend/dist`), `deployment/build.sh`, `deployment/start.sh`, Hostinger-oriented `deployment/hstng.yml` |

### Frontend surface (`frontend/src`)

- **Public:** landing, login/register, forgot/reset password, public webinar access by code  
- **Client app:** dashboard, webinars CRUD/detail, leads, subscription, profile, live view  
- **Admin:** users, plans, webinars, wizard  
- **Studio:** preview + live room (presenter), chat / stream controls  

Routing is owned by WebinarPro’s `App.tsx` (`BrowserRouter`), not by IMP.

### Backend surface (`backend/src`)

Illustrative API mount points from `index.ts`:

- `/health`
- `/api/auth/*` — register, login, me, logout, forgot/reset password  
- `/api/leads`, `/api/public/leads`, `/api/client/leads`, `/api/webinar-leads`  
- `/api/admin/*`, `/api/admin/clients`, `/api/admin/payments`  
- `/api/client/webinars`, `/api/client`  
- `/api/webrtc`  
- Static SPA from `frontend/dist` in production  

Auth middleware: Bearer JWT; `adminMiddleware` requires `role === 'admin'`. Roles in schema: **`admin` | `client`**.

### Data (MySQL dump highlights)

~30 tables including: `users`, `plans`, `client_subscriptions`, `webinars`, `webinar_access_codes`, `leads`, `chat_messages`, `lead_chat_messages`, `recordings`, `replay_*`, `polls`, `ctas`, `payments`, `sessions`, audit/system logs, etc.

### Hardcoded / env reality (must be generalized for IMP sidecar)

- CORS allowlist and default API URL currently oriented to Hostinger domain (`s1m0ne.tec.br`)  
- `deployment/hstng.yml` contains environment-shaped secrets — must not ship to IMP shared config; rotate before any shared hosting  
- Frontend `REACT_APP_API_URL` / Vite `define` for API base  

**Treat WebinarPro as a complete product owned by its deploy unit**, not as libraries to import into IMP’s Vite app.

---

## 3. Recommended deployment architecture

```
                    ┌─────────────────────────────────────┐
                    │           Users / browsers          │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
     ┌────────────────┐   ┌─────────────────┐   ┌──────────────────┐
     │ IMP Frontend   │   │ WebinarPro FE   │   │ Public live /   │
     │ (Vite static)  │   │ (Vite static or │   │ access pages     │
     │ platform shell │   │ served by BE)   │   │ (same WP FE)     │
     └───────┬────────┘   └────────┬────────┘   └────────┬─────────┘
             │ launch URL          │ /api                 │
             │ (+ optional token)  ▼                      │
             │            ┌─────────────────┐             │
             └───────────►│ WebinarPro BE   │◄────────────┘
                          │ Express :3001   │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ MySQL           │
                          │ webinarpro DB   │
                          └─────────────────┘
```

### Principles

1. **Separate deployables:** IMP FE ≠ WebinarPro FE ≠ WebinarPro BE ≠ MySQL.  
2. **Separate origins (preferred):** e.g. `app.imp.example` and `webinar.imp.example` (or path proxy only at the edge).  
3. **Preserve WebinarPro runtime:** keep Express serving API + (optionally) its SPA as today; only change config (CORS, env, base URLs).  
4. **IMP never hosts WebinarPro business logic** in its bundle.

### Optional edge pattern (same parent domain)

Reverse proxy:

- `https://platform.example/` → IMP static  
- `https://platform.example/webinar-app/` → WebinarPro FE (or subdomain)  
- `https://platform.example/webinar-api/` → WebinarPro BE `/api`  

Subdomain isolation is usually cleaner for cookies, CSP, and CORS.

---

## 4. How IMP should launch / open WebinarPro

### Phase 1 UX (recommended default)

IMP Webinar module page becomes a **launcher**, not a second webinar product:

1. User opens `/modules/webinar` inside IMP (workspace + module access already enforced).  
2. UI explains that live webinars run on WebinarPro.  
3. Primary CTA: **“Abrir WebinarPro”** → navigates to configured base URL.  

**Open modes (choose one explicitly per environment):**

| Mode | Behavior | Pros | Cons |
|------|----------|------|------|
| **A. New tab** | `window.open(WEBINARPRO_BASE_URL)` | Isolates streaming/WebRTC; no IMP shell fight | Context switch |
| **B. Same tab** | `location.assign(...)` | Simple | Leaves IMP chrome |
| **C. iframe** | Embed WP FE in IMP layout | Feels “inside module” | Cookie/CSP/WebRTC/fullscreen friction — **avoid for Phase 1** |

**Recommendation:** Mode **A** (new tab) for Studio/live; Mode **B** acceptable for admin/client dashboards if product prefers. Defer iframe until auth + framing headers are deliberately designed.

### Deep links (later)

Map IMP intents → WebinarPro paths without rewriting WP routing:

| IMP intent | Example WebinarPro path |
|------------|-------------------------|
| Client webinars list | `/dashboard/webinars` |
| Create webinar | `/dashboard/webinars/new` |
| Studio | `/studio/:id` |
| Admin webinars | `/admin/webinars` |
| Public access | `/webinar/:clientId/live/:accessCodeId` |

Store base URL + optional path templates in IMP env / config only.

### What happens to seed pages (Events / Detail / Metrics)

- **Phase 1:** Replace or demote seed list with launcher + links; keep routes so the module does not break.  
- **Phase 2:** Optional “overview” cards that link out (still no merge of WP components).  
- Do not re-implement WP streaming UI in IMP.

---

## 5. Authentication integration options

IMP today: mock local auth. WebinarPro: JWT Bearer with own `users` table (`admin` / `client`).

### Option A — Independent login (Phase 1)

User logs into IMP, then separately into WebinarPro.

| | |
|--|--|
| **Effort** | Lowest |
| **Changes** | Config URLs only; no WP auth changes |
| **UX** | Double login |
| **Fit** | Sidecar Phase 1 |

### Option B — JWT handoff (Phase 3 target)

1. IMP verifies user + `hasModuleAccess('webinar')`.  
2. An **integration endpoint** (IMP BFF or thin WP “imp-bridge” route) issues a **WebinarPro-scoped** access token for a mapped WP user.  
3. IMP redirects to WP with one-time code or fragment/query that WP exchanges for JWT (prefer **one-time code + POST**, not long-lived JWT in URL).  
4. WP session continues as today (Zustand + Axios interceptor).

| | |
|--|--|
| **Effort** | Medium; requires a small bridge — **not** a rewrite of WP features |
| **Risk** | Token leakage if put in query strings; role confusion if mapping wrong |
| **Fit** | Sidecar without merging codebases |

**Hard rule:** Do not accept raw IMP mock credentials as WP JWT. Map identities explicitly.

### Option C — Future SSO

OIDC/SAML (or shared IdP) with both IMP and WebinarPro as relying parties.

| | |
|--|--|
| **Effort** | Highest |
| **Fit** | When IMP leaves mock auth and multiple modules need single identity |

### Recommended path

`A (now) → B (after stable deploy + identity mapping table) → C (platform-wide IdP)`.

---

## 6. Permission mapping

### IMP concepts

- Platform role: `admin` | `imp` (mock)  
- Workspace module access: `webinar` boolean (and future entitlements)  
- Stub keys: `webinar.manage` | `webinar.participants` | `webinar.metrics`

### WebinarPro concepts

- User role: `admin` | `client`  
- Admin routes vs client routes vs public routes  
- Plan / subscription limits (participants, duration, replay) in WP DB  

### Mapping matrix (recommended)

| IMP condition | WebinarPro outcome |
|---------------|-------------------|
| No `hasModuleAccess('webinar')` | Do not launch; no handoff token |
| IMP `admin` + module access | Prefer WP `admin` (if tenant policy allows) **or** dedicated admin WP account |
| IMP `imp` + `webinar.manage` | WP `client` with full webinar management for that client tenant |
| IMP `imp` + only `webinar.metrics` / `participants` | WP `client` read-oriented account **or** Phase 1: still `client` and rely on WP UI (document limitation until WP fine-grained ACLs exist) |
| Public attendee | No IMP login; use WP public access codes only |

### Tenant model decision (document and stick to it)

**Recommended default:** one WebinarPro **client** user (or client org) per IMP workspace (or per IMP customer), with a mapping table:

```
imp_user_id / imp_workspace_id  →  webinarpro_user_id  →  role
```

Avoid sharing a single WP admin password among all IMP users.

### Out of scope for early phases

- Syncing IMP stub permission catalog into WP DB permissions (WP does not expose the same keys).  
- Rewriting WP `adminMiddleware` / role enums.

---

## 7. Required integration layer

No business-logic merge. Only **boundaries**.

### 7.1 Routes (IMP)

| Item | Purpose |
|------|---------|
| Keep `/modules/webinar*` | Module shell entry |
| Add launcher UI / config-driven links | Open sidecar |
| Optional `/modules/webinar/open` | Centralize redirect + future handoff |

Do **not** mount WebinarPro React routes inside IMP’s router.

### 7.2 Adapters (IMP-only, thin)

Suggested (future) modules — illustrative names only:

| Adapter | Responsibility |
|---------|----------------|
| `webinarProConfig` | Base URL, API URL, open mode, feature flags |
| `webinarProLaunch` | Build deep links; open tab/assign |
| `webinarProAuthBridge` (Phase 3) | Request one-time handoff; never store WP refresh tokens in localStorage of IMP if avoidable |
| `webinarProUserMap` (Phase 3–4) | Lookup IMP → WP identity |

These live under IMP (`src/modules/webinar/services/...` or similar). They **call** WebinarPro; they do not import `services/webinar` source into the IMP Vite graph.

### 7.3 API communication

| Caller | Target | Notes |
|--------|--------|-------|
| WebinarPro FE | WebinarPro BE `/api/*` | Unchanged pattern |
| IMP FE | WebinarPro BE | Only for bridge health / handoff / optional read APIs in later phases; CORS must allow IMP origin |
| Attendees | WebinarPro public APIs | Unchanged |

Avoid IMP FE proxying all WP traffic long-term; prefer browser → WP API directly after launch.

### 7.4 Environment variables

**IMP build/runtime**

```bash
VITE_WEBINARPRO_BASE_URL=https://webinar.example.com
VITE_WEBINARPRO_API_URL=https://webinar.example.com/api
VITE_WEBINARPRO_OPEN_MODE=new_tab   # new_tab | same_tab
VITE_WEBINARPRO_ENABLED=true
```

**WebinarPro backend**

```bash
PORT=3001
NODE_ENV=production
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=webinarpro
JWT_SECRET=...          # strong, unique to WP
CORS_ORIGIN=https://app.example.com,https://webinar.example.com
# plus any refresh secrets WP already expects
```

**WebinarPro frontend build**

```bash
REACT_APP_API_URL=https://webinar.example.com/api
REACT_APP_ENV=production
```

Rotate any secrets previously embedded in deploy YAML before shared environments.

---

## 8. Deployment recommendation

| Component | Recommendation |
|-----------|----------------|
| **IMP hosting** | Static hosting / CDN for Vite build (current IMP model). No Node backend required for Phase 1. |
| **WebinarPro frontend** | Build with Vite; either (1) served by WP Express from `frontend/dist` as today, or (2) separate static host on webinar origin. Prefer **one origin** for FE+API early on to reduce CORS pain. |
| **WebinarPro backend** | Always-on Node 18+/22 process (Hostinger Node, VM, container, or PaaS). Sticky enough for streaming/chunk traffic; size disk for uploads/recordings. |
| **MySQL** | Dedicated database (managed MySQL/MariaDB). Import from `services/webinar/database/webinar.sql` into a **new** IMP-controlled instance — do not point production IMP at the client’s old Hostinger DB with shared credentials. |
| **Source layout in monorepo** | Keep `services/webinar/` as an **adjacent product tree** (or separate repo/submodule). Do not copy into `src/`. CI can build/deploy it as a second pipeline. |

### Local developer topology

| Service | Typical port |
|---------|----------------|
| IMP Vite | 5173 (or project default) |
| WebinarPro FE | 3000 (`frontend` vite config) |
| WebinarPro BE | 3001 |
| MySQL | 3306 |

---

## 9. Security considerations

### CORS

- Expand BE CORS beyond the legacy Hostinger domain to: IMP origin + WebinarPro FE origin.  
- Prefer explicit allowlist + `credentials` only if cookies are used; WP today is primarily Bearer JWT.  
- Do not use `*` with credentials.

### Secrets

- Remove committed production passwords/JWT placeholders from deploy docs before production.  
- Secrets only in env / secret manager.  
- Separate JWT secrets per environment.  
- `backend/sqlite.db` / logs in the source tree are not production sources of truth.

### JWT

- WP tokens remain WP-scoped.  
- Handoff: short-lived one-time codes (seconds), server-side exchange.  
- Never put refresh tokens in URLs or IMP analytics.  
- Validate `aud`/`iss` if/when bridge tokens are introduced.

### Environment configuration

- Distinguishing `development` / `staging` / `production` URLs.  
- Disable public registration on WP if IMP is the only identity gateway (product decision).  
- CSP / `X-Frame-Options`: default deny framing until iframe strategy exists.  

### Network

- Public live pages and WebRTC need HTTPS.  
- Uploads (large video) need size limits and authenticated routes as WP already assumes.  
- Rate-limit auth and public lead endpoints at the edge if possible.

---

## 10. Migration phases

### Phase 1 — Basic module launcher

**Goal:** Real product reachable from IMP without merging code.

- Deploy WebinarPro (FE + BE + MySQL) independently with clean env.  
- Configure IMP env with `VITE_WEBINARPRO_BASE_URL`.  
- Change IMP webinar home toward launcher CTA (implementation in a later task).  
- Keep seed routes harmless or clearly marked “prototype”.  
- Auth: **independent login**.  
- Success: IMP user with webinar module access can open WP and use live features there.

### Phase 2 — Unified navigation experience

**Goal:** Feels like one platform without iframe or code merge.

- Deep links from IMP nav actions (list / create / studio) to WP paths.  
- Optional return links / “Back to IMP” in WP chrome (**minimal** WP config or branding change — still not a feature rewrite).  
- Document open-mode standards (new tab for Studio).  
- Align naming: IMP “Webinar” → WebinarPro product.  
- Success: users rarely hunt for URLs; context preserved via deep links.

### Phase 3 — Authentication integration

**Goal:** One click from IMP to a logged-in WP session.

- Identity mapping table or provisioning API (create WP `client`/`admin` when IMP grants module).  
- One-time handoff code endpoint (bridge).  
- Harden CORS and redirect allowlists.  
- Deprecate casual double-login for internal users.  
- Success: authorized IMP user lands in WP dashboard without retyping WP password.

### Phase 4 — Data synchronization

**Goal:** Cross-module value (e.g. leads → BDR/prospecting) without merging schemas.

- Read-only or event-based sync: webinar leads → IMP CRM-ish modules.  
- Prefer **WP as system of record** for webinars; IMP stores references (`webinarpro_webinar_id`, timestamps) not duplicated stream state.  
- Webhooks or scheduled pull from WP admin/client APIs.  
- Success: marketing/outbound modules see attendees without operators exporting CSV manually.

**Explicit non-goals across all phases:** rewriting WebRTC, chat, studio, or WP admin/client domain logic inside IMP.

---

## 11. Risks and technical decisions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Double product UI (stub vs real) | User confusion | Phase 1 launcher replaces stub as primary path |
| Hardcoded Hostinger CORS/API | Broken sidecar | Env-driven CORS and API URL before go-live |
| Leaked credentials in `deployment/hstng.yml` | Security incident | Rotate; scrub; secret store |
| iframe WebRTC issues | Broken studio | Prefer new tab |
| Identity mismatch on handoff | Wrong tenant data | Explicit mapping table; least privilege |
| Plan/billing still in WP | Pricing confusion | Decide: keep WP plans or ignore for IMP-licensed seats |
| Monorepo accidental import of WP into IMP Vite | Bundle bloat / merge by stealth | ESLint/boundary: `services/webinar` not in IMP `src` imports |
| IMP has no backend today | Bridge deferred | Phase 1 needs none; Phase 3 needs BFF or WP bridge route |
| Large media on shared small host | Outages | Separate disk/CDN for recordings |

### Technical decisions (locked for this plan)

1. **Sidecar only** — no full merge, no FE port of WP into `src/modules/webinar`.  
2. **WP remains SoR** for webinars, streaming, chat, access codes.  
3. **IMP remains SoR** for platform login (mock→future), workspace, module entitlements.  
4. **Phase 1 open mode:** new tab.  
5. **Auth:** independent → JWT/code handoff → SSO.  

---

## 12. Clear recommendation: why sidecar wins

### Compared to full merge

| Full merge | Sidecar |
|------------|---------|
| Forces React 19/JS module patterns onto React 18/TS app | Each app keeps its stack |
| Couples streaming/WebRTC to IMP shell releases | WP deploys independently |
| Collides auth models (`imp` vs `admin`/`client`) | Bridge later, deliberately |
| High regression risk on M102.54 production behavior | Preserves battle-tested product |

### Compared to frontend port (IMP UI + external API only)

| FE port | Sidecar |
|---------|---------|
| Reimplements dozens of WP pages/hooks in JSX | Ships existing WP FE as-is |
| Easy to “lightly rewrite” until studio breaks | No rewrite mandate |
| Still needs WP BE + MySQL | Same infra, less FE risk |
| Duplicates Tailwind/Zustand stack inside IMP | Clear product boundary |

### Compared to rewriting

| Rewrite | Sidecar |
|---------|---------|
| Recreates streaming, chat, leads, studio from stub | Uses mature product |
| Months of risk for parity | Days/weeks to launcher + deploy |
| Throws away client’s Lite-running investment | Honors it |

### Bottom line

**IMP = platform shell and entitlements. WebinarPro = webinar product sidecar.**  
Integrate at the edges (URLs, config, later auth bridge and data sync). Preserve WebinarPro business logic and treat it as the system of record for live webinars.

---

## Appendix A — Inventory anchors

**IMP webinar stub**

- `src/modules/registry.js`  
- `src/modules/webinar/**`  
- `src/routes/AppRoutes.jsx`  
- `src/auth/AuthContext.jsx`  
- `src/workspace/WorkspaceContext.jsx`  

**WebinarPro**

- `services/webinar/README.md` (M102.54)  
- `services/webinar/frontend/`  
- `services/webinar/backend/`  
- `services/webinar/database/webinar.sql`  
- `services/webinar/deployment/server.js`  
- See also: `docs/WEBINAR_SERVICE_STRUCTURE.md`  

## Appendix B — Implementation boundary (reminders for later tasks)

When implementation starts:

- Touch IMP launcher/config under `src/modules/webinar` and env docs.  
- Change WebinarPro **only** for deploy config (CORS, env, optional bridge endpoint) — not feature rewrites.  
- Do not copy WP components into IMP.  
- Do not delete `services/webinar` business logic in favor of seed data.

---

*End of plan.*
