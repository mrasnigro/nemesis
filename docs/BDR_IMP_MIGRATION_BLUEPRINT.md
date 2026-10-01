# BDR → IMP Migration Blueprint

**Document type:** Implementation blueprint for in-app BDR prototype  
**Date:** 31 July 2026  
**Status:** Ready for phased implementation (no code in this document)

### Source authority (highest → supporting)

| Priority | Document | Role |
|----------|----------|------|
| 1 | `docs/BDR_FUNCTIONAL_SPECIFICATION.md` | As-is business rules / FSMs / catalogs |
| 1 | `docs/BDR_LIVE_SYSTEM_ANALYSIS.md` | Production verification of behavior & routes |
| 1 | `docs/BDR_VIDEO_BEHAVIOR_ANALYSIS.md` | Operator-visible workflow & copy |
| 1 | `docs/BDR_UI_REFERENCE.md` | Pixel/UX chrome, labels, states |
| 2 | `docs/BDR_FUNCTIONAL_PROTOTYPE_SPEC.md` | IMP target scope, gaps, acceptance script |
| 3 | `docs/IMP_PLATFORM_TECHNICAL_HANDOVER.md` | Platform shell (auth/access); **external BDR launch superseded** |

> **`docs/client-requirements.md`:** not present in the repository at blueprint time. Client intent is taken from the prototype spec + handover demo goals. If/when `client-requirements.md` lands, re-diff this blueprint before coding.

### Non-negotiable product rule

**The IMP prototype must reproduce current operational behavior.**  
Do **not** simplify adjacency matrices, dial gates, search delay, disposition catalog, script→diagnosis mapping, thermometer bands, history filters, or completion loops.  
Telephony remains **simulated** (timers + seed leads). Stay **inside IMP** (no `window.open` to acelereseucrescimento).

Where prior prototype notes “improve” live quirks, **default to live behavior** unless a signed product decision says otherwise (see §0.1).

---

## 0. Behavioral contract (must not be simplified)

### 0.1 Live rules to preserve exactly

| Rule | Live behavior |
|------|----------------|
| Operator statuses | `desconectado` \| `atendimento` \| `intervalo` \| `indisponivel` |
| Transition matrix | `desconectado→atendimento`; `atendimento→intervalo\|indisponivel`; `intervalo→atendimento\|indisponivel`; `indisponivel→atendimento` |
| Illegal transition UX | Button disabled + title **Transição indisponível para o status atual**; current = **Status atual** |
| Dial gate | Discagem Automática / Ligação Manual only when `atendimento` |
| Attendance timer | Runs only in `atendimento`; pause/retain on leave |
| Auto-status quirk | After ~5s in `atendimento`, force → `indisponivel` (as-built demo) |
| Auto search | Status band **Aguardando ligação…**; connect when `elapsedTime >= 3` |
| Lead pick | Random with replacement from seed pool `YN` (3 companies); **campaign does not filter queue** |
| Connected UX | Band **Falando** + phone; tabs company / script / questions / diagnosis |
| Manual | Phone non-empty + Telefone Fixo \| WhatsApp; then searching → still draws `YN` company card; typed phone on finalize |
| Finalize | History prepend; clear diagnosis; **always** restart `{ searching, mode: automatic, … }` (including after manual) |
| Schedule | Enabled only when `connected`; hours panel 9:00–18:00 / 30 min; past dates blocked |
| Dispositions `Vw` | Full catalog available on completion (interested, callback, no_contact, no_interest, wrong_number, deceased, sold) |
| Thermometer | 0–100 → Frio ≤30 / Morno ≤65 / Quente >65 |
| Script sync | Radios `equipe` / `faturamento` / `decisao` (+ pains) drive diagnosis fields |
| Objections | Seven categories with entry counts from live library |

### 0.2 Explicit non-goals (prototype)

