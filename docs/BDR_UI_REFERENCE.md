# BDR UI Reference — Pixel & Behavior Guide (IMP Migration)

**Document type:** Visual/UX reconstruction reference (as-is)  
**Baseline behavior:** `docs/BDR_FUNCTIONAL_SPECIFICATION.md`  
**Primary visual sources:** `docs/screenshots/bdr/*.png` (14 curated captures)  
**Secondary:** `docs/screenshots/bdr/video-frames/` (operation video stills; photo-of-monitor; lower fidelity)  
**Related:** `docs/BDR_VIDEO_BEHAVIOR_ANALYSIS.md`  
**Analysis date:** 31 July 2026  
**Scope:** Layout, navigation, colors, spacing, components, buttons, fields, and interactive states for migrating the BDR automatic-dialing UX into IMP. **Do not invent telephony**; match simulated UI states.

**Capture sizes (approx. desktop viewport):** ~1880–1920 × ~910–945 px (except `12-scripts.png` full-page scroll capture **1920 × 5763**).

---

## 0. Screenshot index → route / state

| File | Screen | Spec route / state | Notes |
|------|--------|--------------------|-------|
| `01-login.png` | Login | `/` logged out | Credential banner visible |
| `02-dashboard.png` | BDR dashboard | `/dashboard` + `desconectado` | Dial CTAs disabled |
| `03-status.png` | BDR dashboard | `/dashboard` + `atendimento` | Dial CTAs enabled; timer running |
| `04-On break.png` | BDR dashboard | `/dashboard` + `intervalo` | Tooltip **Status atual**; dial blocked |
| `05-unavailable.png` | BDR dashboard | `/dashboard` + `indisponivel` | Status red; dial blocked |
| `06-auto-dial.png` | Auto dial searching | `/sdr-dialer?mode=automatic` + `searching` | Orange **Aguardando ligação…** |
| `07-automatic dialing.png` | Auto dial connected | same + `connected` / company tab | Green **Falando**; TECH SOLUTIONS |
| `08-scheduling.png` | Scheduling | `/scheduling` | Calendar + Horários + confirmed list |
| `09-history.png` | Call history | `/history` | Filters + table + row actions |
| `10-Appointments Made.png` | Scheduled meetings | `/scheduled-meetings` | Calendar + empty day panel |
| `11-manual connection.png` | Manual dial modal | Manual overlay on dialer | Phone + channel + Iniciar |
| `12-scripts.png` | Approach script | Dialer tab `script` | Full-page scroll of script HTML |
| `13-standard questions.png` | Objections tab | Dialer tab `questions` | Accordion categories + new-window CTA |
| `14-diagnostic notes.png` | Diagnosis tab | Dialer tab `diagnosis` | Selects + pain tiles + objections |

Canonical **Portuguese UI copy** below is the migration source of truth (image-description English paraphrases must not be used as labels).

---

## 1. Design system tokens

### 1.1 Theme / fonts (from functional spec + screenshots)

| Token | Value / note |
|-------|----------------|
| Product name | CRM IMP — Sistema de Gestão de Leads |
| Shell brand (sidebar) | CRM IMP GROUP |
| `theme-color` | `#f59e0b` |
| Fonts | Space Grotesk + Inter + JetBrains Mono (timers / protocol numbers feel mono-adjacent) |
| Icon style | Lucide-like outline icons |
| Utility theme | Tailwind graphite / slate dark + custom `graphite-*`, `teal-signal-*` |

### 1.2 Color palette (sampled from PNGs)

Use these as target tokens; slight anti-alias variance (±8) is expected.

