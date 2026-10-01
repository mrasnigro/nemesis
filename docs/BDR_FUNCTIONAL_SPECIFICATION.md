# BDR Automatic Dialing System — Functional Specification

**Document type:** Product-architecture functional analysis (as-is)  
**Product:** CRM IMP — Discagem Automática / BDR  
**Live URL:** `https://acelereseucrescimento.com.br/`  
**Artifact source:** Hostinger build `crm-imp-hostinger-v2`  
**Analysis date:** 31 July 2026  

**Sources analyzed (no code changes):**
| Source | Location / note |
|--------|-----------------|
| Compiled frontend | `.builds/last-source/frontend/dist/` (`index-B7vd5ih_.js`, `index-BR17lsp1.css`) |
| Backend | `.builds/last-source/backend/src/index.ts` + root `server.js` |
| Static objection repo | `.builds/last-source/fix_v106_work/frontend/dist/questionamentos.html` |
| Deploy metadata | `.builds/last-source/hostinger-build.json` |
| Related IMP docs | `docs/IMP_PLATFORM_TECHNICAL_HANDOVER.md`, `docs/BDR_FUNCTIONAL_PROTOTYPE_SPEC.md` |

**Note on provided materials:** Application URL and demo credentials are recoverable from the live bundle / AuthContext. No user-operation video file was present in this repository workspace at analysis time; behavior below is reverse-engineered from the compiled SPA and seed data.

**Scope of this document:** Describe the **existing BDR automatic dialing product** as implemented (client-side simulated telephony). This is an as-is functional map, not an IMP prototype implementation plan.

---

## 1. Application structure

### 1.1 High-level architecture

```
Browser (SPA)
  └── React UI (Vite-built bundle)
        ├── AuthContext          → localStorage session (`crm_user`)
        ├── Seed datasets        → campaigns, leads, history, scripts (in JS)
        ├── Pages                → dashboard, dialer, history, scheduling
        └── Client state machines → operator status + call session
              │
              ▼
Express static host (Node)
  ├── GET /health
  ├── GET /debug
  └── GET /*  → frontend/dist (SPA fallback)
```

There is **no domain API** for dialing, leads, CRM sync, or telephony. All commercial logic runs in the browser against hardcoded arrays. The backend only serves static assets and health/debug endpoints.

### 1.2 Frontend technology

| Layer | Technology (inferred from build) |
|-------|----------------------------------|
| UI framework | React (JSX / jsxDEV build) |
| Bundler | Vite (`crm-imp-hostinger-v2`) |
| Routing | Lightweight client router (wouter-style `path` / Switch / Redirect) |
| Styling | Tailwind-like utility classes + custom CSS (`graphite-*`, `teal-signal-*`) |
| Fonts | Google Fonts: Space Grotesk, Inter, JetBrains Mono |
| Icons | Lucide-style icon components |
| Language | TypeScript sources compiled to a single JS bundle |
| Persistence | `localStorage` only (`crm_user`, `selectedCampaignId`) |
| Telephony | **None** (simulated timers + random lead pick) |

**Branding:** “CRM IMP — Sistema de Gestão de Leads” (`theme-color: #f59e0b`).

### 1.3 Backend technology

| Item | Detail |
|------|--------|
| Runtime | Node.js 18.x (Hostinger config) |
| Framework | Express 4 + CORS |
| Language | TypeScript (`backend/src/index.ts`) compiled to JS; production also uses CommonJS `server.js` |
| Port | `PORT` env or `3000` / `3001` |
| Static root | `frontend/dist` |
| Business APIs | **None** |

### 1.4 Routes

| Path | Page (source file) | Role / purpose |
|------|--------------------|----------------|
| `/` | `Login.tsx` if logged out; redirect to `/dashboard` if logged in | Auth entry |
| `/dashboard` | `BDRDashboard.tsx` | BDR operator panel |
| `/sdr-dashboard` | `SDRDashboard.tsx` | SDR qualification panel |
| `/sdr-dialer` | `SDRDialer.tsx` | Auto/manual dial workspace (`?mode=automatic\|manual`) |
| `/dialer` | `Dialer.tsx` | Alternate / legacy dialer surface |
| `/campaigns` | `Campaigns.tsx` | Campaign list management UI |
| `/history` | `CallHistory.tsx` | Call history + filters |
| `/scheduling` | `Scheduling.tsx` | Create meeting (often opened in new tab) |
| `/scheduled-meetings` | `ScheduledMeetingsHistory.tsx` | Agenda / meetings list |