- Real SIP / WebRTC / PSTN / Twilio  
- Real recording storage (UI affordances may show placeholders)  
- Production SSO into external BDR  
- Multi-tenant dialer backend  
- Campaign-true pacing / DNC / attempt counters (live does not have them — do not invent)

### 0.3 Decision log (conflicts)

| Topic | Live | Prototype-spec suggestion | Blueprint default |
|-------|------|---------------------------|-------------------|
| Post-manual finalize | Restart automatic search | Return to manual idle | **Live** |
| Paused campaign dial | Informational; CTA not hard-blocked | Block start | **Live** (badge only) unless product signs block |
| Disposition required | Catalog exists; video often skips chips | Must select | **Require picker** (catalog complete — not a simplification) |
| Searching copy | **Aguardando ligação…** | “Procura Automática” | **Live UI strings** |
| Thermometer UI | Inline diagnosis + `endCallModal` bridge | Completion modal | **Both paths OK**; bands identical |

---

## 1. IMP integration architecture

### 1.1 Target topology

```text
Browser
  └── IMP React SPA (Vite)
        ├── AuthContext (sessionStorage imp_user)
        ├── WorkspaceContext (customer ∩ user modules)
        ├── ModuleAccessRoute(moduleId="bdr")
        └── DialerLayout
              └── BdrSessionProvider   ← NEW shared session
                    ├── Painel (/modules/bdr)
                    ├── Discagem (/modules/bdr/discagem?mode=automatic|manual)
                    ├── Manual (/modules/bdr/manual)  [alias or redirect]
                    ├── Histórico (/modules/bdr/historico)
                    ├── Agendamentos (/modules/bdr/agendamentos)
                    └── Agendar (/modules/bdr/agendar)  [modal or route]
                          │
                          ▼ (today)
                    Mock repositories (seed + session memory)
                          │
                          ▼ (later — same interfaces)
                    REST / GraphQL BDR domain API
```

### 1.2 Integration principles

1. **In-app only** — BDR is an IMP module, not an external tab.  
2. **Platform owns identity & licensing** — IMP auth + module grants.  
3. **Module owns operator session** — status, call FSM, history, meetings, metrics.  
4. **Ports & adapters** — UI talks to `BdrDataPort` (mock now, API later).  
5. **Visual parity** — follow `BDR_UI_REFERENCE.md` (dark graphite, `#f59e0b`, green Falando, orange searching).  
6. **Single session tree** — Painel and dialer must share state (live’s split React trees are a bug to fix **without** dropping rules).

### 1.3 Route map (IMP)

| IMP path | Live analogue | Screen |
|----------|---------------|--------|
| `/modules/bdr` | `/dashboard` | Painel BDR |
| `/modules/bdr/discagem?mode=automatic` | `/sdr-dialer?mode=automatic` | Auto dial workspace |
| `/modules/bdr/discagem?mode=manual` | `/sdr-dialer?mode=manual` | Manual form + same workspace |
| `/modules/bdr/manual` | same | Redirect → `discagem?mode=manual` |
| `/modules/bdr/historico` | `/history` | Call history |
| `/modules/bdr/agendamentos` | `/scheduled-meetings` | Agenda by date |
| `/modules/bdr/agendar` | `/scheduling` | Create meeting (or modal) |

Optional later: `/modules/bdr/campanhas` ← live `/campaigns` (campaign picker already on painel).

### 1.4 Layout responsibilities

| Layer | Owns |
|-------|------|
| `DialerLayout` | Sidebar (Painel, Discagem, Manual, Histórico, Agenda), header **Tempo em atendimento**, Sair |
| `BdrSessionProvider` | Operator FSM, call session, campaign, history[], meetings[], metrics, script/diagnosis draft |
| Page components | Presentation + local UI chrome only |

---

## 2. Folder structure

Proposed expansion under existing IMP `src/` (keep DialerLayout routes; grow domain):

