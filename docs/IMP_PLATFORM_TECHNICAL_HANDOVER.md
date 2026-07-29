# IMP Platform — Technical Handover Report

**Document type:** Project handover / client delivery  
**Product:** IMP Platform (CRM IMP)  
**Repository:** `https://github.com/VikramSathguru/imp-ai-platform.git`  
**Branch reviewed:** `dev` (`9e4d120`)  
**Report date:** 25 July 2026  
**Scope:** Current frontend prototype as implemented in the codebase  

---

## 1. Project Overview

### What the IMP Platform is

The IMP Platform is a **modular, multi-tenant React application** designed as a central workspace for AI-powered commercial operations. It is positioned as a SaaS-ready shell that unifies several business modules under a single login experience, with role-based access and per-customer module licensing.

Branding in the UI presents the product as **CRM IMP — Sistema de Gestão de Leads**.

### Current prototype objective

Deliver a **client-demonstrable frontend prototype** that shows:

1. Login and role-based navigation (Admin vs IMP user)
2. Multi-customer (tenant) administration
3. Module assignment at customer and user levels
4. Effective access control in the workspace
5. A working path into the **existing external BDR / Discagem Automática** system
6. Placeholder surfaces for future modules (Treinamento IA, Prospecção, Radar, Webinar, VSL)

### What has been completed

| Area | Completed |
|------|-----------|
| React + Vite application shell | Yes |
| Login UI aligned with CRM IMP branding | Yes |
| Mock authentication with session persistence | Yes |
| Role-based routing (admin / imp) | Yes |
| IMP workspace dashboard with customer metrics | Yes |
| Sidebar navigation filtered by module access | Yes |
| Admin panel (dashboard, customers, users, modules, permissions, integrations, logs) | Yes |
| In-memory admin store (create customer/user, assign modules) | Yes |
| Customer ∩ User module access resolution | Yes |
| Module registry (6 modules) | Yes |
| BDR module page with external system launch | Yes |
| Coming-soon module pages (shared template) | Yes |
| Demo onboarding workflow in Admin Dashboard | Yes |

### What is not implemented yet

| Area | Status |
|------|--------|
| Real backend / REST API | Not started |
| Database persistence | Not started |
| Production authentication (JWT/OAuth/SSO) | Not started |
| Real telephony / dialer engine inside IMP | Not started (external BDR only) |
| Functional Treinamento IA / Prospecção / Radar / Webinar / VSL | Placeholders only |
| SSO or token handoff into BDR | Not started |
| Environment-based secrets / CI-CD production pipeline | Not started |
| Automated tests | Not started |
| README product documentation (still mostly Vite template) | Incomplete |

---

## 2. Current Development Status

### Overall completion percentage estimate

| Lens | Estimate | Notes |
|------|----------|-------|
| **Prototype / client demo** | **~70%** | Core demo flows work end-to-end in the browser |
| **Frontend product shell** | **~80%** | Structure, routing, admin UX, access model are solid |
| **Module business features** | **~15%** | Only BDR launch path is operational; others are stubs |
| **Production readiness** | **~10%** | No backend, DB, real auth, or hardened deployment |

**Recommended headline for client conversations:** prototype is ~70% complete for demonstration purposes; production delivery is a separate roadmap.

### Completed phases

1. **Foundation** — React 19 + Vite 8 + React Router 7 app bootstrap  
2. **Auth & roles** — Mock login, sessionStorage session, protected routes  
3. **Module registry** — Central catalog driving dashboard cards and routes  
4. **Admin structure** — Customers, users, modules, permissions, integrations, logs  
5. **Access control** — Customer module envelope ∩ user grants = effective access  
6. **Demo polish** — Admin onboarding flow, customer metrics, CRM IMP login UI, sidebar nav  

### In-progress items

- Prototype UX refinements (login branding, sidebar module links)
- Demo data storytelling (metrics, logs, integrations catalog)
- External BDR entry UX (connected status presentation; still link-based)

### Pending future phases

- Backend API + database
- Real authentication and authorization
- Deep BDR integration (SSO / embed / API sync)
- AI Training and remaining module implementations
- Production hosting, monitoring, and security hardening

