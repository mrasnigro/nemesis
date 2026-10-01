# BDR Module — Functional Prototype Specification

**Document type:** Functional behavior spec for the IMP Platform BDR prototype  
**Product:** Discagem Automática (BDR)  
**Sources analyzed:**
- Live CRM IMP at `acelereseucrescimento.com.br` (frontend bundle `crm-imp-hostinger-v2`: `BDRDashboard`, `SDRDialer`, `Dialer`, `CallHistory`, `ScheduledMeetingsHistory`, `Scheduling`)
- Current IMP in-app dialer shell (`DialerLayout`, `Bdr`, `bdr/*`)
- Platform handover (`docs/IMP_PLATFORM_TECHNICAL_HANDOVER.md`) — partly stale on BDR (external launch vs in-app)

**Objective:** Reproduce **real operational behavior** inside IMP — not UI chrome only. Telephony hardware is out of scope; dialing is **simulated** with the same state machine, rules, and operator flows as the live system.

**Date:** 31 July 2026

---

## 0. Scope and principles

| In scope (simulate) | Out of scope (do not build for prototype) |
|---------------------|-------------------------------------------|
| Operator status FSM + timers | Real SIP / WebRTC / PSTN |
| Campaign selection → queue | Carrier provisioning |
| Auto + manual dial lifecycles | Call recording storage |
| Guided sales script + diagnosis capture | Full CRM lead CRUD admin |
| Qualification / disposition rules | Production SSO into external BDR |
| Conditional fields from script answers | Multi-tenant dialer backend |
| Meeting scheduling from an active call | Analytics warehouse |
| Call completion → history / agenda | Real WhatsApp channel |

**Simulation contract:** After every completed contact, session state must update history, metrics, agenda (when scheduled), and return the operator to the next searchable contact when in automatic mode — identical to the live demo product’s session loop.

---

## 1. Operator states

### 1.1 States

| ID | Label (PT) | Meaning |
|----|------------|---------|
| `desconectado` | Desconectado | Offline / not ready. Default on enter. |
| `atendimento` | Em atendimento | Ready / working. Enables dial actions. Starts **Tempo em atendimento**. |
| `intervalo` | Em intervalo | Break. Dial actions blocked. Timer paused. |
| `indisponivel` | Indisponível | Unavailable (wrap-up / blocked). Dial actions blocked. Timer paused. |

### 1.2 Allowed transitions (must enforce)

```
desconectado → atendimento
atendimento  → intervalo | indisponivel
intervalo    → atendimento | indisponivel
indisponivel → atendimento
```

- Illegal transitions: button disabled + title `Transição indisponível para o status atual`.
- Operator **cannot** jump freely (current IMP shell allows any click — **wrong**).

### 1.3 Side effects

| Event | Behavior |
|-------|----------|
| Enter `atendimento` | Start header timer (`HH:MM:SS`); enable Discagem Automática / Ligação Manual |
| Leave `atendimento` | Pause timer (retain elapsed for session) |
| Click Discagem Automática | Only if `status === atendimento` → `/modules/bdr/discagem?mode=automatic` (or equivalent in-app route) |
| Click Ligação Manual | Only if `status === atendimento` → manual mode |
| Campaign select | Persist `selectedCampaignId` for session (live uses `localStorage`) |

### 1.4 IMP gap

Current prototype: four status buttons, local React state, **no transition matrix**, timer hard-coded `00:00:00`, dial CTAs not gated.

---

## 2. Call lifecycle

### 2.1 Call session model

```ts
{
  status: 'idle' | 'searching' | 'connected' | 'paused',
  elapsedTime: number,        // seconds; ticks while searching|connected
  currentLead: Lead | null,
  mode: 'automatic' | 'manual' | null,
  contactMethod: 'phone' | 'whatsapp' | null
}
```

### 2.2 Lead card (minimum fields)