**Auth redirect rule:** login with role `sdr` → `/sdr-dashboard`; other successful logins → `/dashboard`.

### 1.5 Components / pages (compiled source map)

Original frontend paths embedded in the bundle:

```
frontend/src/
├── App.tsx
├── main.tsx
├── components/
│   └── CollapsibleSidebar.tsx
├── contexts/
│   └── AuthContext.tsx
└── pages/
    ├── Login.tsx
    ├── BDRDashboard.tsx
    ├── SDRDashboard.tsx
    ├── SDRDialer.tsx
    ├── Dialer.tsx
    ├── Campaigns.tsx
    ├── CallHistory.tsx
    ├── Scheduling.tsx
    └── ScheduledMeetingsHistory.tsx
```

Shared chrome: collapsible sidebar with nested menus (Prospecções, Repositório, Treinamentos, etc.) and profile switching BDR ↔ SDR.

### 1.6 Assets

| Asset | Purpose |
|-------|---------|
| `/assets/index-B7vd5ih_.js` | Full SPA (~640 KB) — all pages, seed data, scripts |
| `/assets/index-BR17lsp1.css` | Global styles |
| Inline `<style id="sales-thermometer-styles">` in `index.html` | Sales thermometer slider look |
| Inline diagnosis checkbox bridge script in `index.html` | Maps pain-priority checkboxes ↔ colored diagnosis buttons |
| `questionamentos.html` (fix build) | Standalone objection/FAQ repository |
| Placeholder recording URLs | `https://example.com/recordings/call-00x.mp3` (demo only) |

### 1.7 API endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/health` | `{ status: "ok", timestamp }` |
| `GET` | `/debug` | HTML page with server/error logs |
| `GET` | `/*` (static) | Files under `frontend/dist` |
| `GET` | `*` (fallback) | `index.html` for SPA client routes |

**No REST resources** for users, campaigns, leads, calls, dispositions, or meetings. Client “fetch” usage is limited to framework/debug concerns; commercial data is in-memory seed constants (`u0`, `$N`, `YN`, `rw`, `Vw`, `gp`, `aw`, …).

---

## 2. User journey

### 2.1 Login

1. Operator opens `https://acelereseucrescimento.com.br/` (route `/`).
2. Sees login form (Usuário + Senha).
3. Credentials are validated against a **hardcoded map** in `AuthContext`:

| Login | Password | Role | Display name | Post-login destination |
|-------|----------|------|--------------|------------------------|
| `admin` | `admin` | `admin` | Administrador | `/dashboard` |
| `bdr` | `bdr` | `bdr` | BDR - Prospecção | `/dashboard` |
| `sdr` | `sdr` | `sdr` | SDR - Qualificação | `/sdr-dashboard` |
| `colab` | `colab` | `colab` | Colaborador | `/dashboard` |
| `treina` | `treina` | `treina` | Treinamento | `/dashboard` |

4. On success, session `{ id, login, role, name }` is stored in `localStorage` key `crm_user`.
5. On failure: “Login ou senha inválidos”.
6. Empty fields: “Preencha todos os campos”.

> Demo credentials only — not production-safe.

### 2.2 Dashboard (BDR panel)

`/dashboard` (`BDRDashboard`) presents:

1. **Header timer** — “Tempo em atendimento” (`HH:MM:SS`) while status = `atendimento`.
2. **Metric cards** (seeded, mostly static):
   - Total de Ligações (`gp.totalCalls` = 156)
   - Contatos / calls today (`gp.callsToday` = 23)
   - Duração Média (`gp.averageDuration` = `3m 45s`)
   - Reuniões Agendadas (UI metric)
3. **Operator status buttons** — Desconectado / Em atendimento / Em intervalo / Indisponível.
4. **Campaign list** — “Campanhas Ativas” with selection.
5. **Primary CTAs** (enabled only in `atendimento`):
   - Discagem Automática → `/sdr-dialer?mode=automatic`
   - Ligação Manual → `/sdr-dialer?mode=manual`