```text
src/
├── layouts/
│   └── DialerLayout.jsx|.css          # extend nav + live timer binding
├── pages/modules/
│   ├── Bdr.jsx|.css                   # Painel (replace stubs with session wiring)
│   └── bdr/
│       ├── Discagem.jsx               # auto/manual workspace host
│       ├── Manual.jsx                 # thin redirect or form entry
│       ├── Historico.jsx
│       ├── Agendamentos.jsx
│       ├── Agendar.jsx                # NEW scheduling surface
│       └── components/                # NEW — dialer UI atoms/molecules
│           ├── OperatorStatusBar.jsx
│           ├── CampaignList.jsx
│           ├── QuickActions.jsx
│           ├── MetricCards.jsx
│           ├── CallStatusBand.jsx     # searching orange / connected green
│           ├── ManualDialForm.jsx
│           ├── LeadCompanyPanel.jsx
│           ├── ScriptWorkspace.jsx
│           ├── ObjectionsPanel.jsx
│           ├── DiagnosisForm.jsx
│           ├── PainTiles.jsx
│           ├── SalesThermometer.jsx
│           ├── DispositionPicker.jsx
│           ├── FinalizeAttendance.jsx
│           ├── HistoryTable.jsx
│           ├── HistoryFilters.jsx
│           ├── SchedulingCalendar.jsx
│           └── MeetingCard.jsx
├── modules/bdr/                       # NEW — domain (not just pages)
│   ├── session/
│   │   ├── BdrSessionContext.jsx
│   │   ├── operatorStatusMachine.js   # adjacency + side effects + 5s auto
│   │   ├── callSessionMachine.js      # idle|searching|connected
│   │   └── selectors.js
│   ├── data/
│   │   ├── catalogs.js                # Vw, Sw, Tw, thermometer bands
│   │   ├── seeds.js                   # campaigns u0, leads YN, history rw, objections
│   │   ├── scriptContent.js           # guided script HTML / sections
│   │   └── mockBdrRepository.js       # implements BdrDataPort
│   ├── ports/
│   │   └── BdrDataPort.ts|.js         # interface for future API
│   ├── permissions/
│   │   └── bdrPermissions.js          # bdr.* keys + helpers
│   └── utils/
│       ├── timers.js
│       ├── protocol.js
│       └── formatters.js              # pt-BR phone, duration, timestamps
└── data/admin/permissions.js          # register bdr.* catalog entries
```

Static assets (optional): `public/bdr/questionamentos.html` or embed objection JSON from seeds.

---

## 3. Components to migrate

### 3.1 From live CRM IMP (logical migration — recreate in IMP)

| Live surface | IMP target | Notes |
|--------------|------------|-------|
| `BDRDashboard` | `Bdr.jsx` + `OperatorStatusBar`, `MetricCards`, `CampaignList`, `QuickActions` | Full FSM + gates |
| `SDRDialer` | `Discagem.jsx` + call band + tabs | Auto + manual modes |
| Manual modal/form | `ManualDialForm` | Phone + channel + Iniciar |
| Company / script / questions / diagnosis tabs | Four panel components | Exact field sets |
| `questionamentos.html` categories | `ObjectionsPanel` | 7 categories + counts |
| Sales thermometer + finalize | `SalesThermometer` + `FinalizeAttendance` | Bands + disposition |
| `CallHistory` | `Historico.jsx` | Filters Situação + Status Cliente |
| `Scheduling` + `ScheduledMeetingsHistory` | `Agendar` + `Agendamentos` | Hours 9–18 / 30 min |
| Diagnosis bridge / pain buttons | `PainTiles` | Six pain IDs |
| Collapsible chrome | Existing `DialerLayout` | Add Manual; bind timer |

### 3.2 Keep / thin-wrap in IMP shell