From live pool: `id`, `phone`, `name`, `company`, `email`, `address`, `city`, `state`, `cep`, `cnpj`, `protocol`.

### 2.3 State transitions

```
idle
  ├─[start automatic]──────────────► searching
  └─[start manual + valid input]───► searching

searching
  └─[sim: after ~3s pick next lead]► connected

connected
  ├─[finalize attendance]──────────► searching (auto) | idle (manual end)
  └─[hang up without disposition]──► (prototype: require disposition before next)
```

### 2.4 Timers

- **Session timer** (header): tied to operator `atendimento`.
- **Call timer**: increments every 1s while call `status` is `searching` or `connected`; shown on active call UI; stored on history row as `duration`.

### 2.5 IMP gap

No call state machine. Discagem / Manual are static stubs.

---

## 3. Automatic dialing flow

### 3.1 Preconditions

1. Operator status = `atendimento`
2. An **active** campaign is selected (`status: active`; paused campaigns not startable)
3. User opens Discagem Automática

### 3.2 Flow

1. Set call session → `{ status: 'searching', mode: 'automatic', contactMethod: 'phone', currentLead: null, elapsedTime: 0 }`
2. Show “Procura Automática” / searching UI
3. After ~3 seconds (sim), pick next lead from campaign queue (round-robin / random from seed pool is acceptable for prototype)
4. Transition → `connected`; show lead card + script workspace
5. Operator works script → qualification → optional schedule → **Finalizar Atendimento**
6. Persist history row; clear diagnosis; if still automatic → back to `searching` for next lead
7. Operator may leave dialer; returning to panel does not clear campaign selection

### 3.3 Campaign model

| Field | Example |
|-------|---------|
| `id` | `"1"` |
| `name` | Campanha Padrão |
| `status` | `active` \| `paused` |
| `leads` | total contacts |
| `completed` | contacts worked |
| `progress` | % |

Metrics on panel (Total de Ligações, Contatos Hoje, Duração Média, Reuniões Agendadas) must **update from session activity**, not remain static seed forever.

### 3.4 IMP gap

Campaign list exists on Painel but selection is not passed to Discagem; “Iniciar discagem” is a no-op.

---

## 4. Manual dialing flow

### 4.1 Preconditions

Operator status = `atendimento`.

### 4.2 Flow

1. Open Ligação Manual
2. Require:
   - Phone number (non-empty)
   - Contact type: **Telefone Fixo** \| **WhatsApp**
3. On **Iniciar Ligação** → `{ status: 'searching', mode: 'manual', contactMethod, currentLead: synthetic lead }`
4. Simulate connect (~3s) → `connected` with company label `"Manual"` if no CRM match
5. Same script / qualification / completion path as automatic
6. After finalize → return to manual form (`idle`), not auto-search

### 4.3 IMP gap

Manual route exists but is missing from DialerLayout nav; button is a stub; no form.

---

## 5. Sales script flow

### 5.1 Workspace tabs (while `connected`)

| Tab ID | Label | Purpose |
|--------|-------|---------|
| `company` | (default lead/company panel) | Protocol, identifier, CNPJ, address, phone, company |
| `script` | Script de Abordagem | Guided HTML script with interactive radios |
| `questions` | Questionamentos Padrão | Objection / standard Q&A reference |
| `diagnosis` | Anotações de Diagnóstico | Structured capture form |

### 5.2 Opening script content (seed)

Live product ships a templated opener (`nw`):

- Greeting with `[AGENTE]`, `[EMPRESA]`, `[EMPRESA_PROSPECT]`, `[PRODUTO/SERVIÇO]`
- Ask for 2 minutes
- Branch SIM / NÃO

Prototype should render this (or equivalent) and allow placeholder substitution from agent + lead.

### 5.3 Script interactive questions (drive diagnosis)

Radio groups in script HTML sync into diagnosis state:

