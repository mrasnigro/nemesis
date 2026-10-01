# Webinar ↔ IMP — Full Integration Roadmap

**Audience:** product + eng  
**Updated:** 7 Aug 2026  
**Customer bar (locked):** Webinars must be **fully integrated into IMP** — not a separate product opened in another tab.

**Engineering decision (locked for this roadmap):** **Code merge** — fold the Webinar **frontend** into the IMP Vite app (`src/modules/webinar`), under IMP chrome, routes, and auth. Webinar **backend + MySQL + streaming** stay in `services/webinar/` as an API/media service until a later backend consolidation (out of scope for FE merge).

---

## 0. Why this supersedes the sidecar-only plan

Earlier recommendation was: keep Webinar FE independent + SSO handoff (product-dependent, service-independent). That still works as an interim.

The customer bar is higher: **one UI inside IMP**. Phase C SSO (already shipped) becomes a **bridge**, then is retired once the FE lives in IMP.

| Approach | Status |
|----------|--------|
| New-tab launcher only | Obsolete as end state |
| SSO handoff to separate FE (C1/C2) | **Done** — interim / fallback |
| Iframe under IMP chrome | Optional safety mid-step (M0) |
| **FE code merge into IMP** | **Target** (this doc) |
| Merge Webinar BE into IMP Node | Deferred (keep API service) |

---

## 1. North star (fully integrated)

```text
IMP shell (auth, workspace, nav, modules)
    └── /modules/webinar/*   ← Webinar React routes (merged)
            │
            │  same-origin API calls / proxy
            ▼
services/webinar/backend   ← rooms, streaming, chat, leads (MySQL)
```

**User experience**

1. Login once in IMP.  
2. Open **Webinar** from IMP nav — same chrome, no second app/login.  
3. From BDR (or schedule), start **reunião 1:1** → Webinar studio/live **inside IMP**.  
4. Leave room → stay in IMP journey (notes, next task).

---

## 2. Reality check (risks to plan for)

| Risk | Detail |
|------|--------|
| React versions | Webinar FE ~React 18; IMP ~React 19 — upgrade Webinar code during merge or dual-compat carefully |
| Styling | Webinar uses Tailwind; IMP uses module CSS / design tokens — decide: Tailwind scoped to webinar routes **or** restyle to IMP tokens over time |
| State/auth | Webinar Zustand + JWT vs IMP `AuthContext` / session — map IMP user → Webinar API tokens (reuse handoff exchange **in-process**, no new tab) |
| Routing | Nested routers under `/modules/webinar/*`; strip Webinar marketing landing or redirect to IMP |
| Build size | HLS, studio, admin — code-split; lazy-load studio/live |
| Env | Replace `REACT_APP_*` with `VITE_WEBINAR_API_URL`; never put long-lived secrets in Vite |
| Scope creep | Do **not** merge MySQL schema into IMP in the same epic |

---

## 3. Phased roadmap (merge)

### Phase M0 — Optional embed spike (1–2 days)

Iframe Webinar FE at `/modules/webinar/app` with postMessage / handoff.

- **Purpose:** prove “inside IMP chrome” UX quickly while merge is underway.  
- **Exit:** customer can see chrome continuity; dispose iframe when M2 lands.

*Skip if team prefers going straight to M1.*

---

### Phase M1 — Merge foundation (scaffold)

1. Inventory Webinar FE routes (client, admin, studio, live, public access).  
2. Add IMP deps needed for webinar package (axios, zustand, hls.js, lucide; Tailwind **only if** keeping Webinar CSS — prefer scoped).  
3. Create mount: `src/modules/webinar/app/` (ported tree) + thin adapter (`WebinarAuthBridge`, `apiClient`).  
4. Proxy or `VITE_WEBINAR_API_URL` → `services/webinar` backend (`/api`).  
5. Replace “open new tab” home with in-app router entry (keep launcher as **fallback** behind flag for one release).

**Exit:** `/modules/webinar` renders **something** from ported tree (e.g. client dashboard stub) inside IMP layout, authenticated via bridge.

---

### Phase M2 — Auth bridge (retire new-tab SSO as primary)

1. On entering Webinar module: if IMP user present → call existing `POST /api/auth/imp-handoff/register` + `exchange` **from IMP origin** (or a dedicated `POST /api/auth/imp-session` later).  
2. Store Webinar access/refresh in memory (or sessionStorage) for API client — not as second “product login”.  
3. Remove Webinar `/login` as required path for IMP users (keep only for public lead links if needed).  
4. Map roles: IMP `admin` → webinar admin; IMP `imp`/BDR → webinar client/host as product decides.

**Exit:** no second login; C2 new-tab flow becomes optional fallback only.

---

### Phase M3 — Port feature surfaces (ordered)

Ship in this order to reduce blast radius:

| Step | Surface | Notes |
|------|---------|--------|
| M3a | Client dashboard + webinar list/detail | CRUD via existing API |
| M3b | Live viewer / public access codes | Keep public routes if required |
| M3c | Studio / host room (WebRTC/HLS) | Highest risk — isolate lazy chunk |
| M3d | Admin (users/plans/webinars) | Gate with IMP admin + webinar.manage |
| M3e | Leads / subscription screens | Only if still required in IMP product |