### Feature status table

| Feature | Status | Description |
|---------|--------|-------------|
| Login / logout | **Complete (mock)** | Hardcoded credentials; session in `sessionStorage` |
| Admin dashboard | **Complete (demo)** | Metrics, workflow steps, recent activity |
| Customer management | **Complete (in-memory)** | Create customers; list; view modules |
| User management | **Complete (in-memory)** | Create users linked to customers; assign modules |
| Module assignment matrix | **Complete (in-memory)** | Toggle modules per customer and per user |
| Permissions catalog | **UI only** | Static permission list; not enforced at action level |
| Integrations page | **UI only** | Mock integration rows (BDR, WhatsApp, etc.) |
| Activity logs | **Partial** | In-memory logs written by admin store actions |
| IMP dashboard | **Complete (demo)** | Metrics + available modules from access layer |
| Access control (customer ∩ user) | **Complete (prototype)** | Enforced on module routes and dashboard listing |
| Treinamento IA | **Placeholder** | Coming-soon module page |
| Discagem Automática / BDR | **Available (external)** | Launch page + opens external BDR URL |
| Prospecção | **Placeholder** | Coming-soon module page |
| Radar de Tendências | **Placeholder** | Coming-soon module page |
| Webinar | **Placeholder** | Coming-soon module page |
| VSL | **Placeholder** | Coming-soon module page |
| Backend API | **Not started** | Mock async helpers only |
| Database | **Not started** | — |
| Real telephony | **Not started** | Relies on existing BDR system |

---

## 3. System Architecture

### High-level architecture

```
Browser
  └── React SPA (Vite)
        ├── AuthContext          → mock login / session
        ├── WorkspaceContext     → customer + effective modules
        ├── Admin in-memory store → customers / users / assignments
        ├── Module registry      → catalog metadata
        └── Routes
              ├── /login
              ├── /dashboard + /modules/*   (role: imp)
              └── /admin/*                 (role: admin)
                    └── BDR CTA → external URL (new tab)
```

There is **no server application** in this repository. All “API” functions are client-side mocks that mutate shared JavaScript arrays.

### Frontend stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Bundler / Dev server | Vite 8 |
| Routing | React Router DOM 7 |
| Language | JavaScript (JSX), no TypeScript in app source |
| Lint | Oxlint |
| Styling | Component-scoped CSS files |
| State | React Context + in-memory admin store (`useSyncExternalStore` pattern) |

### Folder structure (`src/`)

```
src/
├── auth/                 # Authentication context & mock users
├── components/           # Shared UI (Header, Sidebar, ModuleCard, admin widgets)
├── data/
│   ├── access/           # Effective module access resolution
│   └── admin/            # Mock customers, users, modules, logs, store
├── hooks/                # useAdminStore
├── layouts/              # DashboardLayout, AdminLayout
├── modules/              # Module registry (catalog)
├── pages/                # Route-level screens
│   ├── admin/
│   └── modules/
├── routes/               # AppRoutes, ProtectedRoute, ModuleAccessRoute
├── workspace/            # WorkspaceContext (tenant-aware session view)
├── App.jsx
├── main.jsx
└── index.css
```

### Folder responsibilities

| Path | Role |
|------|------|
| `src/components/` | Reusable UI: layout chrome, module cards, admin table/modal/matrix |
| `src/pages/` | Screen compositions bound to routes |
| `src/modules/` | Central module registry (`registry.js`) — single source of truth for module metadata |
| `src/routes/` | Route tree, auth guards, module-access guards |
| `src/layouts/` | Shell layouts for IMP workspace and Admin panel |
| `src/data/` | Mock datasets + in-memory store + access helpers |
| `src/hooks/` | React hooks over the admin store |
| `src/workspace/` | Resolves logged-in IMP user → customer → effective modules |
| `src/auth/` | Login/logout and role home paths |

### Main components

