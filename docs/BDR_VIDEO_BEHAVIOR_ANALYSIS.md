# BDR Current Operation — Video Behavior Analysis

**Document type:** Operator-workflow capture vs as-is functional baseline  
**Baseline:** `docs/BDR_FUNCTIONAL_SPECIFICATION.md`  
**Video source (actual path):** `docs/video/bdr-current-operation.MP4`  
**Companion text:** `docs/video/bdr-current-operation.txt` (**empty — 0 bytes**; no narration/transcript available)  
**Requested path note:** User referenced `docs/videos/…`; repository stores artifacts under `docs/video/` (singular).  
**Analysis date:** 31 July 2026  
**Method:** Frame sampling of ~273s / 1280×720 / 30 fps recording (photo-of-monitor); no code changes.

**Scope:** Document every screen, user action, navigation step, and visible business rule in the video, then list differences vs the functional specification (current code behavior as reverse-engineered).

---

## 0. Video timeline overview

| Approx. time | Phase |
|--------------|--------|
| 0:00–0:05 | Login (`bdr`) → Entrar no Sistema |
| 0:05–1:00 | BDR Dashboard — status `Desconectado`, campaign selected, explore CTAs |
| 1:00–1:18 | Set `Em atendimento`; attempt dial; status gate / `Indisponível` shown; return to `Em atendimento`; start **Discagem Automática** |
| 1:18–1:24 | Searching: **Aguardando ligação…** → connect |
| 1:24–2:00 | Connected call #1 — MAURICAR / João Silva Santos / `(11) 99975-9506` |
| 1:24–2:50 | Tabs: Dados da Empresa → Script → (pain / decisão / confirmação) → Agendar Reunião / calendar |
| 2:10–3:00 | Anotações de Diagnóstico + Termômetro + **Finalizar Atendimento** |
| 3:08–3:20 | Connected call #2 — TECH SOLUTIONS / Maria Oliveira Costa / `(21) 3333-4444` (post-finalize auto next) |
| 3:16–3:25 | **Ligação Manual** modal (phone + Telefone Fixo / WhatsApp) |
| 3:30–3:45 | Call History filters + seed rows + recording actions |
| 3:45–3:55 | Meetings / calendar day view (Ouvir Gravação, Anotações, Reenviar Email) |
| 3:55–4:33 | Return to dashboard; demo status `Desconectado` → `Em intervalo` / status toggles; left sidebar chrome |

---

## 1. Every screen shown

### 1.1 Login (`/`)

- Brand: orange **IMP** mark, **CRM IMP**, subtitle **Sistema de Gestão de Leads**
- Fields: **Usuário**, **Senha**
- CTA: **Entrar no Sistema**
- Footer hint: **CREDENCIAIS DE TESTE:** `BDR: bdr / bdr`, and **SDR:** `sdr / sdr` (partially visible)

### 1.2 BDR Dashboard (`/dashboard`)

- Header: **Tempo em atendimento** (`HH:MM:SS`), role **BDR - Prospecção / Operador**, **Sair**
- KPI cards:
  - **Total de Ligações** = `156` (+12% vs semana anterior)
  - **Ligações Hoje** = `23` — **Meta: 30 ligações**
  - **Duração Média** = `3m 45s` — Última semana
  - **Reuniões Agendadas** = `4` — **Meta: 10 agendamentos**
- Operator status row: **Desconectado** | **Em atendimento** | **Em intervalo** | **Indisponível**
- **Campanhas Ativas:**
  - Campanha Padrão — **Selecionada**, `89 de 245 leads`, **36%**
  - Prospecção Fria - Região Sul — **Ativa**, `234 de 512 leads`, **46%**
  - Third campaign badge **Pausada** (partially visible)
- **Ações Rápidas:** Discagem Automática | Ligação Manual | Ver Histórico de Chamadas | Agendamentos Realizados
- Collapsible left sidebar (later frames): items such as Contato Telefônico, Redes Sociais, Relatório, Atendimentos, Falar IA, etc.

