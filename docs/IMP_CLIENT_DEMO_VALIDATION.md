# IMP Platform — Client Demo Validation Report

**Document type:** Prototype delivery / client demo validation  
**Product:** IMP Platform (CRM IMP)  
**Scope:** Front-end prototype with simulated operational workflows  
**Date:** 2026-07-31  
**Status:** Ready for client demonstration  

---

## 1. Platform overview

The IMP Platform prototype is a single-page application (React + Vite + React Router) that simulates the future commercial operating system before backend development.

It preserves real product behavior at the UX and workflow level:

- Authentication and role-based entry points
- Multi-client workspace access model
- Module launcher and in-platform navigation
- Six operational modules with mock-driven simulations
- Admin console for customers, users, modules, and permissions

### Architecture (current)

| Layer | Responsibility |
|-------|----------------|
| `auth/` | Login, session (`sessionStorage`), role home redirects |
| `workspace/` | Customer + user context and effective module access |
| `routes/` | Protected routes, module access gates |
| `layouts/` | Launcher, Dialer (BDR), Module Workspace, Admin |
| `modules/` | Domain packages (`bdr`, `training-ai`, `prospecting`, `radar`, `webinar`, `vsl`) |
| `data/admin` + `data/access` | Mock multi-tenant catalog and access resolution |
| `pages/admin` | Admin operational UI |

### Design principles honored

Aligned with `docs/client-requirements.md`:

1. **Simulate real operation** — not static placeholders  
2. **Preserve visual identity** — CRM IMP graphite + amber  
3. **Stay inside the platform** — module-to-module navigation without leaving IMP  
4. **Represent future product behavior** before APIs exist  

### Demo credentials

| Login | Password | Role | Lands on |
|-------|----------|------|----------|
| `bdr` | `bdr` | IMP operator (full demo modules) | `/dashboard` |
| `sdr` | `sdr` | IMP operator (limited modules) | `/dashboard` |
| `admin` | `admin` | Platform admin | `/admin` |
| `imp` | `imp` | Alias of BDR workspace user | `/dashboard` |

---

## 2. Completed modules

All six product modules are registered as **`available`** and expose functional prototype workflows with mock data.

| # | Module | ID | Path | Prototype depth |
|---|--------|----|------|-----------------|
| 1 | Discagem Automática (BDR) | `bdr` | `/modules/bdr` | Full operational dialer simulation |
| 2 | Treinamento IA | `training-ai` | `/modules/training-ai` | Catalog → simulation → evaluation |
| 3 | Prospecção | `prospecting` | `/modules/prospecting` | Search → qualify → send to BDR |
| 4 | Radar de Tendências | `radar` | `/modules/radar` | Dashboard → analysis → insight |
| 5 | Webinar | `webinar` | `/modules/webinar` | Events → participants → metrics |
| 6 | VSL | `vsl` | `/modules/vsl` | Campaigns → landing config → conversion metrics |

### Shared platform capabilities

- Central module registry (`src/modules/registry.js`)
- Module launcher cards on `/dashboard` (only assigned + accessible modules)
- `ModuleAccessRoute` gate per module
- Module-scoped permission catalogs merged into admin permissions
- Consistent CRM IMP chrome (launcher / dialer / module workspace)

---

## 3. User workflow

### 3.1 Recommended client demo path (operator)

Use **`bdr` / `bdr`** (Bruno Lima @ Acelere Seu Crescimento — all six modules).

1. **Login** → Module Launcher (`/dashboard`)  
2. **Treinamento IA** — pick a scenario, complete the AI simulation, review score report  
3. **Prospecção** — search companies, qualify a prospect, send batch to BDR  
4. **BDR (Discagem Automática)** — set operator status, open automatic/manual dial, disposition, optional schedule, history  
5. **Radar** — review trend dashboard, run market analysis, open an insight  
6. **Webinar** — open an event, mark attendance, inspect metrics  
7. **VSL** — configure a landing/CTA, review conversion funnel  
8. Return to **Módulos IMP** from any module shell and switch freely  

### 3.2 Cross-module handoff stories (demo narrative)

| Story | Path |
|-------|------|
| Enablement → execution | Treinamento IA → BDR |
| Pipeline build → dialer | Prospecção → Enviar ao BDR → BDR |
| Intelligence → action | Radar insight → Prospecção / BDR |
| Event → outbound | Webinar metrics → Prospecção / BDR |
| Content → pipeline | VSL metrics → Prospecção |

### 3.3 Limited-user contrast (optional)