| Existing | Action |
|----------|--------|
| `ModuleAccessRoute` + `bdr` grant | Keep |
| `AuthContext` demo `bdr/bdr` | Keep; map to operator display name |
| `DialerLayout` | Extend; remove static `00:00:00` |
| Stub pages Discagem/Manual/Historico/Agendamentos | Replace bodies; keep routes |

### 3.3 Do not migrate into prototype

| Item | Reason |
|------|--------|
| Express `/health` `/debug` | IMP host separate |
| Hardcoded CRM login map on BDR domain | IMP owns login |
| External `VITE_IMP_BDR_URL` launch | Superseded |
| Full SDR WhatsApp inbox (`aw`) | Out of BDR operate path unless demo expands |
| Legacy `/dialer` alternate UI | Optional P2; primary is SDRDialer-equivalent |

---

## 4. State management approach

### 4.1 Choice

**React Context + reducer (or machine helpers) under `DialerLayout`.**  
No Redux/Zustand required for prototype. Aligns with IMP (Context + local state + admin store pattern).

### 4.2 `BdrSession` shape

```ts
type BdrSession = {
  operatorStatus: 'desconectado' | 'atendimento' | 'intervalo' | 'indisponivel'
  tempoAtendimentoSec: number
  selectedCampaignId: string
  campaigns: Campaign[]
  metrics: {
    totalCalls: number
    callsToday: number
    averageDurationLabel: string
    meetingsScheduled: number
    // goals for UI (from live): callsGoal=30, meetingsGoal=10
  }
  call: {
    status: 'idle' | 'searching' | 'connected'
    elapsedTime: number
    currentLead: Lead | null
    mode: 'automatic' | 'manual' | null
    contactMethod: 'phone' | 'whatsapp' | null
    manualPhone: string
  }
  diagnosis: DiagnosisState
  dispositionId: string | null
  salesTemperature: number
  notes: string
  activeTab: 'company' | 'script' | 'questions' | 'diagnosis'
  history: HistoryRow[]
  meetings: Meeting[]
}
```

### 4.3 Machines (pure modules)

1. **`operatorStatusMachine`**  
   - `canTransition(from, to)` from adjacency matrix  
   - `enterAtendimento` / `leaveAtendimento` timer hooks  
   - `scheduleAutoIndisponivel(5000)` matching live quirk  
2. **`callSessionMachine`**  
   - startAutomatic / startManual / tick / connectAt3s / finalize / hangup paths  
   - finalize → always automatic searching (live)

### 4.4 Persistence (prototype)

| Key | Storage | Content |
|-----|---------|---------|
| IMP auth | `sessionStorage.imp_user` | unchanged |
| BDR campaign | `sessionStorage.bdr_selectedCampaignId` (or localStorage) | mirror live |
| Optional hydrate | `sessionStorage.bdr_session_v1` | history/meetings/metrics for refresh demos |

Do not use live’s `crm_user` key inside IMP.

### 4.5 Timer ownership

- One interval for operator attendance clock (only while `atendimento`).  
- One interval for call elapsed (while `searching` \| `connected`).  
- Clear on unmount of provider / status leave as per live side effects.

---

## 5. Mock data structure

### 5.1 Catalogs (`catalogs.js`)

```ts
// Dispositions Vw — do not drop any id
DISPOSITIONS = [
  { id: 'interested', label: 'Em negociação whatsApp', color: 'green' },
  { id: 'callback', label: 'Agendamento / Retorno', color: 'blue' },
  { id: 'no_contact', label: 'Sem contato / Ligação caiu', color: 'yellow' },
  { id: 'no_interest', label: 'Sem interesse', color: 'red' },
  { id: 'wrong_number', label: 'Telefone incorreto / Engano', color: 'blue-dark' },
  { id: 'deceased', label: 'Falecido', color: 'black' },
  { id: 'sold', label: 'Venda feita por telefone', color: 'green-dark' },
]

CALL_SITUATIONS = [ /* Sw: Atendida, Não atendida, Abandonada, … */ ]
CLIENT_STATUSES = [ /* Tw: Interessado, Sem Interesse, Agendado, … */ ]

THERMOMETER = { frioMax: 30, mornoMax: 65 } // >65 Quente

PAIN_ITEMS = [
  { id: 'lucro', … }, { id: 'vendas', … }, { id: 'gestao', … },
  { id: 'lideranca', … }, { id: 'todos', … }, { id: 'nenhum', … },
]
```