| Role | Hex (approx.) | Where used |
|------|---------------|------------|
| Page void / dialer bg | `#0f172a` | Dialer, history body, meetings |
| App chrome / deep surface | `#111827` | KPI cards, table body, scheduling void |
| Sidebar / elevated chrome | `#1f2937` | Sidebar, headers, cards |
| Panel / modal surface | `#1e293b` | Dialer content panel, modal body |
| Input / control fill | `#334155` / `#374151` | Inputs, selects, channel chips |
| Border / muted stroke | `#374151`–`#485060` | Cards, dividers |
| Text primary | `#ffffff` | Titles, values |
| Text secondary | `#94a3b8`–`#64748b` | Labels, placeholders, meta |
| Brand / primary CTA | `#f59e0b` / `#f09808` | Login button, logo tile, accents |
| Selected / warning amber | `#f59e0b` family + dark amber fills `#785820`–`#906818` | Campaign selected border, status Desconectado / Intervalo highlights, calendar selected day |
| Ready / connected green | `#18b050`–`#22c55e` | Status Em atendimento, **Falando** bar |
| Unavailable / danger dark | `#581828` family | Status Indisponível active fill |
| Hang up / destructive | `#e84040`–`#ef4444` | **Desligar** |
| Schedule CTA | `#d87000`–`#f59e0b` | **Agendar Reunião** (enabled) |
| Searching banner | `#f87810`–`#f09808` | **Aguardando ligação…** bar |
| Link / identifier blue | sky/blue on company identifier | Dados da Empresa |
| Positive delta | green text | `↑ 12% vs semana anterior` |
| Progress fill | teal / cyan → green gradient | Campaign bars |
| Script section headers | bright blue | Script H2s |
| Script `[RESPOSTA]` / tags | red chip | Script wait markers |
| Placeholder vars | light cyan/sky | `[CLIENTE]`, `[BDR]`, etc. |
| Modal scrim | `#070b15` @ high opacity | Behind Ligação Manual |

### 1.3 Spacing & shape

| Token | Guidance from screenshots |
|-------|---------------------------|
| Page padding | ~24–32 px from content to chrome edges |
| Card radius | ~8–12 px |
| Button radius | ~8–10 px |
| Input radius | ~6–8 px |
| Status pill radius | full-ish / large rounded rect |
| Grid gutter | ~16–20 px between KPI cards / campaign vs actions |
| Card internal padding | ~16–24 px |
| Section vertical rhythm | ~16–24 px between stacked blocks; script sections ~24–32 px |
| Dialer footer CTA pair | equal-width split with ~12–16 px gap |
| Dense empty dialer searching | large bottom whitespace; focus band mid-upper |

### 1.4 Typography scale (relative)

| Level | Use |
|-------|-----|
| Display / page title | ~24–32 px bold white (Discagem Automática, Histórico…) |
| Subtitle | ~13–14 px muted |
| KPI number | ~28–36 px bold; color-coded (white / amber / green) |
| KPI label | small muted uppercase-ish / sentence |
| Section H2 | script: blue ALL CAPS |
| Body | ~14–15 px white / light gray |
| Label (field) | ~11–12 px muted, often ALL CAPS on diagnosis |
| Timer | tabular / mono feel `00:00:00` or `MM:SS` |

---

## 2. Global layout & navigation

### 2.1 App shell (authenticated)

```
┌────────┬──────────────────────────────────────────────────────────┐
│ Sidebar│ Header utilities (timer / role / Sair) — page dependent  │
│ CRM    ├──────────────────────────────────────────────────────────┤
│ icons  │                                                          │
│ +      │              Main content                                │
│ collapse│                                                          │
└────────┴──────────────────────────────────────────────────────────┘
```

**Sidebar**

- Collapsible left rail (`CollapsibleSidebar`).
- Expanded: **CRM IMP GROUP** + nested groups (**Prospecções**, **Repositório**, **Treinamentos**, …) with chevrons.
- Collapsed: icon stack only (grid / document / briefcase / …) + circular chevron to expand.
- Active module visual weight on Prospecções when on BDR surfaces.

**Header utilities (dashboard)**

- Right cluster: **Tempo em atendimento** boxed timer · **BDR - Prospecção** / **Operador** · **Sair**.

**Dialer / secondary pages**

- Title + muted subtitle left; **← Voltar** pill button top-right.
- Sidebar usually remains visible (collapsed).

**Login**

- No sidebar; full-bleed branded void + centered card.

### 2.2 Navigation map (UI)

| From | Control | To |
|------|---------|-----|
| Login | Entrar no Sistema | `/dashboard` (role BDR) |
| Dashboard | Discagem Automática | Dialer automatic searching |
| Dashboard | Ligação Manual | Manual modal or manual dialer mode |
| Dashboard | Ver Histórico de Chamadas | History |
| Dashboard | Agendamentos Realizados | Scheduled meetings |
| Dialer | Voltar | Dashboard (or prior) |
| Dialer connected | Agendar Reunião | Scheduling (often new tab per spec) |
| Dialer questions | Abrir Questionamentos em nova janela | Standalone objections HTML |
| Scheduling | Fechar | Close surface |
| History / Meetings | Voltar | Prior |