### 1.3 Automatic dialer — searching

- Title: **Discagem Automática**
- Subtitle theme: gerenciamento de leads frios e qualificação
- Orange status bar: **Aguardando ligação…**
- Elapsed timer (**Tempo decorrido**)
- Buttons: **Agendar Reunião** (muted while waiting), **Desligar**
- **Voltar** control (top right)

### 1.4 Automatic dialer — connected (call workspace)

- Green status bar: **Falando** + full phone number + elapsed timer
- Tabs:
  1. **Dados da Empresa**
  2. **Script de Abordagem**
  3. **Questionamentos Padrão** (visible; not opened in this recording)
  4. **Anotações de Diagnóstico**
- Footer CTAs: **Agendar Reunião** | **Desligar**

**Lead #1 (MAURICAR) — Dados da Empresa**

| Field | Value shown |
|-------|-------------|
| Protocolo | `20260709232300232872` |
| Identificador / Razão Social | MAURICAR AUTOMOVEIS LTDA |
| CNPJ | `12.345.678/0001-90` |
| Nome do Sócio | João Silva Santos |
| CPF do Sócio | `305.917.078-96` |
| Email | `contato@mauricar.com.br` |
| Endereço | Avenida Paulista 1000 |
| Phone (header) | `(11) 99975-9506` |

**Lead #2 (TECH SOLUTIONS) — after finalize**

| Field | Value shown |
|-------|-------------|
| Protocolo | `20260709232300232873` |
| Company | TECH SOLUTIONS BRASIL LTDA |
| Contact | Maria Oliveira Costa |
| CNPJ | `98.765.432/0001-10` |
| Email | `contato@techsolutions.com.br` |
| Endereço | Rua das Flores 500 |
| Phone (header) | `(21) 3333-4444` |

### 1.5 Script de Abordagem (connected)

Visible script blocks in the recording:

1. Pain discovery — three common entrepreneur situations (lucro / vendas / dependência do dono) + `[RESPOSTA]`
2. **VER DORES DOS EMPRESÁRIOS** — expandable checkboxes:
   - Lucro — “O dinheiro entra, mas não sobra”
   - Vendas / Crescimento
   - Gestão — “Vivo apagando incêndios”
   - Liderança — “A equipe depende de mim”
3. Decision dynamics question — who participates in strategic decisions
4. Branch cards: **`[Se decide sozinho]`** vs **`[Se a decisão é compartilhada]`** with `[CLIENTE]` placeholders
5. **PERGUNTAS DE QUALIFICAÇÃO** — e.g. faixa de faturamento
6. **CONFIRMAÇÃO FINAL** — ask email for invite; placeholders `[CLIENTE]`, day-of-week, `[HORA:MIN]`; close script

### 1.6 Scheduling / calendar

- Month grid **julho de 2026**; days 16–18 highlighted
- **Horários** panel: funcionamento **9:00–18:00**, intervalo **30 min**
- **Agendamentos Confirmados** list (seed cards), e.g.:
  - João Silva Santos / MAURICAR / 15/07/2026 10:00 / protocol `…2872`
  - Maria Santos / TECH SOLUTIONS / 16/07/2026 14:30 / protocol `…2873`
  - Cliente Novo / Empresa Exemplo / 17/07/2026 11:00 / ID `N/A`
- Day detail view: selected date label; meeting card with **Ouvir Gravação**, **Anotações**, **Reenviar Email**

### 1.7 Anotações de Diagnóstico

- Section **Qualificação do Negócio** (selects):
  - Porte da empresa (e.g. Pequena 6–49)
  - Nº de colaboradores (e.g. 6 a 20)
  - Presença do(s) sócio(s)? Sim / Não
  - Faturamento mensal estimado (e.g. R$ 200–500 mil)
  - Prioridade no momento (e.g. Média)