### 2.3 Campaign selection

Seed campaigns (`u0`):

| ID | Name | Status | Leads | Completed | Progress |
|----|------|--------|-------|-----------|----------|
| `1` | Campanha Padrão | `active` | 245 | 89 | 36% |
| `2` | Prospecção Fria - Região Sul | `active` | 512 | 234 | 46% |
| `3` | Follow-up Clientes | `paused` | 156 | 156 | 100% |

Rules:
- Default selection on mount: stored `localStorage.selectedCampaignId` if it matches a known campaign; else first campaign (`"1"`).
- Selection is persisted to `localStorage` for the browser session/device.
- Paused campaigns remain visible; operational gating for starting auto-dial is tied primarily to **operator status**, not a hard campaign-status block in the CTA (campaign status is informational in the panel seed).

### 2.4 Operator status

See §3. Operator must reach **Em atendimento** before dial CTAs work.

### 2.5 Call lifecycle (summary)

```
Login → BDR Dashboard
  → set status = atendimento
  → select campaign (optional persistence)
  → Discagem Automática
       → SDRDialer mode=automatic
       → call.status = searching  (“Procura Automática”)
       → after ~3s: random lead from pool YN → connected
       → work script / diagnosis / disposition
       → optional Agendar Reunião (/scheduling)
       → Finalizar Atendimento (+ sales thermometer)
       → history row prepended
       → back to searching (next prospect)
```

Manual path: form (phone + Telefone Fixo | WhatsApp) → searching → same connected workspace → finalize still re-enters automatic searching (see §7 hidden logic).

---

## 3. Operator states

### 3.1 State catalog

| ID | Label (PT) | Meaning |
|----|------------|---------|
| `desconectado` | Desconectado | Default on enter. Offline / not ready. |
| `atendimento` | Em atendimento | Ready / working. Dial CTAs enabled. Session timer runs. |
| `intervalo` | Em intervalo | Break. Dial blocked. Timer paused. |
| `indisponivel` | Indisponível | Unavailable / wrap-up. Dial blocked. Timer paused. |

*(User wording “support” maps to product label **Em atendimento** / id `atendimento`. “Break” = `intervalo`. “Unavailable” = `indisponivel`. “Disconnected” = `desconectado`.)*

### 3.2 Allowed manual transitions

Implemented as:

```
desconectado → [atendimento]
atendimento  → [intervalo, indisponivel]
intervalo    → [atendimento, indisponivel]
indisponivel → [atendimento]
```

- Illegal transitions: button remains in UI but is disabled; tooltip / title = **“Transição indisponível para o status atual”**.
- Current status button title = **“Status atual”**.

### 3.3 Side effects

| Event | Effect |
|-------|--------|
| Enter `atendimento` | Start `tempoAtendimento` interval (+1s); enable Discagem Automática / Ligação Manual |
| Leave `atendimento` | Clear timer interval (elapsed value retained in state until remount) |
| Status ≠ `atendimento` | Dial CTAs `disabled` |

### 3.4 Automatic transitions (hidden / demo behavior)

**Critical finding:** while status is `atendimento`, a `setTimeout(..., 5000)` fires and **forces status → `indisponivel`**.

Implications:
- After ~5 seconds of being “Em atendimento”, the operator is auto-moved to Indisponível.
- Dial CTAs then disable unless the operator manually returns to Em atendimento.
- This looks like **demo / incomplete prototype logic**, not a realistic production idle policy (production systems usually auto-idle after long inactivity, not after 5s of readiness).

No other automatic status transitions were found (no wrap-up auto-return, no call-end auto-status change).

---

## 4. Automatic dialing workflow

### 4.1 Preconditions

1. Authenticated session in `localStorage`.
2. Operator status = `atendimento` (else CTA disabled).
3. Navigate to `/sdr-dialer?mode=automatic`.

### 4.2 How companies / leads are selected

- Dialer uses seed pool **`YN`** (3 demo companies), **not** campaign-specific queues.
- Selection algorithm:

```text
if call.status === "searching" AND elapsedTime >= 3:
  lead = YN[floor(random() * YN.length)]
  call.status = "connected"
  call.currentLead = lead
```