| Script control `name` | Diagnosis fields |
|----------------------|------------------|
| `equipe` | `employees` ∈ `1-5` \| `6-20` \| `21-50` \| `50plus`; `companySize` ∈ `micro` \| `pequena` \| `media` |
| `faturamento` | `monthlyRevenue` ∈ `ate-200k` \| `200k-500k` \| `500k-800k` \| `acima-800k` |
| `decisao` | `partnerPresence` ∈ `nao` \| `sim` (first radio = não decisor) |
| `priority` | `priority` (pain prioritization) |

Additional free-text diagnosis fields: `painPoints`, `needs`, `objections`, `extraObservations`, `conversationSummary`.

### 5.4 IMP gap

No script UI at all.

---

## 6. Qualification rules

### 6.1 Disposition catalog (required on completion)

| ID | Label | Color intent |
|----|-------|--------------|
| `interested` | Em negociação WhatsApp | green |
| `callback` | Agendamento / Retorno | blue |
| `no_contact` | Sem contato / Ligação caiu | yellow |
| `no_interest` | Sem interesse | red |
| `wrong_number` | Telefone incorreto / Engano | blue-dark |
| `deceased` | Falecido | black |
| `sold` | Venda feita por telefone | green-dark |

### 6.2 Rules

1. A disposition **must** be selected before finalizing a connected call.
2. `callback` / schedule path: enable **Agendar Reunião** (see §8).
3. `no_contact`, `wrong_number`, `deceased`: diagnosis fields optional (lightweight completion allowed).
4. `interested`, `sold`, `callback`: encourage / require diagnosis notes + sales thermometer (prototype: soft-required with validation message).
5. History stores `qualification` label + structured `diagnosis` object.

### 6.3 Secondary result labels (history filters / Dialer legacy)

Also appear in live history samples: `Atendida`, `Interessado`, `Agendado`, `Sem Interesse`, `Caixa postal pré-atendimento`, `Caixa postal pós-atendimento`.

Prototype mapping suggestion:

| Disposition | History “Situação” |
|-------------|-------------------|
| connected + any finish | Atendida (or disposition label) |
| `callback` + meeting saved | Agendado |
| `interested` | Interessado |
| `no_interest` | Sem Interesse |
| `no_contact` | Caixa postal / Sem contato |

### 6.4 IMP gap

History shows static labels only; no disposition picker.

---

## 7. Conditional fields

### 7.1 Visibility / enablement

| Condition | UI effect |
|-----------|-----------|
| Call not `connected` | Disable **Agendar Reunião**, **Finalizar**; script tabs read-only or hidden |
| Disposition ≠ schedule-related | Hide / soft-hide scheduling CTA emphasis |
| Script radio answered | Prefill matching diagnosis selects |
| `partnerPresence === 'nao'` | Show note / follow-up hint that partner/decisor must be reached (prototype: callout) |
| Manual mode | Show phone + method fields; hide auto-search chrome |
| Campaign `paused` | Cannot start auto dial from that campaign |

### 7.2 Diagnosis form fields (always available when connected)

- Porte / company size (derived)
- Faturamento mensal estimado (select)
- Nº de colaboradores (select)
- Decisor presente (sim/não)
- Priority / pain
- Textareas: dores, necessidades, objeções, observações, resumo/feeling

### 7.3 Sales thermometer (completion modal)

Range `0–100` step `5`:

| Value | Label |
|-------|-------|
| ≤ 30 | Frio |
| ≤ 65 | Morno |
| > 65 | Quente |

Stored with attendance payload for closer handoff.

### 7.4 IMP gap

None of the conditional behavior exists.

---

## 8. Scheduling logic

### 8.1 Entry points

1. From connected call: **Agendar Reunião** (disabled until `connected`)
2. Opens scheduling surface (live: `/scheduling` new tab; **IMP: in-module modal or `/modules/bdr/agendar`**)
3. Agenda list page: **Agendamentos Realizados**

### 8.2 Meeting record