- **Diagnóstico / Dores dos Empresários** colored tags
- **Diagnóstico Profundo** textareas: problemas/gargalos; necessidades
- **Percepção da conversa:** observações extras; resumo / feeling do lead (handoff to Closer)
- **TERMÔMETRO DE VENDA** slider (e.g. 50% / 60% — **Morno**; BAIXA→ALTA)
- Primary submit: **Finalizar Atendimento**

### 1.8 Ligação Manual modal

- Title **Ligação Manual** + close **X**
- **Número de Telefone** (mask `(11) 99999-9999`)
- **Tipo de Contato:** Telefone Fixo | WhatsApp
- **Iniciar Ligação**

### 1.9 Call History

- Filters:
  - **Filtrar por Situação da Ligação** — Todas; Atendida; Não atendida; Abandonada; Caixa postal pré-atendimento; Fora do horário; Caixa postal pós-atendimento; Falha
  - **Filtrar por Status do Cliente** — Todos os status
- Table columns: Hora, Cliente, Telefone, Duração, Situação, Status Cliente, Ações
- Seed rows (examples): João Silva / Interessado; Maria Santos / Sem Interesse; Carlos Oliveira / Agendado
- Row actions: notes, contact, **play recording**, download recording

---

## 2. Every user action (observed)

Ordered by appearance in the recording:

1. Enter / confirm credentials `bdr` / `bdr`
2. Click **Entrar no Sistema**
3. Hover / inspect dashboard KPIs, campaigns, quick actions while **Desconectado**
4. Hover status buttons (tooltips such as status labels / **Status atual**)
5. Click **Em atendimento** (timer starts)
6. Hover **Ligação Manual** / **Discagem Automática** while ready
7. Experience dial CTA **disabled** while status is **Indisponível** (prohibited cursor)
8. Return to **Em atendimento**
9. Click **Discagem Automática**
10. Observe searching (**Aguardando ligação…**) then auto-connect
11. Review **Dados da Empresa** for MAURICAR
12. Open **Script de Abordagem**; scroll script
13. Interact with **VER DORES** checkboxes / expanders
14. Select decision-branch path (sozinho vs compartilhada)
15. Reach **CONFIRMAÇÃO FINAL**; hover **Agendar Reunião**
16. Open scheduling / calendar; view confirmed appointments; select date(s)
17. Open **Anotações de Diagnóstico**; change qualification selects; toggle pain tags
18. Fill / scroll deep diagnosis + perception text areas
19. Drag **Termômetro de Venda** (≈50% → ≈60% Morno)
20. Click **Finalizar Atendimento**
21. Land on next auto-connected lead (TECH SOLUTIONS) — company tab
22. Open **Ligação Manual** UI; focus phone field; view contact types
23. Open **Ver Histórico de Chamadas**; expand situação filter; hover client-status filter; hover play-recording
24. Open appointments / day view; hover meeting actions
25. Return to dashboard (**Desconectado** observed)
26. Toggle status to **Em intervalo** (and hover other statuses) as end-of-demo status FSM exercise
27. Expand / glance left sidebar menu items

**Not clearly performed in video:** open **Questionamentos Padrão** tab content; complete a full manual call start; pick an explicit disposition chip from catalog `Vw` (interested / callback / no_contact / …); logout.

---

## 3. Every navigation step

```text
Login (/)
  → BDR Dashboard (/dashboard)
       → [status Em atendimento]
       → Discagem Automática (/sdr-dialer?mode=automatic inferred)
            → searching UI
            → connected workspace (same dialer route)
                 → tab: Dados da Empresa
                 → tab: Script de Abordagem
                 → Agendar Reunião → Scheduling / calendar surface
                      → Agendamentos Confirmados list
                 → tab: Anotações de Diagnóstico
                 → Finalizar Atendimento
            → connected workspace again (next lead, same dialer)
       → Ligação Manual modal (from dialer or dashboard path)
       → Ver Histórico de Chamadas (/history)
       → Agendamentos / meetings day view (/scheduled-meetings or scheduling)
  → BDR Dashboard again
```