Use **`sdr` / `sdr`** (Felipe @ NovaRota) to show **permission-aware launcher**: only Treinamento IA and Prospecção appear; other modules remain inaccessible via route gate.

---

## 4. Admin workflow

Use **`admin` / `admin`**.

| Area | Path | Demo value |
|------|------|------------|
| Admin home | `/admin` | Platform overview |
| Customers | `/admin/customers` | Multi-client accounts, plans, module enablement |
| Users | `/admin/users` | Users linked to customers and module grants |
| Modules | `/admin/modules` | Customer ↔ module assignment matrix |
| Permissions | `/admin/permissions` | Permission catalog (admin + module keys) |
| Logs | `/admin/logs` | Audit trail simulation |

### Admin validation script

1. Login as admin  
2. Open **Customers** — show Acelere (Enterprise) vs NovaRota / Orbit / Pulse  
3. Open **Modules** — show which products each customer can use  
4. Open **Users** — show Bruno (full set) vs Felipe (subset) vs Carla (training only)  
5. Open **Permissions** — show platform keys + BDR / Training / Prospecting / Radar / Webinar / VSL keys  
6. Logout → login as `bdr` and `sdr` to prove effective access = **customer ∩ user**  

---

## 5. Permission model

Access is resolved in two layers.

### 5.1 Platform module access

```
effectiveModules = intersection(customer.modulesEnabled, user.assignedModules)
```

- Enforced by `ModuleAccessRoute` + `useWorkspace().hasModuleAccess(moduleId)`  
- Denied users see the access-denied experience instead of the module  
- Launcher only lists modules in the effective set  

### 5.2 Module-scoped permissions (prototype)

Each module defines a permission catalog. In the prototype, a user with module access typically receives the full operate set for that module (same pattern as BDR).

| Module | Example keys |
|--------|----------------|
| BDR | `bdr.operate`, `bdr.campaigns.select`, `bdr.history.*`, `bdr.schedule`, `bdr.scripts.view` |
| Treinamento IA | `training.view`, `training.simulate`, `training.report` |
| Prospecção | `prospecting.search`, `prospecting.qualify`, `prospecting.send_bdr` (+ legacy `prospecting.use`) |
| Radar | `radar.dashboard`, `radar.analyze`, `radar.insights` |
| Webinar | `webinar.manage`, `webinar.participants`, `webinar.metrics` |
| VSL | `vsl.campaigns`, `vsl.configure`, `vsl.metrics` |

Admin role permissions cover customer/user/module/log management only (no operator module UI).

### 5.3 What is simulated vs future RBAC

| Today (prototype) | Next phase |
|-------------------|------------|
| In-memory / seed grants | API-backed assignments |
| Session in `sessionStorage` | JWT / SSO session |
| Module-level grant ≈ full fine-grained set | Per-key RBAC enforced server-side |
| Admin matrices editable in mock store | Persisted admin APIs |

---

## 6. Module-by-module prototype status

### 6.1 Discagem Automática (BDR) — complete

**Status:** Functionally complete operational prototype  

**Workflow:** Painel (metrics, operator status, campaigns, quick actions) → Discagem automática / Manual → qualification, script, objections, disposition → optional scheduling → Histórico / Agendamentos  

**UI shell:** Dedicated DialerLayout (CRM IMP GROUP sidebar)  

**Notes:** Deepest simulation; call/operator state machines; mock repository hydration  

---

### 6.2 Treinamento IA — complete (prototype)

**Status:** End-to-end training simulation  

**Workflow:** Catalog selection → multi-turn AI simulation (option-based dialogue) → evaluation report (score, dimensions, coach notes)  

**UI shell:** ModuleWorkspaceLayout  

**Demo tip:** Complete one scenario fully so the report and session history appear  

---

### 6.3 Prospecção — complete (prototype)

**Status:** Search + qualify + BDR handoff  

**Workflow:** Company search/filter → qualify with ICP criteria → queue → send to BDR (mock batch) → optional open discador  

**UI shell:** ModuleWorkspaceLayout  

**Demo tip:** Qualify 1–2 companies, send lote, then open BDR to narrate handoff  

---

### 6.4 Radar de Tendências — complete (prototype)

**Status:** Intelligence dashboard + analysis + insight detail  

**Workflow:** Trend dashboard → run segment market analysis → open insight with recommendations  

**UI shell:** ModuleWorkspaceLayout  

**Demo tip:** Run analysis on SaaS/Logística and open insight “SDRs priorizam listas com sinal de hiring”  

---