Profile switch BDR ↔ SDR exists in product chrome (spec); not isolated in these 14 PNGs.

---

## 3. Screen-by-screen reference

### 3.1 Login — `01-login.png`

**Layout**

- Full viewport dark navy with subtle **diagonal stripe** texture.
- Vertical center stack: orange **IMP** square logo → **CRM IMP** → subtitle → login card.

**Card**

- Rounded dark panel (`#1f2937` / `#374151` family).
- Fields stacked full-width:
  - Label **Usuário** · placeholder `Digite seu usuário`
  - Label **Senha** · placeholder `Digite sua senha`
- Primary button full-width **Entrar no Sistema** (`#f59e0b`, dark text).
- Divider → **CREDENCIAIS DE TESTE:** two-column list (`bdr/bdr`, `sdr/sdr`, `admin/admin`, …).

**States**

| State | Visual |
|-------|--------|
| Default | Empty inputs, ready CTA |
| Error (spec) | Messages: invalid credentials / empty fields — not in PNG |
| Success | Navigate away |

---

### 3.2 BDR Dashboard — `02`–`05`

**Layout**

1. **KPI row** — 4 equal cards  
2. **Status row** — 4 segmented status buttons  
3. **Bottom split** — Campanhas Ativas (~2/3) | Ações Rápidas (~1/3)

**KPI cards** (`#111827` body)

| Card | Value style | Meta |
|------|-------------|------|
| Total de Ligações | white `156` | green `↑ 12% vs semana anterior` |
| Ligações Hoje | amber `23` | `Meta: 30 ligações` |
| Duração Média | white `3m 45s` | `Última semana` |
| Reuniões Agendadas | green `4` | `Meta: 10 agendamentos` |

**Status buttons**

| ID | Label | Active look (from PNGs) |
|----|-------|-------------------------|
| `desconectado` | Desconectado | Amber/gold highlight + yellow/amber dot (`02`) |
| `atendimento` | Em atendimento | Green highlight + green indicator (`03`) |
| `intervalo` | Em intervalo | Amber/orange highlight + pause icon; tooltip **Status atual** (`04`) |
| `indisponivel` | Indisponível | Dark red fill + power icon (`05`) |

Inactive: muted slate fill, reduced contrast icons. Illegal transitions: control remains visible but disabled (spec tooltip **Transição indisponível para o status atual**).

**Campaign list**

- Row: name + progress text `N de M leads` + % + badge + progress bar.
- **Selecionada:** thick amber border + check + amber badge **Selecionada**.
- **Ativa:** teal/green badge.
- **Pausada:** gray badge; bar at 100% for Follow-up Clientes seed.

**Ações Rápidas** — stacked large icon buttons:

1. Discagem Automática  
2. Ligação Manual  
3. Ver Histórico de Chamadas  
4. Agendamentos Realizados  

#### Dashboard states matrix

| Operator status | Timer | Dial CTAs (1–2) | History / Agendamentos (3–4) | Screenshot |
|-----------------|-------|-----------------|------------------------------|------------|
| Desconectado | `00:00:00` | Disabled (ghost) | Enabled | `02` |
| Em atendimento | Running | Enabled | Enabled | `03` |
| Em intervalo | Paused / retained | Disabled | Enabled | `04` |
| Indisponível | Paused / retained | Disabled | Enabled | `05` |

Spec also: ~5s auto-force to Indisponível while Em atendimento (demo logic) — not a unique PNG, but `05` + video confirm dial lock.

---

### 3.3 Dialer searching — `06-auto-dial.png`

**Chrome**

- Title **Discagem Automática**  
- Subtitle **Gerenciamento de leads frios e qualificação**  
- **← Voltar**

**Status band (orange)**

- Left: phone icon + **Aguardando ligação…** (+ ellipsis line)  
- Right: **Tempo decorrido** + `MM:SS` (e.g. `00:01`)

**Footer CTA pair**

- **Agendar Reunião** — muted / disabled while searching  
- **Desligar** — muted / low-contrast maroon (may still be clickable in product; treat as secondary during search)

**Whitespace:** intentionally sparse below CTAs.