Cross-page notes from video:

- Dialer exposes **Voltar** (return toward dashboard / prior surface).
- Scheduling appears as a dedicated calendar/agenda UI after **Agendar Reunião** (consistent with new-tab or route change; exact chrome not fully captured).
- Manual dial appears as a **modal** overlay in the late segment (not only a full-page form).

---

## 4. Every business rule visible in the video

| # | Rule (as shown) |
|---|-----------------|
| 1 | Access requires Usuário + Senha; demo credentials advertised on login |
| 2 | Successful `bdr` login lands on BDR operator dashboard |
| 3 | Default / initial operator status is **Desconectado**; attendance timer at `00:00:00` |
| 4 | Entering **Em atendimento** starts **Tempo em atendimento** |
| 5 | Status tooltips distinguish current vs non-current statuses (**Status atual**) |
| 6 | Dial CTAs (**Discagem Automática**, **Ligação Manual**) are blocked when status is **Indisponível** (disabled + prohibited cursor) |
| 7 | One campaign is **Selecionada**; others may be **Ativa** or **Pausada** |
| 8 | Campaign progress is shown as completed/total leads + % |
| 9 | Daily goals are displayed (30 calls, 10 meetings) against current counters |
| 10 | Auto dial shows a wait/search state before connect |
| 11 | Search wait is short (~2–3s observed before **Falando**) |
| 12 | While searching, **Agendar Reunião** is not treated as primary/enabled |
| 13 | When connected, header shows **Falando** + dialed number + elapsed call timer |
| 14 | Connected workspace always offers company / script / objections / diagnosis tabs |
| 15 | Script uses placeholders (`[AGENTE]`-style / `[CLIENTE]`, `[RESPOSTA]`, time placeholders) and branching talk tracks |
| 16 | Pain categories (Lucro, Vendas, Gestão, Liderança) are multi-select |
| 17 | Diagnosis captures porte, headcount, partner presence, revenue, priority, pains, free text, closer handoff notes |
| 18 | Sales thermometer is continuous 0–100 with at least band label **Morno** mid-scale (BAIXA→ALTA) |
| 19 | **Finalizar Atendimento** ends the attendance form and advances the dialer to another lead automatically |
| 20 | Auto-connected companies match the known demo pool (MAURICAR then TECH SOLUTIONS) — random-with-replacement style, not campaign-queue exhaustion |
| 21 | Manual path requires phone number + contact channel (Telefone Fixo / WhatsApp) before **Iniciar Ligação** |
| 22 | History separates technical **Situação da Ligação** from commercial **Status do Cliente** |
| 23 | History exposes recording play/download affordances |
| 24 | Scheduling respects business hours panel **9:00–18:00** and **30 min** slot/interval display |
| 25 | Confirmed meetings show contact, company, date, time, protocol/ID |
| 26 | Operator can manually move among Desconectado / Em atendimento / Em intervalo / Indisponível on the dashboard |

---

## 5. Differences: video behavior vs `BDR_FUNCTIONAL_SPECIFICATION.md`

Legend:

- **Match** — video confirms the spec  
- **Clarify** — same capability, different label/UX detail  
- **Gap (video)** — in spec, not shown in this recording  
- **Gap (spec)** — visible in video, thin or missing in the written baseline  
- **Conflict** — apparent disagreement (investigate before migration)

### 5.1 Matches (video confirms baseline)