- **Random with replacement** — the same company can reappear; no depletion, no attempt counters, no DNC list, no campaign filter.

Seed leads (`YN`):

| ID | Company | Contact | Phone | City |
|----|---------|---------|-------|------|
| 1 | MAXBARRAMENTOS INDUSTRIA E COMERCIO LTDA | Renata Fernandes Almada Francesa Morel | (11) 4308-5075 | Diadema / SP |
| 2 | MAURICAR AUTOMOVEIS LTDA | Joao Silva Santos | (11) 99975-9506 | São Paulo / SP |
| 3 | TECH SOLUTIONS BRASIL LTDA | Maria Oliveira Costa | (21) 3333-4444 | Rio de Janeiro / RJ |

Lead card fields: `phone`, `name`, `company`, `email`, `address`, `city`, `state`, `cep`, `cnpj`, `protocol`.

Separate older list `$N` (João / Maria / Carlos “cold” leads) exists in the bundle for other surfaces; the auto-dial connect path uses **`YN`**.

### 4.3 How calls start

**Automatic**
1. Query `mode=automatic` on mount → set session:
   `{ status: "searching", elapsedTime: 0, currentLead: null, mode: "automatic", contactMethod: "phone" }`
2. UI shows **“Procura Automática”** / “O sistema procura automaticamente por números para ligar”.
3. Timer ticks every 1s while `searching` or `connected`.
4. At `elapsedTime >= 3`, transition to `connected` with random lead.

**Manual**
1. `mode=manual` → idle form first.
2. Require non-empty phone (`ae.trim()`) **and** contact method (`phone` | WhatsApp).
3. **Iniciar Ligação** → `{ status: "searching", mode: "manual", contactMethod }`.
4. After 3s, still assigns a **random `YN` lead** as `currentLead` (company card), while finalize uses the typed phone when `mode === "manual"`.

### 4.4 How data is loaded

| Data | Load mechanism |
|------|----------------|
| Campaigns | Compile-time constant `u0` |
| Dial pool | Compile-time constant `YN` |
| History seed | Compile-time constant `rw` |
| Dispositions | Compile-time constant `Vw` |
| Metrics | Compile-time constant `gp` |
| Opening script text | Template string `nw` |
| Guided script HTML | Embedded HTML string rendered into dialer tabs |
| Objection library | Dialer tab content + optional `questionamentos.html` |
| Session user | `localStorage.crm_user` |
| Selected campaign | `localStorage.selectedCampaignId` |

No network lead pull; refresh resets in-memory history additions unless separately persisted (session history lives in React state).

### 4.5 How the script appears

When `call.status === "connected"`, the workspace shows tabs:

| Tab | Label | Content |
|-----|-------|---------|
| `company` | Company / lead panel | Protocol, identifier, CNPJ, address, phone, company |
| `script` | Script de Abordagem | Guided HTML script with interactive radios / checkboxes |
| `questions` | Questionamentos Padrão | Objection / FAQ repository |
| `diagnosis` | Anotações de Diagnóstico | Structured selects + textareas |

Opening script template (`nw`) placeholders: `[AGENTE]`, `[EMPRESA]`, `[EMPRESA_PROSPECT]`, `[PRODUTO/SERVIÇO]`, with SIM / NÃO branch after asking for 2 minutes.

Script radios sync into diagnosis state via DOM `change` listeners (see §5).

---

## 5. Sales script

### 5.1 Opening script (approach)

```
Olá, tudo bem? Meu nome é [AGENTE] e estou ligando da [EMPRESA].

A razão da minha ligação é que identificamos que a [EMPRESA_PROSPECT]
pode se beneficiar muito com a nossa solução de [PRODUTO/SERVIÇO].

Você teria 2 minutos para conversar sobre isso?

[AGUARDAR RESPOSTA]

Se SIM: Ótimo! Então...
Se NÃO: Sem problema, quando seria um melhor momento para conversar?
```

### 5.2 Interactive questions → diagnosis mapping

Radio groups in the script HTML drive diagnosis fields:

| Script control `name` | Diagnosis field | Values (by radio index) |
|-----------------------|-----------------|-------------------------|
| `equipe` | `employees` | `1-5`, `6-20`, `21-50`, `50plus` |
| `equipe` (derived) | `companySize` | `micro`, `pequena`, `pequena`, `media` |
| `faturamento` | `monthlyRevenue` | `ate-200k`, `200k-500k`, `500k-800k`, `acima-800k` |
| `decisao` | `partnerPresence` | index `0` → `nao`; else `sim` |