- **Layout / Header / Sidebar** — App chrome; sidebar adapts to admin vs IMP and filters module links by access  
- **ModuleCard / ModulePage / ModuleIcon** — Module presentation and coming-soon template  
- **MetricCard / Panel** — Dashboard and admin visual blocks  
- **Admin kit** — `DataTable`, `FormModal`, `AssignmentMatrix`, `StatGrid`, `StatusPill`, `SectionHeader`  
- **BdrPage** — Dedicated available-module experience with external launch CTA  

### Routing architecture

| Path | Guard | Audience |
|------|-------|----------|
| `/login` | Public | All |
| `/` and `*` | Redirect by auth/role | All |
| `/dashboard` | `ProtectedRoute` role `imp` | IMP users |
| `/modules/:module` | Role `imp` + `ModuleAccessRoute` | IMP users with grant |
| `/admin` and children | `ProtectedRoute` role `admin` | Platform admins |

Admin child routes: `customers`, `users`, `modules`, `permissions`, `integrations`, `logs`.

### State / context management

1. **`AuthContext`** — Authenticated user (`username`, `role`, `name`, `profile`); persisted in `sessionStorage` key `imp_user`.  
2. **`WorkspaceContext`** — For role `imp`, loads customer/user/modules via `fetchWorkspaceAccess`; refreshes when admin store emits changes.  
3. **Admin store (`data/admin/store.js`)** — Shared mutable mock arrays + subscriber notifications; powers create/assign flows.  

No Redux, Zustand, or server cache libraries are used.

---

## 4. Authentication Architecture

### Login flow

1. User opens `/login` and submits username/password.  
2. `AuthContext.login()` looks up a hardcoded `USERS` map.  
3. On success, user object is written to `sessionStorage` and React state.  
4. User is redirected by role:
   - `admin` → `/admin`
   - `imp` → `/dashboard`
5. Logout clears `sessionStorage` and resets state.

### User roles (auth layer)

| Role key | Home | Purpose |
|----------|------|---------|
| `admin` | `/admin` | Platform administration |
| `imp` | `/dashboard` | End-user workspace |

Login profiles `bdr` / `sdr` both map to role `imp`, with a `profile` field for demo labeling.

### Protected routes

- `ProtectedRoute` blocks unauthenticated users (redirect to `/login`).  
- Role mismatch redirects to that user’s home.  
- `ModuleAccessRoute` additionally checks **effective module access** for IMP users.

### Session handling

- **Mechanism:** `sessionStorage` (tab-scoped; cleared when browser session ends)  
- **Token:** None (no JWT)  
- **Refresh / expiry:** None  
- **Server validation:** None  

### Current mock credentials

| Username | Password | Role | Mapped workspace (demo) |
|----------|----------|------|-------------------------|
| `admin` | `admin` | admin | Admin panel (no customer workspace) |
| `bdr` | `bdr` | imp | User `usr_002` @ Customer `cus_001` (Acelere) |
| `sdr` | `sdr` | imp | User `usr_006` @ Customer `cus_002` (NovaRota) |
| `imp` | `imp` | imp | Alias of BDR mapping (`usr_002` / `cus_001`) |

> **Security note for delivery:** These credentials are intentional demo accounts and must **never** ship to production. Remove credential hints from the login UI before any public deploy.

### Future backend requirements

- Identity provider or credential store (hashed passwords / SSO)  
- Issued access + refresh tokens (or secure HTTP-only cookies)  
- Server-side role and tenant claims  
- Session revocation and password reset  
- Map auth identity → `userId` / `customerId` (replace `authWorkspaceMap`)  
- Audit of login events  

---

## 5. User Roles and Permissions

### Admin

**Available functions (prototype):**

- View platform overview metrics and demo workflow  
- **Customer management** — create customer, choose plan, select initial modules  
- **User management** — create users tied to a customer, assign module grants  
- **Module assignment** — matrix to enable/disable modules per customer; refine per user  
- **Permissions page** — browse permission catalog (display only)  
- **Integrations page** — browse mock integration statuses  
- **Logs page** — view activity produced by admin store mutations  

Admin routes are role-gated. Fine-grained permission keys exist in data (`customers.manage`, `users.manage`, etc.) but are **not enforced** on individual UI actions yet.

### IMP User

**Available functions (prototype):**