### 6.5 Webinar — complete (prototype)

**Status:** Event ops + attendance + metrics  

**Workflow:** Event list (publish draft) → participant attendance controls → attendance/engagement metrics → links to Prospecção/BDR  

**UI shell:** ModuleWorkspaceLayout  

**Demo tip:** Use completed event “Radar comercial…” for metrics; mark presence on scheduled event  

---

### 6.6 VSL — complete (prototype)

**Status:** Campaign + landing configuration + conversion funnel  

**Workflow:** Campaign list → edit headline/CTA/placement + preview → publish draft → conversion metrics funnel  

**UI shell:** ModuleWorkspaceLayout  

**Demo tip:** Edit landing copy live, save, show preview, then open métricas  

---

## 7. Known prototype limitations

This build is intentionally a **pre-backend product simulation**.

### Explicit non-goals / gaps

| Limitation | Detail |
|------------|--------|
| **Mock data only** | Seeds, in-memory session state, no durable persistence across browsers/devices |
| **No production backend** | No REST/GraphQL APIs, databases, or multi-instance sync |
| **No real AI services** | Training “IA” uses scripted turns and scoring heuristics |
| **No real telephony** | BDR does not place PSTN/SIP/WebRTC calls |
| **No external integrations** | No CRM sync, calendar providers, email/SMS, ad platforms, webinar vendors, or CDN video hosting |
| **Auth is demo-grade** | Hardcoded credentials; session in `sessionStorage` |
| **RBAC is illustrative** | Fine-grained keys exist and gate UI affordances; not enforced by a policy engine/API |
| **Admin mutations are local** | Assignment changes affect the running mock store, not a real tenant database |
| **Media is simulated** | VSL player/preview and webinar “live” states are UI simulations |
| **Not production-hardened** | No observability stack, rate limits, encryption standards, or compliance controls for go-live |

### What *is* validated despite limitations

- Navigation and information architecture  
- Module boundaries and access control story  
- Commercial workflows and handoffs  
- CRM IMP visual identity continuity  
- Admin multi-client mental model  
- Readiness for API substitution behind existing service seams  

---

## 8. Recommended next development phase

### Phase A — Foundation APIs (priority)

1. Auth service (login, refresh, roles, workspace claims)  
2. Tenant APIs: customers, users, module assignments  
3. Permission service with server-side enforcement  
4. Replace mock repositories module-by-module without redesigning UI shells  

### Phase B — Core revenue modules

1. **BDR** — telephony provider, call events, dispositions, scheduling sync  
2. **Prospecção** — company/contact data source, qualification persistence, queue to BDR  
3. **Treinamento IA** — real LLM/scenario engine + evaluation persistence  

### Phase C — Growth modules

1. **Webinar** — event vendor or first-party streaming, attendance webhooks  
2. **VSL** — hosted video, landing publish, attribution events  
3. **Radar** — data pipelines / signal providers, alert delivery  

### Phase D — Product hardening

1. Audit logs (real), SSO, environment configs  
2. Observability, QA automation, performance budgets  
3. Gradual rollout per customer plan  

### Suggested sequencing for engineering

```
Auth + Access APIs
    → BDR persistence + telephony adapter
    → Prospecção + BDR queue contract
    → Treinamento IA provider
    → Webinar / VSL / Radar integrations
```

---

## Appendix A — Visual identity checklist

| Element | Expected |
|---------|----------|
| Background | Graphite `#111827` |
| Surfaces | `#1f2937` |
| Brand accent | Amber `#f59e0b` |
| Typography | Space Grotesk (display) + Inter |
| Shells | Launcher bar, Dialer CRM sidebar, Module workspace, Admin layout |
| Rule | Do not redesign; extend existing CRM IMP language |

---

## Appendix B — Demo credentials quick card

```
Operator (full):  bdr / bdr
Operator (limited): sdr / sdr
Admin:            admin / admin
```

---

## Appendix C — Acceptance for client demo

| Criterion | Result |
|-----------|--------|
| Six modules available in launcher (for full demo user) | Pass |
| Workflows are interactive (not placeholder-only) | Pass |
| Navigation stays inside IMP | Pass |
| Visual identity preserved | Pass |
| Module permissions demonstrable (bdr vs sdr) | Pass |
| Admin multi-client story demonstrable | Pass |
| Limitations disclosed (mock / no backend / no real AI or telephony) | Documented above |

**Verdict:** The IMP Platform prototype is suitable for **client demo validation** of product behavior, UX, and module strategy prior to backend implementation.