Additional diagnosis free-text / selects (form tab):
`priority`, `painPoints`, `needs`, `objections`, `extraObservations`, `conversationSummary`.

### 5.3 Pain / priority diagnosis buttons (index.html bridge)

Global script maintains `window.__crmDiagnosisSelections` for:

| ID | Label theme |
|----|-------------|
| `lucro` | O dinheiro entra, mas não sobra \| Lucro |
| `vendas` | As vendas caíram / dependo de indicação \| Vendas / Crescimento |
| `gestao` | Vivo apagando incêndios \| Gestão |
| `lideranca` | A equipe depende de mim \| Liderança |
| `todos` | Tenho problemas em tudo |
| `nenhum` | Não tenho nenhum Problema |

Checkbox state in script HTML is painted onto colored `data-diagnosis-button` controls (bidirectional sync).

### 5.4 Conditional logic in script copy

Embedded HTML includes conditional coaching blocks, e.g.:
- If prospect already said a co-decisor exists → invite that person into the diagnostic meeting.
- Final confirmation block before scheduling ask.

Partner presence `nao` implies the operator should pursue the real decision-maker (soft rule in copy; not a hard UI lock).

### 5.5 Questionamentos Padrão (objection library)

Categories and entries (from `questionamentos.html`):

1. **Sobre o produto (5)** — O que vendem; ainda não entendi; como funciona; quanto tempo dura; curso/software/mentoria?
2. **Comparação com outros produtos (2)** — Diferencial da metodologia; vs consultoria comum.
3. **Sobre a empresa (5)** — O que é o IMP; tempo/know-how; cases; clientes; empresas como a minha.
4. **Preço e investimento (2)** — Quanto custa; insistência do preço.
5. **Segurança para avançar (4)** — Realidade diferente; garantia; o que ainda não tentei; por que confiar.
6. **Decisão e alinhamento interno (2)** — Preciso falar com sócio; já temos consultoria.
7. **Objeções de timing e prioridade (4)** — Não tenho problema; agora não; problema é o mercado; manda um material.

Each entry provides suggested spoken answers and “gancho” follow-up questions. This is **reference content**, not a branching engine.

### 5.6 Qualification rules (dispositions)

Catalog `Vw` (required conceptual outcome of the call):

| ID | Label | Color intent |
|----|-------|--------------|
| `interested` | Em negociação whatsApp | green |
| `callback` | Agendamento / Retorno | blue |
| `no_contact` | Sem contato / Ligação caiu | yellow |
| `no_interest` | Sem interesse | red |
| `wrong_number` | Telefone incorreto / Engano | blue-dark |
| `deceased` | Falecido | black |
| `sold` | Venda feita por telefone | green-dark |

**Completion modal** also captures **sales thermometer** `0–100`:
- ≤ 30 → Frio (red)
- ≤ 65 → Morno (amber)
- > 65 → Quente (green)

Business interpretation:
- Soft outcomes (`no_contact`, `wrong_number`, `deceased`) → lightweight wrap-up.
- Commercial outcomes (`interested`, `sold`, `callback`) → diagnosis + thermometer expected for closer handoff.
- `callback` aligns with scheduling path.

---

## 6. Call completion

### 6.1 Finalize attendance payload

On **Finalizar Atendimento**, history prepends:

```ts
{
  phone: string,                 // typed number if manual; else lead.phone
  company: string,               // lead.company or "Manual"
  qualification: string,         // Vw label for selected disposition id
  duration: number,              // elapsedTime seconds
  method: "Telefone Fixo" | "WhatsApp",
  timestamp: string,             // toLocaleString("pt-BR")
  notes: string,
  diagnosis: {                   // attendanceData || current diagnosis state
    companySize, monthlyRevenue, employees, partnerPresence,
    priority, painPoints, needs, objections,
    extraObservations, conversationSummary,
    // + sales temperature from modal when provided
  }
}
```