**Maps to spec:** `searching` for ~3s then random `YN` lead → connected.

---

### 3.4 Dialer connected — shared chrome (`07`, `12`, `13`, `14`)

**Status band (green `#18b050`+)**

- Left: **Falando** + phone number  
- Right: **Tempo decorrido** + live `MM:SS`

**Tab bar** (active = white label + blue underline)

| Tab | PT label | Icon cue |
|-----|----------|----------|
| company | Dados da Empresa | grid / apps |
| script | Script de Abordagem | chat |
| questions | Questionamentos Padrão | help / clock-style |
| diagnosis | Anotações de Diagnóstico | document |

**Footer CTA pair (enabled)**

- **Agendar Reunião** — orange  
- **Desligar** — red `#ef4444` family  

#### 3.4.1 Dados da Empresa — `07-automatic dialing.png`

Two-column label/value grid on `#1e293b` panel:

| Left | Right |
|------|-------|
| Protocolo | Identificador (link-blue) |
| CNPJ | Razão Social |
| Nome do Sócio | CPF do Sócio |
| Email Principal | Endereço |

Example seed (TECH SOLUTIONS) matches functional pool `YN`.

#### 3.4.2 Script de Abordagem — `12-scripts.png`

Full-page vertical script (migration must preserve scroll length and section order):

1. **ABERTURA** / opening  
2. Pain introduction  
3. **VER DORES DOS EMPRESÁRIOS** — 6 expandable/checkable pain cards with colored accents (Lucro, Vendas, Gestão, Liderança, todos, nenhum)  
4. Priorização / impacto  
5. **CONTEXTO DECISÓRIO** — priority radios + branch cards `[Se decide sozinho]` / `[Se a decisão é compartilhada]`  
6. **PERGUNTAS DE QUALIFICAÇÃO** — faturamento + equipe radios (sync into diagnosis per spec)  
7. Transition / positioning copy  
8. Convite / availability  
9. Suggested agenda + inline **Agendar Reunião**  
10. **CONFIRMAÇÃO FINAL**

Markers: red `[RESPOSTA]` / recording-style chips; placeholders `[CLIENTE]`, `[BDR]`, time tokens in sky blue.

Sticky-feel: green call bar top + orange/red footer remain visible while content scrolls.

#### 3.4.3 Questionamentos Padrão — `13-standard questions.png`

- Top-right blue text button: **Abrir Questionamentos em nova janela** (external).  
- Collapsed accordion categories (counts match spec §5.5):

| Category | Count cue |
|----------|-----------|
| Sobre o produto | (5) |
| Comparação com outros produtos | (2) |
| Sobre a empresa | (5) |
| Preço e investimento | (2) |
| Segurança para avançar | (4) |
| Decisão e alinhamento interno | (2) |
| Objeções de timing e prioridade | (4) |

Each row: colored title + summary snippet + chevron. Reference content, not a hard branch engine (spec).

#### 3.4.4 Anotações de Diagnóstico — `14-diagnostic notes.png`

**Qualificação do Negócio** — 2-col selects (placeholders `Selecione...`):

- Porte da empresa  
- Faturamento mensal estimado  
- Nº de colaboradores  
- Prioridade no momento?  
- Necessária presença do(s) sócio(s)?

**Diagnóstico — Dores dos Empresários** — 2×3 tile buttons (same six themes as script).

**Registro de objeções** — full-width textarea with coaching placeholder.

> Video also shows deeper textareas + **Termômetro de Venda** + **Finalizar Atendimento** below the fold; not fully in `14` crop — implement from video/spec if migrating complete wrap-up.

---

### 3.5 Ligação Manual modal — `11-manual connection.png`

- Scrim darkens dialer underneath.  
- Centered modal `#1e293b` / `#334155` controls.  
- Title **Ligação Manual** + **×** close.  
- **Número de Telefone** — mask placeholder `(11) 99999-9999`.  
- **Tipo de Contato** — stacked choices:
  - **Telefone Fixo** (phone icon; selected = lighter fill)
  - **WhatsApp** (WA icon; green accent on icon)
- Full-width **Iniciar Ligação**.

**Validation (spec):** block start if phone empty or method missing.

---

### 3.6 Scheduling — `08-scheduling.png`

**Header:** **Agendamentos** · **× Fechar**

**Top row**