| Topic | Spec | Video |
|-------|------|-------|
| Auth demo user | `bdr` / `bdr` → `/dashboard` | Confirmed |
| KPI seed values | 156 / 23 / 3m 45s | Confirmed (+ meetings `4`) |
| Campaign seeds `u0` | Padrão 36%, Sul 46%, Pausada | Confirmed |
| Status catalog | 4 states | Confirmed |
| Dial gated on `atendimento` | CTAs disabled otherwise | Confirmed when **Indisponível** |
| Auto search delay | ~3s then connect | ~2–3s observed |
| Lead pool `YN` | MAURICAR, TECH SOLUTIONS, … | Both appear as connected leads |
| Dialer tabs | company / script / questions / diagnosis | Labels match PT product copy |
| Script branching + pains | radios / diagnosis bridge | Visible in script + diagnosis tags |
| Thermometer bands | Frio / Morno / Quente | **Morno** shown at 50–60% |
| Finalize → next auto search | Always restart automatic searching | Call #2 TECH SOLUTIONS after finalize |
| Manual channels | Telefone Fixo \| WhatsApp | Confirmed |
| History filters `Sw` | Same situação list | Confirmed |
| History seed names | João / Maria / Carlos style | Confirmed on history page |
| No real telephony | Simulated connect | UI-only **Falando** / timers |

### 5.2 Clarifications (label / presentation differences)

| Topic | Spec wording | Video wording / UI |
|-------|--------------|--------------------|
| Search state copy | “Procura Automática” / system searching numbers | Orange bar: **Aguardando ligação…** |
| Connected state copy | `call.status = connected` | Green bar: **Falando** + number |
| Company tab id | `company` | **Dados da Empresa** |
| Hang-up control | Emphasizes **Finalizar Atendimento** | Persistent **Desligar** during search + connected; finalize is separate on diagnosis |
| Thermometer placement | “Completion modal also captures…” | Inline on **Anotações de Diagnóstico** above **Finalizar Atendimento** (no separate modal captured) |
| Manual dial surface | `/sdr-dialer?mode=manual` form | Late video shows **Ligação Manual** as a **modal** |
| Lead card fields | phone, name, company, email, address, city, state, cep, cnpj, protocol | Video company card also stresses **Identificador**, **Razão Social**, **Nome/CPF do Sócio** (city/CEP not prominent in sampled frames) |

### 5.3 Gaps — in specification, not demonstrated in video

| Spec item | Video observation |
|-----------|-------------------|
| Full adjacency matrix tooltips (“Transição indisponível…”) | Only partial tooltips (**Status atual**, status name); illegal-transition disabled states not exhaustively exercised |
| Hardcoded 5s auto → `indisponivel` | Strongly suggested (ready → dial blocked on Indisponível within ~10–15s window) but not proven as a single uninterrupted 5.000ms timer in the recording |
| Disposition catalog `Vw` (interested, callback, no_contact, …) | **Not clearly selected** before finalize; outcome UX focuses on diagnosis + thermometer |
| Opening script template `nw` full text | Video shows mid/late script blocks; classic “Você teria 2 minutos…” opener not clearly framed |
| **Questionamentos Padrão** content / `questionamentos.html` categories | Tab present; content never opened |
| SDR role path `/sdr-dashboard` | Login hint shows SDR credentials; SDR journey not taken |
| Campaign click persistence (`localStorage.selectedCampaignId`) | Campaign already selected; reselection not shown |
| Auth failure messages | Not shown |
| Past-date blocking on scheduler | Not proven (operator browses July 2026 future/present grid) |

### 5.4 Gaps — visible in video, under-specified in baseline