```ts
{
  id: string,
  leadName: string,
  company?: string,
  date: string,       // YYYY-MM-DD
  time: string,       // HH:mm
  endTime?: string,
  notes?: string,
  sourceCallId?: string,
  createdAt: string
}
```

### 8.3 Rules

1. Date ≥ today (prototype: block past dates).
2. Start time required; optional end time (Scheduling page has Hora Início / Hora Fim).
3. Saving a meeting:
   - Appends to agenda store
   - Suggests / sets disposition `callback`
   - Increments “Reuniões Agendadas” metric
4. Conflicts: prototype may warn on same operator overlapping slot (nice-to-have).
5. Agenda page lists meetings newest-first; link back to related history row if available.

### 8.4 IMP gap

Static fake list; no create flow from a call.

---

## 9. Call completion

### 9.1 “Finalizar Atendimento” payload

```ts
{
  phone: string,
  company: string,
  qualification: string,          // disposition label
  qualificationId: string,
  duration: number,               // seconds
  method: 'Telefone Fixo' | 'WhatsApp',
  timestamp: string,              // pt-BR locale ok for prototype
  notes: string,
  diagnosis: {
    companySize, monthlyRevenue, employees, partnerPresence,
    priority, painPoints, needs, objections,
    extraObservations, conversationSummary,
    salesTemperature: number,     // 0–100
    salesTemperatureLabel: 'Frio' | 'Morno' | 'Quente'
  },
  campaignId: string,
  mode: 'automatic' | 'manual',
  protocol?: string,
  leadName?: string
}
```

### 9.2 Post-complete actions

1. Prepend to call history (session store)
2. Update campaign `completed` / `progress`
3. Update panel metrics
4. Reset diagnosis + script field state
5. Auto mode → `searching` next; Manual → `idle` form

### 9.3 IMP gap

No completion form or persistence.

---

## 10. History

### 10.1 List columns (target)

Date/Hora · Cliente · Telefone · Duração · Situação · Status Cliente · Ações (view detail)

### 10.2 Filters

- Filtrar por Situação da Ligação
- Filtrar por Status do Cliente

### 10.3 Seed + live

Prototype may ship seed rows, but **every new completion must appear immediately** in the same session.

### 10.4 IMP gap

Four hard-coded rows; no filters; no detail; not wired to dialer.

---

## 11. Permissions

### 11.1 Platform gate (already in IMP)

Effective module access = `customer.modulesEnabled ∩ user.assignedModules`.  
Route `/modules/bdr/*` requires module `bdr` + role `imp`.

Demo: login `bdr` / `bdr` → Bruno Lima + BDR.

### 11.2 Dialer-specific permissions (to add for realistic simulation)

| Key | Intent |
|-----|--------|
| `bdr.operate` | Enter dialer, change own status, dial |
| `bdr.history.self` | View own call history |
| `bdr.history.team` | View team history (admin/supervisor demo) |
| `bdr.campaigns.select` | Select/start campaigns |
| `bdr.schedule` | Create meetings |
| `bdr.scripts.view` | View scripts (always on for operate) |

**Prototype minimum:** all BDR users get `bdr.operate` + self history + schedule + campaign select. Catalog entries can be UI-only until backend exists.

### 11.3 Status vs role

Live product distinguishes BDR vs SDR dashboards (`onProfileChange` → `/sdr-dashboard`). IMP prototype can keep a single BDR operator path; do not block on SDR unless demo requires it.

### 11.4 IMP gap

Only module-level gate; no `bdr.*` keys; Manual nav inconsistency.

---

## 12. Screen map (target vs current)

