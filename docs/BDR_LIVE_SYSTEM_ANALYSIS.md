# BDR Live System Analysis

**Document type:** Production verification vs local compiled artifacts  
**Live URL:** https://acelereseucrescimento.com.br/  
**Credentials used:** `bdr` / `bdr`  
**Analysis date:** 31 July 2026  
**Method:** HTTP probe (browser UA), SHA-256 compare of live vs `.builds/last-source/frontend/dist`, Playwright Chrome crawl (login + route tour + auto-dial). **No application code changes.**

**Baselines cross-checked:**
- `docs/BDR_FUNCTIONAL_SPECIFICATION.md`
- `docs/BDR_VIDEO_BEHAVIOR_ANALYSIS.md`
- `docs/BDR_UI_REFERENCE.md`
- Local build: `.builds/last-source/` (`crm-imp-hostinger-v2`)

**Evidence folder:** `docs/screenshots/bdr/live-fetch/` (fetched assets, `live_crawl.json`, screenshots under `shots/`)

---

## 1. Executive verdict

The production site is the **same SPA build** documented from `.builds/last-source`: identical asset names `index-B7vd5ih_.js` / `index-BR17lsp1.css`, and **byte-identical file contents after normalizing CRLF→LF**.

Observed raw size/hash mismatches on disk are explained entirely by **Windows CRLF line endings in the local checkout** versus **LF on the server**. There is **no functional fork** between “production website” and the analyzed compiled bundle for JS/CSS/`index.html`.

Live operator workflow for BDR matches the functional specification and UI screenshots: login → dashboard → Em atendimento → Discagem Automática → short wait → **Falando** with a seed lead from pool `YN`.

---

## 2. Access & hosting facts

| Check | Result |
|-------|--------|
| Origin | `https://acelereseucrescimento.com.br/` |
| Bot gate | Cloudflare-style interstitial for some non-browser clients; **browser UA succeeds** |
| HTML title | `CRM IMP - Sistema de Gestão de Leads` |
| `theme-color` | `#f59e0b` |
| SPA shell | `#root` + Vite assets |
| `GET /health` | `200` `{"status":"ok","timestamp":…}` JSON |
| `GET /debug` | `200` HTML **CRM IMP - Debug Logs** |
| Client routes | All return same `index.html` SPA (including unknown paths) |

---

## 3. Actual navigation (verified live)

### 3.1 Auth navigation

| Step | Result |
|------|--------|
| Open `/` | Login: Usuário / Senha / **Entrar no Sistema**; test creds banner (BDR/SDR/Admin) |
| Submit `bdr` / `bdr` | Redirect to **`/dashboard`** |
| `localStorage.crm_user` | `{"id":"bdr","login":"bdr","role":"bdr","name":"BDR - Prospecção"}` |
| `localStorage.selectedCampaignId` | `"1"` (Campanha Padrão) |

Matches spec auth redirect: non-`sdr` roles → `/dashboard`.

### 3.2 Primary BDR path (operator workflow)

```text
/  → login
  → /dashboard
       → set status Em atendimento
       → Discagem Automática
            → /sdr-dialer?mode=automatic
                 → Aguardando ligação… (searching)
                 → Falando + lead card (connected) within ~3s
```

**Live confirmation (Playwright):** after Em atendimento + Discagem Automática, page showed **Falando (21) 3333-4444** (TECH SOLUTIONS BRASIL LTDA) with tabs Dados da Empresa / Script / Questionamentos / Diagnóstico and CTAs Agendar Reunião | Desligar.

### 3.3 Route tour (authenticated session)

All of the following **load without bouncing to login** when `crm_user` is set:

| Path | Live page purpose (from body text) |
|------|-------------------------------------|
| `/dashboard` | BDR panel: KPIs, status FSM, campaigns, quick actions |
| `/sdr-dashboard` | SDR “Painel de Controle” (WhatsApp-oriented metrics/activity) — **reachable even as role `bdr`** |
| `/sdr-dialer?mode=automatic` | Auto dial searching / connected workspace |
| `/sdr-dialer?mode=manual` | Manual form: phone + Telefone Fixo / WhatsApp + Iniciar Ligação |
| `/dialer` | Legacy **Discador - Prospecção Ativa** (different UI / opening script template) |
| `/campaigns` | **Selecionar Campanha** list (same three seed campaigns) |
| `/history` | Histórico de Chamadas + filters + table |
| `/scheduling` | Agendamentos calendar + Horários 9:00–18:00 / 30 min + confirmed list |
| `/scheduled-meetings` | Agendamentos Realizados calendar + “Selecione uma data…” empty pane |
| `/unknown-route-xyz` | Same SPA shell (client router decides) |

### 3.4 Quick-action → route mapping (dashboard)

| Control | Navigates to |
|---------|----------------|
| Discagem Automática | `/sdr-dialer?mode=automatic` |
| Ligação Manual | Manual entry on dialer (`mode=manual` / modal path) |
| Ver Histórico de Chamadas | `/history` |
| Agendamentos Realizados | `/scheduled-meetings` |
| Voltar (dialer) | Back toward prior / dashboard |
| Agendar Reunião | Scheduling surface (`/scheduling`) |
| Sair | Clears session → login |

---

## 4. Pages available (inventory)

### 4.1 Product pages (SPA)

| Page | Route | Role intent |
|------|-------|-------------|
| Login | `/` | Public |
| BDR Dashboard | `/dashboard` | BDR / admin / colab / treina landing |
| SDR Dashboard | `/sdr-dashboard` | SDR landing (also open if URL forced) |
| SDR Dialer auto/manual | `/sdr-dialer?mode=…` | Primary dial workspace |
| Legacy Dialer | `/dialer` | Alternate dialer still shipped |
| Campaigns | `/campaigns` | Campaign picker |
| Call History | `/history` | History + filters |
| Scheduling | `/scheduling` | Create / list confirmed meetings |
| Scheduled Meetings | `/scheduled-meetings` | Agenda by date |

### 4.2 Server pages / APIs (non-SPA)

| Endpoint | Type |
|----------|------|
| `/health` | JSON health |
| `/debug` | Debug logs HTML |
| `/assets/*` | Static JS/CSS |

**No domain REST** for leads/calls observed (SPA-only commercial logic) — consistent with functional spec.

### 4.3 Dialer tab pages (within `/sdr-dialer` connected)

1. Dados da Empresa  
2. Script de Abordagem  
3. Questionamentos Padrão  
4. Anotações de Diagnóstico  

---

## 5. User workflow (live BDR)

### 5.1 Happy path observed

1. Open production URL → login form.  
2. Enter `bdr` / `bdr` → **Entrar no Sistema**.  
3. Land **Desconectado** on dashboard; Campanha Padrão **Selecionada**; Discagem/Manual **disabled**.  
4. Click **Em atendimento** → timer starts; dial CTAs enable.  
5. Click **Discagem Automática** → `/sdr-dialer?mode=automatic`.  
6. Brief **Aguardando ligação…** then **Falando** with random seed company (TECH SOLUTIONS in this run).  
7. Work tabs / Agendar Reunião / Desligar / finalize loop (same as video + spec).

### 5.2 Parallel workflows available

- **Manual:** `/sdr-dialer?mode=manual` form (phone + channel).  
- **History / scheduling / meetings** from quick actions or direct URL.  
- **Campaigns** page for explicit campaign selection.  
- **SDR dashboard** via URL (seed WhatsApp inbox UX).  
- **Legacy `/dialer`** with classic opening script placeholders `[AGENTE]`, `[EMPRESA]`, etc.

### 5.3 Session / gating rules confirmed