| Video detail | Spec coverage |
|--------------|---------------|
| Login on-screen **CREDENCIAIS DE TESTE** (BDR + SDR) | Spec lists users; does not describe on-login credential banner |
| Explicit metas: **30 ligações**, **10 agendamentos** | Metrics listed; goals not spelled as UI rules |
| Dialer title/subtitle “Gerenciamento de leads frios e qualificação” | Implicit |
| **Voltar** on dialer | Not highlighted |
| Scheduling **Horários** box: 9:00–18:00 + 30 min | Spec says date/time + past blocked; hours/interval panel not detailed |
| Meeting day actions: **Ouvir Gravação**, **Anotações**, **Reenviar Email** | Spec mentions list/agenda; these actions absent |
| History row actions (notes / contact / play / download) | Spec mentions placeholder recording URLs; action chrome not fully mapped |
| Rich left nav (Redes Sociais, Relatório, Falar IA, …) | Spec mentions CollapsibleSidebar nested menus briefly |
| Protocol increment across consecutive auto leads (`…872` → `…873`) | Protocols mentioned; sequencing not stated |

### 5.5 Conflicts / migration-critical discrepancies

1. **Disposition (`Vw`) vs video wrap-up**  
   Spec treats disposition selection as a core completion concept. The video completes via diagnosis + thermometer + **Finalizar Atendimento** without an obvious `Vw` picker. Migration must decide whether dispositions are mandatory UI, hidden defaults, or missing from this build path.

2. **Thermometer UI container**  
   Spec: completion modal. Video: inline diagnosis form control. Prefer video layout for UX fidelity unless another build shows a modal.

3. **Search/connected copy**  
   Product language in the live recording is **Aguardando ligação…** / **Falando**, not the compiled-string shorthand in the analysis (“Procura Automática” / `connected`). Treat video strings as operator-facing truth for simulation copy.

4. **Manual dial presentation**  
   Spec models a mode query on SDRDialer; video shows a modal. Both may exist; implementers should not assume only one surface.

5. **Campaign selection vs lead selection**  
   Spec already warns campaigns do not filter `YN`. Video confirms: selected **Campanha Padrão** still yields MAURICAR / TECH SOLUTIONS from the global demo pool — **do not** infer campaign-true queuing from the demo.

6. **Companion `.txt` file**  
   Spec note said no operation video was present at analysis time; video now exists, but the paired `.txt` is empty — this analysis is frame-based only, not transcript-based.

---

## 6. End-to-end operator flow (as filmed)

1. Login as BDR  
2. Land disconnected on dashboard with Campanha Padrão selected  
3. Go **Em atendimento**  
4. (Hit status gate if Indisponível) restore **Em atendimento**  
5. **Discagem Automática** → brief wait → **Falando** with MAURICAR  
6. Read company data → follow guided script (pains, decision branch, final confirmation)  
7. Optionally open scheduling calendar / confirmed meetings  
8. Fill diagnosis + thermometer → **Finalizar Atendimento**  
9. System presents next demo company (TECH SOLUTIONS) automatically  
10. Explore manual dial modal, call history filters/recordings, meetings day tools  
11. Return to dashboard and demonstrate other statuses (e.g. **Em intervalo**)

---

## 7. Migration baseline impact

Use **`BDR_FUNCTIONAL_SPECIFICATION.md`** as the as-built code contract, and this document as the **operator-visible acceptance reference**.

For IMP / reconstruction work:

- Prefer **video copy and screen sequence** for UX wording and tab/CTA layout.  
- Prefer **spec** for hidden timers, seed constant names, adjacency matrix, and non-capabilities (no SIP, no backend queue).  
- Treat **disposition catalog visibility** and **thermometer modal vs inline** as open reconciliation items before implementation.  
- Do **not** implement campaign-filtered dialing unless product explicitly changes the baseline.

**Related:** `docs/BDR_FUNCTIONAL_SPECIFICATION.md`, `docs/BDR_FUNCTIONAL_PROTOTYPE_SPEC.md`

---

## 8. Artifact index

| Artifact | Path |
|----------|------|
| Video | `docs/video/bdr-current-operation.MP4` |
| Text companion (empty) | `docs/video/bdr-current-operation.txt` |
| Functional baseline | `docs/BDR_FUNCTIONAL_SPECIFICATION.md` |
| This analysis | `docs/BDR_VIDEO_BEHAVIOR_ANALYSIS.md` |