| Screen | Live CRM IMP | Current IMP | Prototype must |
|--------|--------------|-------------|----------------|
| Painel / BDRDashboard | Metrics, status FSM, campaigns, CTAs | Visual shell | Wire FSM, metrics, campaign persistence, gated CTAs |
| Discagem automática | `SDRDialer?mode=automatic` | Stub | Full sim lifecycle + script |
| Ligação manual | `SDRDialer?mode=manual` | Stub | Form + same workspace |
| Histórico | CallHistory + filters | Static list | Session store + filters |
| Agenda | ScheduledMeetingsHistory | Static list | List + create from call |
| Scheduling | Scheduling page | Missing | Modal or route |
| Dialer chrome | Sidebar + timer | DialerLayout | Live timer + Manual in nav |

---

## 13. What must be implemented in the IMP prototype

### P0 — Must have (behavior simulation)

1. **Shared dialer session store** (React context): operator status, campaign id, call session, history[], meetings[], metrics.
2. **Operator status FSM** with transition matrix and timer binding.
3. **Automatic dialing loop**: searching → connected → finalize → next.
4. **Manual dialing**: number + method → same connected workspace.
5. **Connected workspace**: lead card + 4 tabs (company / script / questions / diagnosis).
6. **Disposition picker** + finalize modal (thermometer + diagnosis textareas).
7. **Conditional enablement**: dial CTAs, schedule button, campaign paused rules.
8. **Scheduling create** from connected call → agenda list update.
9. **History** fed by completions + basic filters.
10. **Gate**: dial actions only in `atendimento`; module access unchanged.

### P1 — Should have

1. Script radios → auto-fill diagnosis selects.
2. Campaign progress counters updating live.
3. Manual entry in DialerLayout sidebar.
4. Permission catalog keys `bdr.*` (even if always granted in demo).
5. Detail drawer for a history row (notes + diagnosis).

### P2 — Nice to have / explicit non-goals

1. Real telephony, recordings, WhatsApp API.
2. SSO / embed of external acelereseucrescimento domain.
3. Supervisor wallboard, QA scoring.
4. Full script CMS / objection library editor.
5. Durable backend persistence (sessionStorage acceptable for prototype).

---

## 14. Acceptance criteria (demo script)

1. Login `bdr`/`bdr` → open Discagem Automática module.
2. Status starts Desconectado; Discagem Automática disabled.
3. Transition to Em atendimento; timer runs; start auto dial.
4. After ~3s a lead appears; script tabs usable; Agendar disabled until connected (already connected → enabled).
5. Select disposition, fill thermometer, finalize → row appears in Histórico; metrics tick up; next search starts.
6. Switch to manual; dial a number via WhatsApp path; complete with Sem interesse.
7. From a connected call, schedule a meeting → appears under Agenda.
8. Attempt illegal status jump (e.g. Desconectado → Intervalo) → blocked.
9. Set Intervalo → dial CTAs disabled.

---

## 15. Implementation notes for engineers

- Prefer one `BdrSessionContext` under `DialerLayout` so Painel / Discagem / Manual / Histórico / Agenda share state.
- Keep Portuguese UI labels aligned with live product.
- Do **not** `window.open` external BDR URL (product direction: stay inside IMP).
- Handover doc § Discagem Automática / external launch is **superseded** by this spec for prototype behavior.
- Seed data may mirror live campaigns `u0` and lead pool `YN` for demo continuity.

---

## 16. Traceability

| Topic | Primary live source | IMP files today |
|-------|---------------------|-----------------|
| Operator states | `BDRDashboard.tsx` | `Bdr.jsx` |
| Call lifecycle | `SDRDialer.tsx` | `bdr/Discagem.jsx`, `Manual.jsx` |
| Auto dial | `SDRDialer` mode=automatic | stub |
| Scripts | `SDRDialer` + embedded HTML | none |
| Qualification | disposition array `Vw` | history labels only |
| Conditional fields | script radios → `De` state | none |
| Scheduling | `Scheduling.tsx` + dialer CTA | `Agendamentos.jsx` static |
| Completion | finalize modal + history push | none |
| History | `CallHistory.tsx` | `Historico.jsx` |
| Permissions | role menus BDR/SDR | `access/index.js` module gate |