Then UI resets:
- Clear disposition / notes / diagnosis / script field state
- Tab back to `company`
- **Always** set call session to:
  `{ status: "searching", elapsedTime: 0, currentLead: null, mode: "automatic", contactMethod: "phone" }`

### 6.2 Scheduling

| Step | Behavior |
|------|----------|
| Entry | Button **Agendar Reunião** enabled only when `status === "connected"`; else title “Aguarde a conexão da chamada” |
| Navigation | `window.open("/scheduling", "_blank")` |
| Fields | Date (calendar; past dates blocked), Hora Início, Hora Fim, notes / meeting details |
| Agenda list | `/scheduled-meetings` (`ScheduledMeetingsHistory`) |
| Seed meetings | Present in bundle for demo continuity |

Scheduling does **not** automatically set disposition to `callback` in a shared store (new tab = separate React tree); operator must still pick disposition when finalizing the call.

### 6.3 Status / history updates

**CallHistory** (`/history`) supports filters:
- Situação da Ligação (`Sw`): `Atendida`, `Nao atendida`, `Abandonada`, `Caixa postal pré-atendimento`, `Fora do horário`, `Caixa postal pós-atendimento`, `Falha`
- Status do Cliente (`Tw`): `Interessado`, `Sem Interesse`, `Agendado`, `Em negociação whatsApp`, `Sem contato / Ligação caiu`

Seed history rows (`rw`) include protocol, CNPJ, partner CPF, address, `callStatus`, `result`, `recordingUrl` (placeholder).

New completions from the dialer update **in-memory dialer history state**; they are not written to a backend and may not fully share the same shape as the richer `rw` seed used by the dedicated history page (prototype limitation).

### 6.4 Next prospect flow

After finalize in the dialer:

1. Immediate return to **Procura Automática** (`searching`).
2. After ~3 seconds, another random `YN` lead connects.
3. Loop continues until the operator leaves the page or changes operator status on the dashboard (dashboard status is **not** shared via global store with the dialer — separate page state).

---

## 7. Business rules, validations, hidden logic, dependencies

### 7.1 Business rules

1. Only `atendimento` may start auto or manual dialing from the BDR dashboard.
2. Operator status transitions are constrained by an explicit adjacency matrix.
3. Connected call required to enable **Agendar Reunião**.
4. Manual dial requires phone + contact method before start.
5. Disposition catalog is fixed (`Vw`); labels are what get stored as `qualification`.
6. Sales temperature bands: Frio / Morno / Quente.
7. Campaign selection is remembered in `localStorage`.
8. Auth roles gate post-login landing (SDR vs others).
9. Profile switch in sidebar can move between BDR and SDR dashboards.
10. Telephony is simulated; “connected” means UI-ready, not PSTN answered.

### 7.2 Validations

| Check | Where | Behavior |
|-------|-------|----------|
| Non-empty login fields | Login | Block + message |
| Credential match | AuthContext | Exact login/password against hardcoded map |
| Manual phone non-empty | SDRDialer | `!ae.trim()` blocks start |
| Manual method selected | SDRDialer | `!z` blocks start |
| Dial CTA status gate | BDRDashboard | `disabled` unless `atendimento` |
| Schedule button | SDRDialer | `disabled` unless `connected` |
| Illegal status transition | BDRDashboard | Button disabled + title warning |
| Past meeting dates | Scheduling | Past day buttons not selectable |

### 7.3 Hidden / non-obvious logic

| Item | Detail |
|------|--------|
| **5s auto → Indisponível** | Being Em atendimento for 5 seconds auto-forces Indisponível on the dashboard |
| **Random lead pool** | Campaign selection does **not** filter `YN`; campaigns are UI/progress seeds |
| **3s fake ring/search** | Connect delay is `elapsedTime >= 3`, not network RTT |
| **Manual still draws YN company** | Manual mode fills `currentLead` from random pool after search delay |
| **Finalize always restarts automatic** | Even after a manual call, post-complete mode becomes `automatic` + `searching` |
| **No shared session store** | Dashboard status / dialer call state / scheduling tab are separate React trees |
| **Metrics mostly static** | `gp` seed values do not reliably recompute from live completions |
| **Recording URLs fake** | `example.com` placeholders |
| **Diagnosis bridge in index.html** | Pain checkboxes synchronized by DOM script outside React |
| **SDR WhatsApp inbox seed** | Separate chat dataset `aw` for SDR surfaces |
| **Auth is client-only** | Anyone can forge `localStorage.crm_user` |