### 5.2 Seeds (`seeds.js`)

| Collection | Source | Contents |
|------------|--------|----------|
| `campaigns` | live `u0` | Padrão / Sul / Follow-up with leads, completed, progress, status |
| `dialPool` | live `YN` | MAXBARRAMENTOS, MAURICAR, TECH SOLUTIONS (+ full card fields, protocol, CPF, etc.) |
| `historySeed` | live `rw` / history page | João / Maria / Carlos style rows + recording placeholders |
| `meetingsSeed` | live scheduling | João Silva Santos / Maria Santos cards |
| `metricsSeed` | live `gp` | 156, 23, 3m 45s, 4 meetings; metas 30 / 10 |
| `objections` | questionamentos categories | 7 groups with answers/ganchos |
| `openingScript` | live `nw` + guided HTML sections | Full script sections from UI reference / video |

### 5.3 Entity TypeScript shapes (canonical)

```ts
type Lead = {
  id: string
  phone: string
  name: string
  company: string
  email: string
  address: string
  city: string
  state: string
  cep?: string
  cnpj: string
  protocol: string
  partnerName?: string
  partnerCpf?: string
  identifier?: string
  socialReason?: string
}

type HistoryRow = {
  id: string
  phone: string
  company: string
  leadName?: string
  qualification: string
  qualificationId: string
  duration: number
  method: 'Telefone Fixo' | 'WhatsApp'
  timestamp: string
  notes: string
  diagnosis: DiagnosisState
  campaignId: string
  mode: 'automatic' | 'manual'
  callStatus: string      // Situação
  clientStatus: string    // Status Cliente
  recordingUrl?: string
  protocol?: string
}

type Meeting = {
  id: string
  leadName: string
  company?: string
  phone?: string
  date: string
  time: string
  endTime?: string
  notes?: string
  protocol?: string
  sourceCallId?: string
  createdAt: string
}
```

### 5.4 Repository API (mock)

```ts
interface BdrDataPort {
  listCampaigns(): Promise<Campaign[]>
  listDialPool(campaignId: string): Promise<Lead[]>  // ignore campaign filter to match live
  pickNextLead(campaignId: string): Promise<Lead>    // random YN
  listHistory(): Promise<HistoryRow[]>
  saveHistory(row: HistoryRow): Promise<void>
  listMeetings(): Promise<Meeting[]>
  saveMeeting(m: Meeting): Promise<void>
  getObjections(): Promise<ObjectionCategory[]>
  getScript(): Promise<ScriptDocument>
}
```

Mock implementation mutates in-memory arrays + optional sessionStorage snapshot.

---

## 6. Future API replacement points

Keep UI and machines free of fetch details. Swap only `mockBdrRepository` → `apiBdrRepository`.

| Port method | Future endpoint (illustrative) | Notes |
|-------------|-------------------------------|-------|
| `listCampaigns` | `GET /api/bdr/campaigns` | Tenant-scoped |
| `pickNextLead` | `POST /api/bdr/queue/next` | Real pacing/DNC later |
| `saveHistory` | `POST /api/bdr/calls` | Durable history |
| `listHistory` | `GET /api/bdr/calls?…` | Server filters |
| `saveMeeting` / `listMeetings` | `/api/bdr/meetings` | Calendar sync |
| `getScript` / `getObjections` | CMS endpoints | Versioned content |
| Operator status (optional) | `PUT /api/bdr/operators/me/status` | Presence / wallboard |
| Auth handoff | IMP JWT → BDR API | Not required for mock phase |