- Login to workspace dashboard  
- See customer-scoped metrics (mock)  
- See **only modules** in effective access set  
- Open module routes when granted  
- For BDR: open external Discagem Automática system  

**Access restrictions:**

- Cannot enter `/admin`  
- Cannot see modules outside effective access  
- Direct URL to unauthorized module shows Access Denied  

### Permission logic (core rule)

```
Effective access = Customer module access ∩ User module access
```

Implementation: `resolveEffectiveModuleIds(customerId, userId)` in `src/data/access/index.js`.

**Example:**

- Customer `cus_001` enabled: `bdr`, `prospecting`, `webinar`  
- User `usr_002` assigned: `bdr`, `prospecting`  
- **Effective:** `bdr`, `prospecting`  
- User cannot access `webinar` even though the customer owns it, until an admin assigns it to the user.  

If a customer loses a module, user grants for that module are trimmed automatically by `assignCustomerModules`.

---

## 6. Multi-Tenant / Customer Architecture

### Customer model (mock)

Key fields: `id`, `name`, `slug`, `plan`, `status`, `usersCount`, `modulesEnabled[]`, `createdAt`, `metrics{}`.

Seeded customers include Acelere Seu Crescimento, NovaRota Comercial, Orbit Leads, Pulse Digital — covering plans (Starter / Growth / Enterprise) and statuses (active / trial / suspended).

### User model (mock)

Key fields: `id`, `name`, `email`, `role`, `customerId`, `status`, `permissions[]`, `assignedModules[]`, `lastLoginAt`, optional `profile`.

Users always belong to exactly one `customerId` in the current model.

### Module assignment

Two layers:

1. **Customer envelope** — which products the company purchased / enabled  
2. **User grant** — which of those products the individual may use  

Admin UI writes both layers through the in-memory store; Workspace reads the intersection.

### How multiple companies are supported

- Data is keyed by `customerId`  
- Login maps username → `{ userId, customerId }`  
- Dashboard metrics and module list are scoped to that customer  
- Admin can create additional customers and users during the demo session (lost on full page reload / refresh of JS module state depending on hot reload; **not persisted across hard reloads of the app process**)

**Demo mapping examples:**

| Login | Company | Typical modules shown |
|-------|---------|------------------------|
| `bdr` / `imp` | Acelere Seu Crescimento | BDR + Prospecção |
| `sdr` | NovaRota Comercial | Treinamento IA + Prospecção |

---

## 7. Module Documentation

### Treinamento IA

| Item | Detail |
|------|--------|
| **Current status** | `coming-soon` placeholder |
| **Purpose** | AI-assisted commercial enablement: simulations, training paths, performance scoring |
| **Current implementation** | Route `/modules/training-ai` + `ModulePage` template with planned feature bullets |
| **Future development** | Scenario library, live feedback, profile-based trails, score history, LMS-like progress |

### Discagem Automática / BDR

| Item | Detail |
|------|--------|
| **Current status** | `available` |
| **Integration approach** | In-app BDR page + CTA opens external URL in a new tab (`window.open`) |
| **Default URL** | `https://acelereseucrescimento.com.br/` |
| **Config override** | `VITE_IMP_BDR_URL` (optional; no `.env` committed) |
| **Existing external system relationship** | Uses the already-running IMP/Acelere BDR product rather than reimplementing dialer logic |
| **Future development** | SSO handoff, embedded iframe/app shell, API sync of campaigns/leads, unified audit |

### Prospecção

| Item | Detail |
|------|--------|
| **Current status** | `coming-soon` placeholder |
| **Future purpose** | Lead/opportunity pipeline (kanban), qualification, follow-up SLA, conversion views |

### Radar de Tendências

| Item | Detail |
|------|--------|
| **Current status** | `coming-soon` placeholder |
| **Future purpose** | Market signal monitoring, competitive intelligence, commercial alerts |

### Webinar

| Item | Detail |
|------|--------|
| **Current status** | `coming-soon` placeholder |
| **Future purpose** | Schedule/manage live webinars, attendance, registration pages, post-event reports |

### VSL