### 7.4 Dependencies

| Dependency | Role |
|------------|------|
| Browser `localStorage` | Auth + campaign selection |
| Express static hosting | Delivery of SPA |
| Google Fonts CDN | Typography |
| Client timers (`setInterval` / `setTimeout`) | Attendance clock, call clock, auto-status, search delay |
| Seed constants in JS bundle | All CRM-like data |
| New browser tab | Scheduling UX |
| IMP Platform (separate React app in this repo) | Optional launcher to external BDR URL (`VITE_IMP_BDR_URL` / default acelereseucrescimento) — **not** part of the dialer’s own runtime |

### 7.5 Explicit non-capabilities (as-built)

- No SIP / WebRTC / Twilio / Asterisk integration
- No real call recording storage
- No server-side lead queue, pacing, or compliance (DNC)
- No multi-tenant CRM API
- No durable history/meeting persistence across reloads (beyond seeds + localStorage keys above)
- No SSO into BDR from IMP (new tab open only)

---

## 8. Screen → behavior map

| Screen | Primary behaviors |
|--------|-------------------|
| Login `/` | Credential gate; role-based redirect |
| BDR Dashboard | Status FSM (+5s auto-indisponível), metrics, campaigns, dial CTAs |
| SDR Dashboard | Qualification / WhatsApp-oriented workspace (parallel product path) |
| SDR Dialer automatic | Search → random connect → script/diagnosis → finalize → next search |
| SDR Dialer manual | Phone+method form → search → connect workspace → finalize → auto search |
| Call History | Filter by call situation + client status; seed + session rows |
| Scheduling | Create meeting date/time; past dates blocked |
| Scheduled Meetings | List / calendar of meetings |
| Campaigns | Campaign listing surface |
| Dialer | Alternate dialer implementation still present in bundle |

---

## 9. End-to-end reference flow (operator demo)

1. Open `https://acelereseucrescimento.com.br/`
2. Login `bdr` / `bdr`
3. Land on `/dashboard` with status **Desconectado**
4. Click **Em atendimento** (timer starts; note 5s auto-flip risk)
5. Select a campaign (persisted)
6. Click **Discagem Automática**
7. Observe **Procura Automática** ~3 seconds
8. Lead card + script tabs appear (`connected`)
9. Answer script radios (equipe / faturamento / decisão) → diagnosis prefilled
10. Optionally open **Agendar Reunião**
11. Choose disposition, set thermometer, **Finalizar Atendimento**
12. History updated; automatic search for next random prospect begins

---

## 10. Traceability (artifact → behavior)

| Topic | Primary artifact |
|-------|------------------|
| Auth users / roles | `AuthContext.tsx` constant map `ZT` |
| Operator FSM + 5s auto | `BDRDashboard.tsx` |
| Campaigns | `u0` in bundle / BDRDashboard |
| Auto dial + script | `SDRDialer.tsx` |
| Lead pool | `YN` |
| Dispositions | `Vw` |
| History filters | `CallHistory.tsx` (`Sw`, `Tw`) |
| Scheduling | `Scheduling.tsx`, `ScheduledMeetingsHistory.tsx` |
| Objection copy | `questionamentos.html` + dialer questions tab |
| Thermometer + diagnosis paint | `index.html` inline scripts/styles |
| Hosting | `backend/src/index.ts`, `server.js`, `hostinger-build.json` |

---

## 11. Architect verdict

The existing BDR automatic dialing system is a **frontend-simulated contact-center cockpit**: realistic operator UX (status matrix, auto/manual modes, guided script, dispositions, scheduling, history) over **mock data and timers**, served by a thin Express static host.

For product reconstruction or IMP in-app simulation, treat the **state machines and catalogs in this document** as the functional contract. Do **not** assume real telephony, campaign-true queuing, or backend persistence unless those layers are built separately.

**Related docs:**
- Prototype simulation plan for IMP: `docs/BDR_FUNCTIONAL_PROTOTYPE_SPEC.md`
- IMP shell handover: `docs/IMP_PLATFORM_TECHNICAL_HANDOVER.md`