| Left | Right |
|------|-------|
| **Calendário** month nav `julho de 2026` | **Horários** + gear |
| Day grid Dom–Sab | Funcionamento **9:00 – 18:00** · **Intervalo: 30 min** |
| Selected day: amber rounded border | |

**Bottom:** **Agendamentos Confirmados** — stacked meeting cards:

- Name (bold) · company (muted)  
- Date · phone · time · protocol/ID  
- Card **×** dismiss/remove affordance  

Past dates blocked (spec); selected day accent matches brand amber.

---

### 3.7 Call history — `09-history.png`

**Header:** **Histórico de Chamadas** · **← Voltar**

**Filters** (side by side dropdowns)

1. Filtrar por Situação da Ligação → default **Todas as situações**  
2. Filtrar por Status do Cliente → default **Todos os status**

Situação options (spec `Sw`): Atendida, Não atendida, Abandonada, Caixa postal pré-atendimento, Fora do horário, Caixa postal pós-atendimento, Falha.

**Table columns:** Data/Hora · Cliente · Telefone · Duração · Situação · Status Cliente · Ações  

**Row actions (icon strip):** notes · contact · play recording · download  

Status Cliente pills use blue-tinted text (Interessado, Sem Interesse, Agendado, …).

---

### 3.8 Appointments made — `10-Appointments Made.png`

**Header:** page title · **← Voltar**

**Split:**

- Left: **Calendário** with month nav; selected day amber outline (e.g. 31).  
- Right: **Selecione uma data** empty state — centered muted copy *Select a date on the calendar* / PT equivalent.

When a date has meetings (video): cards with **Ouvir Gravação**, **Anotações**, **Reenviar Email**.

---

## 4. Component catalog

| Component | Anatomy | States |
|-----------|---------|--------|
| Primary button | Solid brand amber, dark label | default / hover / disabled |
| Destructive button | Solid red, white label | default / muted when searching |
| Schedule button | Orange, clock icon | disabled searching · enabled connected |
| Ghost / secondary | Slate fill | Voltar, Fechar |
| Status segment | Icon + label | inactive · active (color per status) · disabled illegal |
| KPI card | label · big number · meta line | static seed in as-is |
| Campaign row | border · badge · bar · % | selected / active / paused |
| Quick action | icon + label full width | enabled / disabled (opacity) |
| Call status band | icon · title · timer | orange searching · green connected |
| Tab | icon + label | inactive muted · active underline |
| Field label + control | muted label over input | empty / filled / invalid (login) |
| Select | slate fill + chevron | placeholder Selecione… |
| Textarea | slate, multi-line | placeholder coaching copy |
| Radio / checkbox | script HTML controls | sync → diagnosis |
| Pain tile | bordered button | idle / selected (colored) |
| Accordion row | title · count · snippet · chevron | collapsed / expanded |
| Badge | small rounded | Selecionada / Ativa / Pausada |
| Progress bar | track + teal fill | 0–100% |
| Modal | title · close · body · primary | open with scrim |
| Table | header row + body + pills + icon actions | filtered |
| Calendar cell | day number | muted / selected amber ring / past disabled |
| Tooltip | small dark tip | **Status atual** |
| Thermometer (video/spec) | slider BAIXA→ALTA | Frio ≤30 · Morno ≤65 · Quente >65 |

---

## 5. Buttons — master list (PT)

| Label | Context | Enabled when |
|-------|---------|--------------|
| Entrar no Sistema | Login | Always (validate on click) |
| Sair | Shell | Authenticated |
| Desconectado / Em atendimento / Em intervalo / Indisponível | Dashboard status | Per adjacency matrix |
| Discagem Automática | Quick actions | `atendimento` |
| Ligação Manual | Quick actions | `atendimento` |
| Ver Histórico de Chamadas | Quick actions | Always (shown) |
| Agendamentos Realizados | Quick actions | Always (shown) |
| Voltar | Dialer / history / meetings | Always |
| Agendar Reunião | Dialer | `connected` (spec); muted in searching PNG |
| Desligar | Dialer | Call session |
| Iniciar Ligação | Manual modal | Phone + method |
| Abrir Questionamentos em nova janela | Questions tab | Connected |
| Fechar | Scheduling | Always |
| Finalizar Atendimento | Diagnosis wrap-up (video) | After form / disposition flow |

---