**Feature flags:** `VITE_BDR_DATA_SOURCE=mock|api`.  
**Do not** block prototype on API. Interfaces first.

---

## 7. Permissions integration

### 7.1 Existing platform gate (keep)

- Role `imp` + `ModuleAccessRoute` `moduleId="bdr"`  
- Effective access = `customer.modulesEnabled ∩ user.assignedModules`  
- Demo user Bruno Lima includes `bdr`

### 7.2 Dialer permission keys (add to admin catalog + enforce in UI)

| Key | Enforces |
|-----|----------|
| `bdr.operate` | Enter dialer; change status; start dial |
| `bdr.campaigns.select` | Select campaign |
| `bdr.history.self` | View history |
| `bdr.history.team` | Team history (supervisor demo; optional) |
| `bdr.schedule` | Agendar Reunião / save meeting |
| `bdr.scripts.view` | Script + objections tabs |

**Prototype default:** grant all of the above to any user with module `bdr`.  
Still register keys so Admin → Permissions shows them (handover gap fix).

### 7.3 Enforcement points

| UI action | Check |
|-----------|-------|
| Status change / dial CTAs | `bdr.operate` **and** status matrix **and** `atendimento` |
| Campaign click | `bdr.campaigns.select` |
| Open histórico | `bdr.history.self` |
| Schedule | `bdr.schedule` + call `connected` |
| Script tabs | `bdr.scripts.view` (or operate) |

### 7.4 SDR path

Live SDR dashboard is out of primary BDR operate migration. Do not block BDR prototype on SDR unless client-requirements later demand it.

---

## 8. Required prototype screens

Must ship for acceptance (labels PT, chrome per UI reference):

| # | Screen | Route | Must include |
|---|--------|-------|--------------|
| 1 | **Painel** | `/modules/bdr` | KPIs (incl. metas), status FSM + tooltips, campaigns (Selecionada/Ativa/Pausada), quick actions gated |
| 2 | **Discagem automática** | `…/discagem?mode=automatic` | Searching band, then Falando workspace, 4 tabs, Agendar/Desligar, finalize loop → next search |
| 3 | **Ligação manual** | `…/discagem?mode=manual` (nav Manual) | Form validation; same connected workspace; live finalize→auto search |
| 4 | **Script workspace** | tab on connected | Full sections, pains, radios, decision branches, confirmação final |
| 5 | **Questionamentos** | tab | 7 accordion categories + optional new-window content |
| 6 | **Diagnóstico** | tab | Selects, pain tiles, textareas, thermometer, disposition, Finalizar Atendimento |
| 7 | **Agendar reunião** | modal or `/agendar` | Calendar, Horários 9–18 / 30 min, past blocked, save → meetings |
| 8 | **Agendamentos** | `/agendamentos` | Calendar + day list / empty state |
| 9 | **Histórico** | `/historico` | Dual filters, table, seed + live rows, detail/actions placeholders |

**DialerLayout chrome:** Manual in sidebar; **Tempo em atendimento** bound to session.

---

## 9. Development phases

### Phase 0 — Blueprint freeze (docs only)

- Confirm authority order (§ top).  
- Add `client-requirements.md` when available; re-diff §0.3.  
- Acceptance script locked (below).

### Phase 1 — Session foundation

- `BdrSessionProvider` + operator machine + call machine  
- Wire `DialerLayout` timer + Manual nav  
- Painel: real FSM, gates, campaign persistence, seed metrics/campaigns  
- **Exit:** illegal transitions blocked; dial CTAs only in `atendimento`; 5s auto-indisponivel present

### Phase 2 — Dial lifecycle

- Automatic searching → 3s → random `YN` connect  
- Manual form + connect path  
- Call status bands (Aguardando / Falando)  
- Company panel fields complete  
- Finalize → history prepend → automatic searching restart  
- **Exit:** demo script steps 1–6 without script depth