Strip or hide Webinar marketing landing (`/`) inside IMP — replace with IMP module home.

---

### Phase M4 — Journey glue (“engrenagem”)

1. BDR agenda / contact: **Iniciar reunião 1:1** → navigate to `/modules/webinar/...` with `externalRef`, contact, title.  
2. Create or select room via API with IMP context.  
3. After meeting: land on IMP BDR/Webinar history with status stub.  
4. Permissions: existing `webinar.*` keys gate routes.

**Exit:** customer demo — BDR → room inside IMP → back to BDR.

---

### Phase M5 — Cleanup & hardening

1. Delete or deprecate new-tab launcher + `ImpHandoffBootstrap` on separate FE (or keep sidecar FE only for standalone deploy).  
2. Document single-app local: IMP Vite + Webinar API only (no `:3000` Webinar FE required for IMP users).  
3. Bundle analysis, route-level code splitting, error boundaries around studio.  
4. Align registry copy: Webinar is no longer “sidecar UI”.

---

## 4. Suggested backlog order

| # | Item | Depends on |
|---|------|------------|
| M0 | (Optional) iframe spike | — |
| M1 | Scaffold `src/modules/webinar/app` + API proxy | — |
| M2 | In-app auth bridge (reuse handoff APIs) | M1, C1 |
| M3a–c | Client + live + studio port | M2 |
| M4 | BDR 1:1 CTA + return path | M3c |
| M3d–e | Admin / extras | M2 |
| M5 | Remove new-tab primary path | M4 |

**Phase C progress is not wasted** — register/exchange endpoints power M2.

---

## 5. Definition of done (customer-facing)

A seller can:

1. Log into **IMP only**.  
2. Use Webinar **inside IMP navigation** (no separate Webinar site for core flows).  
3. Start a **1:1** from BDR/schedule into a live/studio view still in IMP.  
4. Return to IMP context after the meeting.

Backend/streaming may still run as `services/webinar` — that is acceptable for “fully integrated **product**.”

---

## 6. Explicit non-goals (same epic)

- Rewriting streaming/WebRTC from scratch.  
- Merging Webinar MySQL into an IMP database.  
- Keeping dual primary UIs forever (sidecar FE + merged FE).  
- Put production secrets in `VITE_*`.

---

## 7. Implementation progress

| When | Step | Status |
|------|------|--------|
| 7 ago 2026 | Sidecar SSO plan + C1/C2 handoff | Done (interim) |
| 7 ago 2026 | **Customer bar → full FE merge**; roadmap rewritten | Done (this doc) |
| 7 ago 2026 | **M1** Vite `/webinar-api` proxy; in-app auth bridge; overview + painel routes; sidecar fallback | Done |
| 7 ago 2026 | **M2** Harden bridge (validate `/auth/me`, 401 retry, freshness); Painel = default home; getMe + authMiddleware | Done |
| 7 ago 2026 | **M3a** In-IMP webinar list + detail + create draft (`/webinars`, normalize DTO) | Done |
| 7 ago 2026 | **M4** BDR Agendamentos → “Iniciar/Abrir reunião 1:1” → Webinar in-app create/open + return | Done |
| 7 ago 2026 | **M3c-lite** Detail → Studio/Live deep-link sidecar w/ SSO; handoff keeps deep path | Done |
| 7 ago 2026 | **M5** Sidecar removed from primary nav; registry/copy mark IMP as product surface; legacy page emergency-only | Done |
| — | M3c-full Studio room UI inside IMP | Optional backlog |

### Product stance after M5

- **Primary:** `/modules/webinar` (painel, lista, 1:1 BDR, detalhe + Studio/Live deep-link).  
- **Backend:** still `services/webinar`.  
- **Legacy FE tab:** `/modules/webinar/sidecar` only from Integração (not main nav).  
- **Customer “fully integrated” bar:** met for journeys; full Studio React port remains optional.

### How to demo M1 locally

1. Webinar **API** on `:3001` with `IMP_HANDOFF_SHARED_KEY=imp-dev-handoff-key` (FE `:3000` optional).  
2. IMP `npm run dev` — restart once so Vite picks up the `/webinar-api` proxy.  
3. Login IMP → **Webinar** → see bridge status → **Painel**.  
4. Sidecar tab remains under **Abrir sidecar**.

---

## 8. Immediate next action

1. Stakeholder confirm: **FE merge yes**, backend stays service (recommended).  
2. Eng starts **M1 scaffold** (or M0 iframe if a visible “inside IMP” demo is needed this week).  
3. Track React 19 + Tailwind decision in M1 spike notes before mass file move.

Related code today:

- IMP launcher / handoff: `src/modules/webinar/`  
- Webinar FE source to merge: `services/webinar/frontend/src/`  
- Webinar API: `services/webinar/backend/`  
- Completed handoff: `POST /api/auth/imp-handoff/*`