## 6. Fields — master list

| Field | Screen | Type |
|-------|--------|------|
| Usuário / Senha | Login | text / password |
| Número de Telefone | Manual modal | masked phone |
| Tipo de Contato | Manual modal | Telefone Fixo \| WhatsApp |
| Protocolo, CNPJ, Nome do Sócio, Email, Identificador, Razão Social, CPF, Endereço | Company tab | read-only |
| Script radios (equipe, faturamento, decisão, prioridade…) | Script | radio → diagnosis |
| Pain checkboxes / tiles | Script + diagnosis | multi-select |
| Porte / Colaboradores / Sócios / Faturamento / Prioridade | Diagnosis | select |
| Objeções / gargalos / necessidades / observações / resumo | Diagnosis | textarea |
| Termômetro de Venda | Diagnosis / completion | 0–100 slider |
| Disposition (`Vw`) | Completion (spec) | catalog chips — **weak in PNGs** |
| Situação / Status filters | History | select |
| Meeting date / start / end / notes | Scheduling create (spec) | calendar + time |
| Horário funcionamento / intervalo | Scheduling panel | read-only 9–18 / 30 min |

---

## 7. Interactive state machine (UI)

```text
Login
  └─► Dashboard [desconectado]
        ├─ status → atendimento  ─► enable Dial CTAs, start timer
        ├─ status → intervalo / indisponivel ─► disable Dial CTAs
        ├─ Discagem Automática ─► Dialer searching (orange band)
        │     └─ (~3s) ─► Dialer connected (green band)
        │           ├─ tabs: company | script | questions | diagnosis
        │           ├─ Agendar Reunião ─► Scheduling
        │           ├─ Desligar / Finalizar ─► searching again (auto mode)
        │           └─ Voltar ─► Dashboard
        ├─ Ligação Manual ─► Modal ─► (search → connected workspace)
        ├─ Histórico ─► History
        └─ Agendamentos ─► Meetings calendar
```

---

## 8. Spec alignment & migration notes

### Matches functional specification

- Dark graphite shell, brand amber `#f59e0b`, four operator statuses, campaign seeds, dial gate on `atendimento`.
- Dialer modes searching → connected; tabs; dispositions conceptually; objections categories; diagnosis fields; history filters; scheduling past-date rule.
- Simulated telephony (UI timers only).

### Prefer screenshots over incomplete spec wording

| Topic | Prefer |
|-------|--------|
| Searching copy | **Aguardando ligação…** (`06`) |
| Connected copy | **Falando** + number (`07`) |
| Manual entry | Modal (`11`) as well as `?mode=manual` |
| Objections UX | Accordion + **nova janela** (`13`) |
| Scheduling hours | 9:00–18:00 / 30 min (`08`) |
| Meetings empty | Split calendar + placeholder (`10`) |

### Gaps to reconcile in IMP build

1. **Disposition `Vw` chips** — strong in spec, weak/absent in PNG set; video also skips clear picker. Decide mandatory UI before coding.  
2. **Termômetro + Finalizar** — required by spec/video; only partial on `14`.  
3. **video-frames/** — useful for motion/order, not pixel-accurate (camera glare). Prefer numbered PNGs for polish.  
4. Do **not** imply real SIP/WebRTC from green **Falando** chrome.

---

## 9. IMP implementation checklist

- [ ] Tokens: slate dark surfaces + `#f59e0b` brand + green connected + red hangup  
- [ ] Shell: collapsible sidebar + role header + Sair  
- [ ] Login card + credential footer (demo only)  
- [ ] Dashboard KPI / status / campaigns / quick actions + status→CTA enablement  
- [ ] Dialer searching orange band + connected green band + 4 tabs + footer CTAs  
- [ ] Company 2-col read-only grid  
- [ ] Full script sections + pain + radios + final confirmation  
- [ ] Questions accordion + external window action  
- [ ] Diagnosis selects + pain tiles + textareas (+ thermometer/finalize)  
- [ ] Manual modal validation  
- [ ] History filters/table/actions  
- [ ] Scheduling calendar + hours panel + confirmed list  
- [ ] Meetings calendar empty/filled states  
- [ ] Disable dial when not `atendimento`; disable Agendar when not connected  

**Artifact authority order:** curated PNGs → video analysis → functional specification (behavior & hidden logic).