| Rule | Live evidence |
|------|----------------|
| Dial CTAs off when Desconectado | Dashboard screenshot after login |
| Dial CTAs on after Em atendimento | Auto-dial navigation succeeded |
| Campaign id persisted | `selectedCampaignId = "1"` |
| Auth client-only | Routes load from `localStorage` session; no server login API |
| ~3s connect simulation | Searching → Falando by ~3s elapsed |

---

## 6. Production website vs compiled files

### 6.1 Asset identity

| Asset | Live | Local (`.builds/last-source/frontend/dist`) | After CRLF normalize |
|-------|------|-----------------------------------------------|----------------------|
| `index.html` | 12364 B | 12646 B (CRLF) | **Equal** |
| `assets/index-B7vd5ih_.js` | 639376 B | 639599 B (CRLF) | **Equal** |
| `assets/index-BR17lsp1.css` | 28374 B | 28375 B (CRLF) | **Equal** |

**Conclusion:** Production serves the **same compiled frontend** as the analyzed Hostinger build artifact. Differences in raw hashes are **line-ending only**, not code drift.

### 6.2 What is *not* different

- Same Vite hashed bundles (filenames unchanged).  
- Same inline diagnosis bridge + sales-thermometer styles in `index.html`.  
- Same routes, seed campaigns, seed leads, history filters, dialer chrome.  
- Same thin Express surface (`/health`, `/debug`, SPA fallback).

### 6.3 Environmental / delivery differences (not app-logic forks)

| Topic | Production | Local compiled tree |
|-------|------------|---------------------|
| Line endings | LF | CRLF (Windows checkout) |
| Edge / CDN | Cloudflare-like browser check | Files on disk only |
| Runtime | Hostinger Node 18 static host (per `hostinger-build.json`) | Source snapshot of that build |
| Absolute URL | `acelereseucrescimento.com.br` | Relative `/assets/…` in HTML |
| Live data | Still **seed / in-memory**; no backend CRM sync observed | Same |

### 6.4 Behavioral notes vs prior docs

| Topic | Live finding | Doc alignment |
|-------|--------------|---------------|
| Searching copy | **Aguardando ligação** | Matches UI reference / video; “Procura Automática” also exists in bundle strings |
| Connected copy | **Falando** + number | Matches UI/video |
| Manual via URL | Full-page manual form on `?mode=manual` | Spec mode query; modal still used in some entry paths (screenshots) |
| Role isolation | BDR session can open `/sdr-dashboard` by URL | Spec gates **post-login landing**, not hard route ACL |
| Legacy dialer | `/dialer` live and distinct | Spec lists alternate Dialer.tsx |
| Campaigns page | Dedicated `/campaigns` | Spec lists Campaigns.tsx |

---

## 7. Differences checklist (migration-relevant)

1. **No production-vs-compile feature delta** for the SPA payload — migrate against this single build.  
2. Treat **LF vs CRLF** as packaging noise when comparing hashes.  
3. Prefer live/UI strings **Aguardando ligação** / **Falando** for IMP copy.  
4. Expect **client-only auth**; forging `localStorage` grants routes (known demo limitation).  
5. `/sdr-dashboard` and `/dialer` remain in the shipped product surface area even for BDR demos.  
6. Cloudflare may block non-browser automation; human Chrome / Playwright with real Chrome works.

---

## 8. Traceability

| Claim | Evidence |
|-------|----------|
| Login → `/dashboard` | `live_crawl.json` nav + `shots/02-after-login.png` |
| Auto dial → Falando TECH SOLUTIONS | `shots/21-auto-dial.png` + crawl sample |
| Route inventory | Crawl pages[] + HTTP SPA probe |
| Asset equality | SHA-256 after CRLF normalize on fetched vs `.builds/…` |
| Health/debug | Fetched `live-health.json`, `live-debug.html` |

---

## 9. Migration takeaway

Use the **live site + `.builds/last-source`** as one as-is system. Functional, UI, and video docs describe this same build. IMP reconstruction should not invent a second “production-only” behavior layer unless new server APIs are explicitly introduced later.