| Item | Detail |
|------|--------|
| **Current status** | `coming-soon` placeholder |
| **Future purpose** | Video Sales Letter library, conversion pages, engagement tracking, A/B tests |

---

## 8. Existing BDR System Integration

### Relationship

The IMP Platform is the **orchestration / access layer**. The BDR dialing product remains a **separate existing system**. IMP decides *who* may open Discagem Automática; the BDR system performs telephony/campaign operations.

### Current integration method

1. Module registered as `available` with `externalUrl`  
2. User with effective access opens `/modules/bdr`  
3. CTA launches external site in a new browser tab  
4. Admin Integrations mock lists “IMP BDR System” as `connected` for customer `cus_001` (display only)

### Why it is external

- Avoids rebuilding a mature dialer inside the prototype  
- Enables immediate demo value (“platform + existing tool”)  
- Keeps telephony complexity and compliance outside this SPA  
- Allows independent release cycles for dialer vs platform shell  

### Future migration options

| Option | Description | Complexity |
|--------|-------------|------------|
| A. Keep external + SSO | Deep-link with signed token / SAML/OIDC | Medium |
| B. Embed | iframe or micro-frontend inside IMP shell | Medium–High |
| C. API façade | IMP backend proxies BDR APIs; UI rebuilt in IMP | High |
| D. Full migration | Reimplement dialer features natively in IMP | Very High |

**Recommendation:** Option A (SSO + deep link) as first production step; evaluate B/C after usage validates the unified UX.

---

## 9. Data Architecture

### Current

| Concern | Implementation |
|---------|----------------|
| Persistence | None (in-memory JS modules) |
| Auth users | Hardcoded map in `AuthContext` |
| Customers / users / assignments | Arrays in `src/data/admin/*` |
| Access resolution | Pure functions in `src/data/access` |
| “API” surface | Async functions returning local data (API-ready shapes documented in comments) |
| UI state | React local state + contexts |

### Future

| Concern | Target |
|---------|--------|
| Database | Relational (e.g. PostgreSQL) with tenants, users, roles, module grants |
| API layer | REST or GraphQL behind auth; replace mock `fetch*` / store mutations |
| Authentication backend | Auth service + secure session/JWT |
| Real user management | Invite flows, email verification, password policies |
| Audit | Append-only logs persisted server-side |
| Integrations | Real connectors with secrets stored server-side |

Suggested early API contracts (already hinted in code comments):

- `GET/PUT /customers/:id/modules`  
- `GET/PUT /users/:id/modules`  
- `GET /workspace/access`  

---

## 10. Future Development Roadmap

### Phase 1 — Prototype completion *(Priority: High)*

- Finalize demo scripts and seed data  
- Complete README for operators (not Vite template)  
- Remove or hide demo credentials before any shared hosting  
- Confirm BDR URL per environment  
- Optional: light E2E smoke checklist for client UAT  

### Phase 2 — Backend implementation *(Priority: High)*

- Design multi-tenant schema  
- Implement auth + RBAC  
- Persist customers, users, module assignments  
- Replace admin store and access mocks with API clients  

### Phase 3 — BDR real integration *(Priority: High)*

- SSO / secure handoff into existing BDR  
- Sync connection status and basic campaign metrics  
- Decide embed vs deep-link UX  

### Phase 4 — AI features *(Priority: Medium)*

- Build Treinamento IA MVP  
- Introduce AI assistance into Prospecção / Radar as data becomes available  

### Phase 5 — Production deployment *(Priority: Medium–High after Phases 2–3)*

- Hosting, CDN, TLS, domains  
- CI/CD, monitoring, backups  
- Security review, secrets management, GDPR/LGPD alignment  

---

## 11. Deployment Preparation

### Current local development environment

**Requirements:** Node.js (compatible with Vite 8), npm  

```bash
npm install
npm run dev      # local Vite server
npm run build    # production static build → dist/
npm run preview  # preview production build
npm run lint     # oxlint
```

No backend process is required. No committed `.env` file.

### Future deployment requirements