### Phase 3 — Script, diagnosis, dispositions

- Full script content + radio→diagnosis sync  
- Pain tiles bidirectional  
- Objections accordion  
- Disposition catalog + thermometer bands + Finalizar validation rules  
- **Exit:** commercial completion payload matches functional §6

### Phase 4 — Scheduling & history UX

- Agendar from connected call  
- Meetings list/calendar  
- History filters Situação + Status Cliente  
- Metric/campaign progress updates from session activity (still no invented pacing)  
- **Exit:** full acceptance script passes

### Phase 5 — Permissions & polish

- Register/enforce `bdr.*`  
- UI reference spacing/colors pass  
- sessionStorage hydrate optional  
- Remove leftover stub copy  

### Phase 6 — API seam (post-prototype)

- Implement `apiBdrRepository` behind flag  
- Map JWT/tenant headers from IMP  
- Replace seeds gradually (campaigns → queue → history)

---

## 10. Acceptance criteria (must pass)

1. Login IMP `bdr`/`bdr` → open module Discagem Automática.  
2. Status starts **Desconectado**; Discagem/Manual disabled.  
3. Illegal jump (e.g. Desconectado → Intervalo) blocked with correct title.  
4. **Em atendimento** → timer runs; CTAs enable; (~5s) auto → **Indisponível** unless dial already started / operator re-enters (document demo quirk in QA).  
5. Auto dial → **Aguardando ligação…** → ~3s → **Falando** with a `YN` company.  
6. Tabs usable; Agendar only when connected.  
7. Disposition + thermometer + Finalizar → Histórico row; next search starts.  
8. Manual path validates phone + method; company card still from pool; finalize restarts automatic search (live).  
9. Schedule meeting → appears in Agendamentos; past dates blocked.  
10. History filters match live situação/status lists.  
11. No external BDR URL open.  
12. No real telephony.

---

## 11. Risks before implementation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing `client-requirements.md` | Scope dispute | Freeze on docs listed; require client file before Phase 3 sign-off |
| Reproducing 5s auto-indisponivel | Breaks demos if misunderstood | Keep as-is; QA note; product may later replace with idle policy |
| Campaign ≠ queue confusion | Stakeholders expect campaign filtering | UI shows campaigns; code comments + docs state live non-filter |
| Script HTML size/complexity | Schedule slip | Port from live bundle/UI reference in Phase 3; don’t stub radios |
| Disposition vs video gap | Incomplete wrap-up UX | Implement full `Vw` picker even if video skipped it |
| Split state (painel vs dialer) | Lost status/history | Mandatory `BdrSessionProvider` in Phase 1 |
| Visual drift from live | Client rejection | Bind to `BDR_UI_REFERENCE.md` + screenshot PNGs |
| Accidental “improvements” | Rule simplification | Code review against §0.1 checklist |
| Handover stale external launch | Wrong architecture | This blueprint + prototype spec supersede handover BDR launch |
| Performance of long script page | Jank | Virtualize only if needed; prefer fidelity first |

---

## 12. Traceability matrix

| Blueprint § | Primary sources |
|-------------|-----------------|
| Behavioral contract | Functional spec §3–7, Live analysis, Video analysis |
| UI chrome | UI reference + screenshots |
| Architecture / folders | IMP routes + prototype spec §15 |
| Mock data | Functional §4–5 catalogs/seeds |
| Permissions | Prototype §11 + IMP access layer |
| Phases / acceptance | Prototype §13–14 adapted to live finalize rule |

---

## 13. Immediate next step

1. Drop or confirm `docs/client-requirements.md`.  
2. Product sign-off on §0.3 defaults (especially 5s auto-indisponivel + post-manual auto restart).  
3. Start **Phase 1** (`BdrSessionProvider` + Painel FSM) without simplifying rules.