| Topic | Guidance |
|-------|----------|
| **Hosting** | Static hosting for SPA (Vercel, Netlify, S3+CloudFront, Azure Static Web Apps) **plus** separate API host when backend exists |
| **Environment variables** | `VITE_IMP_BDR_URL` for dialer target; later `VITE_API_BASE_URL`, auth client IDs, etc. |
| **Build process** | `npm run build` emits static assets in `dist/` |
| **Domain configuration** | Map app domain to SPA; configure API subdomain/CORS; align BDR redirect URIs for SSO |
| **Important** | Vite `VITE_*` variables are exposed to the browser — never put secrets there |

---

## 12. Known Limitations

1. **Mock authentication** — hardcoded passwords; credentials shown on login for demo  
2. **No database** — changes from admin demo do not survive a full application reload from disk in a durable way (in-memory only)  
3. **No real APIs** — all data is local JavaScript  
4. **No real telephony** — dialing happens only in the external BDR product  
5. **Static / mock metrics** — dashboard numbers are seeded, not live  
6. **Permissions UI not enforced** — catalog exists; action-level RBAC incomplete  
7. **Integrations are decorative** — statuses do not call external systems  
8. **No automated tests**  
9. **No TypeScript** in application source  
10. **README** still largely Vite boilerplate + short product blurb  
11. **No SSO into BDR** — new tab opens public/external URL only  
12. **Single-browser-session model** — `sessionStorage` only; no multi-device session management  

---

## 13. Recommended Next Steps

Practical sequence after client approval:

1. **UAT demo** — Walk admin create → assign modules → create user → login as IMP → open BDR  
2. **Freeze prototype scope** — Agree which modules are committed for MVP vs later  
3. **Backend kickoff** — Schema + auth + module grants API  
4. **Replace mocks** — Wire admin and workspace to APIs without redesigning UI contracts  
5. **BDR SSO** — Production-safe entry into existing dialer  
6. **First native module** — Likely Treinamento IA or Prospecção, based on commercial priority  
7. **Hardening & deploy** — Environments, monitoring, security review, go-live  

---

## 14. Git Information

| Item | Value |
|------|-------|
| **Current branch** | `dev` |
| **HEAD** | `9e4d120` — `feat(ui): align login with CRM IMP and module sidebar nav` |
| **Remote** | `origin` → `https://github.com/VikramSathguru/imp-ai-platform.git` |
| **Sync note** | Local `dev` was **ahead of `origin/dev` by 5 commits** at report time (push pending if desired) |
| **Working tree** | Clean (nothing to commit) at report time |

### Recent commits

```
9e4d120 feat(ui): align login with CRM IMP and module sidebar nav
7aaf9e1 fix(admin): cache store snapshot to prevent infinite re-renders
f91bf96 feat(demo): add admin onboarding flow and customer metrics
45f1595 feat(access): add customer-user module access control
d62c902 feat(admin): add customer and user management structure
82da60d initial commit
```

### Recommended final commit before delivery

If delivering this handover document and any last README cleanup together:

```
docs: add technical handover report for prototype client delivery
```

If only tagging the current UI freeze without docs:

```
chore: freeze IMP Platform prototype for client delivery
```

Optional: create an annotated tag such as `prototype-v0.1.0` on the delivery commit for easy rollback/reference.

---

## 15. Final Executive Summary

The IMP Platform prototype is a **React-based multi-tenant workspace** that demonstrates how IMP can centralize commercial modules under role-based access, while reusing the **existing Discagem Automática (BDR)** product as an external connected system.

What the client can validate today:

- Admin onboarding (customers, users, module assignment)  
- Tenant-aware IMP dashboards  
- Secure *within-prototype* access rules: **customer modules ∩ user modules**  
- One operational module path: **BDR launch into the current external system**  
- Clear placeholders for Treinamento IA, Prospecção, Radar, Webinar, and VSL  

What remains after approval is primarily **backend, real authentication, durable data, deeper BDR integration, and native module builds** — not a redesign of the platform concept. The frontend architecture is intentionally API-ready so those next phases can replace mock data without discarding the current UX structure.

**Prototype readiness for demo:** ~70%.  
**Production readiness:** early — pending Phases 2–5.

---

*End of technical handover report.*
