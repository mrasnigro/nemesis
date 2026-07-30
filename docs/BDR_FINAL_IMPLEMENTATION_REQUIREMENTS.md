# BDR Final Implementation Requirements

**Document type:** Locked requirements for IMP BDR prototype implementation  
**Date:** 31 July 2026  
**Code status:** Do not implement from this document until kickoff — requirements only  

### Sources compared

| File | Role |
|------|------|
| `docs/clinet-requirements.md` | Client requirements (filename typo; content is authoritative client intent) |
| `docs/BDR_FUNCTIONAL_SPECIFICATION.md` | As-is live operational behavior |
| `docs/BDR_IMP_MIGRATION_BLUEPRINT.md` | IMP integration plan & defaults |

**Supporting (not re-litigated here):** `BDR_UI_REFERENCE.md`, `BDR_VIDEO_BEHAVIOR_ANALYSIS.md`, `BDR_LIVE_SYSTEM_ANALYSIS.md`, `BDR_FUNCTIONAL_PROTOTYPE_SPEC.md`.

---

## 1. Confirmed requirements

Mapped from client text → how functional spec + blueprint satisfy them.

| # | Client requirement | Confirmed interpretation | Covered by |
|---|--------------------|--------------------------|------------|
| C1 | Prototype must **simulate real operation**, not visuals only | Full operator FSM, dial lifecycle, script/diagnosis, history, scheduling with simulated telephony | Functional spec §2–7; Blueprint §0–1 |
| C2 | Preserve **business rules** | Status matrix, dial gates, 3s connect, lead pool rules, dispositions, thermometer bands, validations | Functional §3–7; Blueprint §0.1 |
| C3 | Preserve **navigation** | In-IMP routes Painel → Discagem / Manual / Histórico / Agenda; module switching without leaving IMP | Client module behavior; Blueprint §1.3 |
| C4 | Preserve **scripts** | Guided Script de Abordagem + Questionamentos Padrão + diagnosis mapping | Functional §5; Blueprint §3, §8 |
| C5 | Preserve **validations** | Login fields (IMP), status illegal transitions, dial only in `atendimento`, manual phone+method, schedule only when `connected`, past dates blocked | Functional §7.2; Blueprint §0.1 |
| C6 | Preserve **workflows** | Auto + manual dial loops, finalize → next search, schedule from call, history update | Functional §2.5, §4, §6; Live analysis |
| C7 | **Visual identity** — maintain current; **do not redesign** | Match live BDR chrome per UI reference (dark graphite, `#f59e0b`, status bands, PT labels) | Client visual identity; `BDR_UI_REFERENCE.md`; Blueprint §1.2 |
| C8 | **Discagem Automática opens inside IMP** | No external `window.open` to acelereseucrescimento; in-app `/modules/bdr/*` | Client module behavior; Blueprint §1.2, §0.2 |
| C9 | Navigate **between modules without leaving the platform** | IMP launcher + BDR DialerLayout; other modules remain reachable under IMP shell | Client module behavior; IMP handover access model |
| C10 | Prototype represents **future product behavior before backend** | Mock `BdrDataPort` now; same UX/rules; API swap later | Client objective; Blueprint §5–6 |

### Confirmed delivery scope (must build)

1. Shared `BdrSession` under `DialerLayout` (Painel + dialer share state).  
2. Painel with live status FSM, metrics, campaigns, gated CTAs.  
3. Automatic + manual dial workspaces (searching / Falando / 4 tabs).  
4. Full script, objections, diagnosis, disposition catalog, thermometer.  
5. Finalize attendance → history + auto next search (live rule).  
6. Scheduling + agenda screens.  
7. History with live filters.  
8. Module access via existing IMP `bdr` grant; optional `bdr.*` permission keys.  
9. Simulated data only (seeds `u0`, `YN`, catalogs `Vw` / `Sw` / `Tw`).

### Confirmed non-scope (prototype)

- Real telephony / recording backends  
- Real multi-tenant dialer API (seam only)  
- Visual redesign or new brand language  
- External BDR tab launch  
- Inventing campaign-true queue/DNC (live does not have it)

---

## 2. Conflicts or ambiguities

| ID | Topic | Tension | Resolution for implementation |
|----|-------|---------|-------------------------------|
| A1 | Filename `clinet-requirements.md` vs `client-requirements.md` | Docs/blueprint referenced missing path | Treat **`docs/clinet-requirements.md`** as the client file until renamed; update blueprint citation when renamed |
| A2 | “Future product behavior” vs “as-is live quirks” | Client wants future product; live includes 5s auto→`indisponivel` and finalize-always-auto | **Preserve live operational rules** for the prototype (client: simulate real operation / preserve business rules). Flag 5s quirk in QA as known demo behavior; do not silently remove |
| A3 | “Do not redesign” vs IMP shell chrome | IMP already has DialerLayout / launcher | Keep IMP shell navigation; **BDR surfaces** must match live visual identity (colors, labels, bands, card layouts) — not invent a new dialer look |
| A4 | Disposition required? | Functional catalog exists; video often skipped picker; blueprint requires picker | **Implement full `Vw` picker** and require selection on finalize (completeness of business catalog ≠ redesign) |
| A5 | Post-manual finalize | Live → auto search; older prototype-spec → manual idle | **Live rule** (Blueprint §0.3): always restart automatic searching |
| A6 | Paused campaign | Live informational; prototype-spec wanted hard block | **Live rule**: no hard block on CTA from paused badge alone |
| A7 | Searching copy | Bundle has “Procura Automática”; UI/live show **Aguardando ligação…** | Use **Aguardando ligação…** / **Falando** (operator-facing) |
| A8 | Thermometer placement | Inline diagnosis vs completion modal | Bands immutable; either/both UX OK if 0–100 Frio/Morno/Quente preserved |
| A9 | Campaign selection vs lead queue | UI shows campaigns; dial pool ignores campaign | Keep both behaviors: persist selected campaign; pick random `YN` (document in UI/help if needed — do not “fix” by filtering) |
| A10 | Metrics “future product” | Live metrics mostly static seeds; blueprint allows session updates | **Allowed:** update metrics/history from session completions (improves “real operation” simulation). **Not allowed:** fake telephony or drop FSM rules |
| A11 | SDR / other live pages | Live has SDR dashboard, legacy `/dialer` | **Out of BDR operate MVP** unless client expands requirements; do not block Painel/Discagem path |
| A12 | Shared session vs live split trees | Live painel/dialer/scheduling are separate React trees | **Blueprint improvement required:** one `BdrSessionProvider` — preserves rules better, does not simplify them |

No unresolved blocker that prevents Phase 1 start, provided A2–A9 defaults above are accepted.

---

## 3. Rules that cannot change

These are frozen. Implementation PRs that alter them are out of scope without a new written client decision.

### 3.1 Platform / product

1. Discagem Automática runs **inside IMP** only.  
2. User can move across IMP modules **without leaving the platform**.  
3. **No visual redesign** of BDR operational UI (identity = current live BDR).  
4. Prototype is **behavioral**, not chrome-only.  
5. Telephony is **simulated**; no requirement to ship real PSTN in this prototype.

### 3.2 Operator status

6. Four statuses only: Desconectado / Em atendimento / Em intervalo / Indisponível.  
7. Adjacency matrix exactly as functional §3.2.  
8. Illegal transitions: disabled + **Transição indisponível para o status atual**.  
9. Dial CTAs enabled **only** in Em atendimento.  
10. Tempo em atendimento runs only in Em atendimento.  
11. Live auto-force Em atendimento → Indisponível after ~5s remains unless client explicitly drops A2.

### 3.3 Dial / call

12. Auto mode: searching → connect at `elapsedTime >= 3`.  
13. Operator-facing searching/connected copy: **Aguardando ligação…** / **Falando**.  
14. Lead selection: random with replacement from seed pool equivalent to `YN`; **no campaign filter**.  
15. Manual: require non-empty phone + Telefone Fixo | WhatsApp.  
16. Manual connect still attaches a pool company card; finalize phone uses typed number when manual.  
17. Connected tabs: Dados da Empresa / Script de Abordagem / Questionamentos Padrão / Anotações de Diagnóstico.  
18. Agendar Reunião only when `connected`.  
19. Finalize always returns to automatic **searching** (including after manual).  
20. Full disposition catalog `Vw` (seven IDs/labels).  
21. Thermometer bands: ≤30 Frio, ≤65 Morno, >65 Quente.  
22. Script radios map into diagnosis (`equipe`, `faturamento`, `decisao`, pains).  
23. Objection library seven categories with live counts.  
24. Scheduling: block past dates; show functioning hours 9:00–18:00 and 30 min interval.  
25. History supports filters Situação da Ligação + Status do Cliente (live lists).

### 3.4 Data / integration

26. Seed campaigns / leads / dispositions remain recognizable vs live demo.  
27. Future backend replaces mock via port — **must not** rewrite UI rules to match API convenience.  
28. Do not invent DNC, attempt caps, or campaign-true pacing in this prototype.

---

## 4. Prototype acceptance criteria

Demo login: IMP `bdr` / `bdr` → module Discagem Automática (`/modules/bdr`).

| # | Criterion | Pass condition |
|---|-----------|----------------|
| AC1 | In-app only | No navigation to acelereseucrescimento; URL stays on IMP origin |
| AC2 | Module mobility | From BDR, user can reach IMP dashboard/other granted modules and return |
| AC3 | Visual fidelity | Painel/dialer recognizable vs `docs/screenshots/bdr/*.png` + UI reference (colors, PT labels, bands) |
| AC4 | Status default | Starts Desconectado; Discagem Automática + Ligação Manual disabled |
| AC5 | FSM | Illegal transitions blocked with correct tooltip/title |
| AC6 | Ready state | Em atendimento starts timer and enables dial CTAs |
| AC7 | Auto-indisponivel | ~5s in atendimento without leaving forces Indisponível (unless superseded by signed A2 change) |
| AC8 | Auto dial | Searching UI → ~3s → Falando with a `YN`-equivalent company |
| AC9 | Workspace | All four tabs usable; company fields complete enough for demo |
| AC10 | Script | Opening/guided script present; at least equipe/faturamento/decisão/pains affect diagnosis |
| AC11 | Objections | Seven categories visible |
| AC12 | Schedule gate | Agendar disabled until connected; then opens in-IMP scheduling |
| AC13 | Complete call | Disposition + thermometer + Finalizar → history row; diagnosis cleared; next auto search |
| AC14 | Manual | Validation blocks empty phone/method; path reaches connected workspace |
| AC15 | Manual finalize | Restarts automatic searching (live) |
| AC16 | Agenda | Meeting saved from call appears under Agendamentos; past dates not selectable |
| AC17 | History filters | Both filter dropdowns match live option sets; new row visible same session |
| AC18 | Shared session | Status/campaign/history consistent between Painel and Discagem without remount loss |
| AC19 | No real calls | No SIP/WebRTC; timers only |
| AC20 | Pre-backend | Works fully on mock data; no hard dependency on BDR REST API |

---

## 5. Development checklist

Use as implementation / PR gate. Order follows blueprint phases.

### 5.0 Docs / kickoff

- [ ] Confirm `clinet-requirements.md` vs rename to `client-requirements.md`  
- [ ] Product sign-off on ambiguities A2–A9 (defaults in §2)  
- [ ] Engineers briefed: §3 immutable rules  

### 5.1 Session foundation

- [ ] `BdrSessionProvider` under `DialerLayout`  
- [ ] Operator status machine + adjacency + tooltips  
- [ ] Attendance timer bound to header  
- [ ] 5s auto→Indisponível  
- [ ] Campaign list + `selectedCampaignId` persistence  
- [ ] Painel metrics/campaigns/CTAs wired (gates correct)  
- [ ] Manual entry in DialerLayout nav  

### 5.2 Dial lifecycle

- [ ] `discagem?mode=automatic` searching + 3s connect + random `YN`  
- [ ] Call bands: Aguardando ligação… / Falando  
- [ ] Lead company panel (protocol, CNPJ, sócio, etc.)  
- [ ] Manual form validations + connect path  
- [ ] Desligar / workspace CTAs  
- [ ] Finalize → history prepend → automatic searching restart  

### 5.3 Script & qualification

- [ ] Script de Abordagem full flow (no stub “lorem”)  
- [ ] Radio/pain → diagnosis sync  
- [ ] Questionamentos Padrão (7 categories)  
- [ ] Diagnosis selects + textareas  
- [ ] Disposition picker (full `Vw`)  
- [ ] Sales thermometer bands  
- [ ] Finalizar Atendimento payload complete  

### 5.4 Scheduling & history

- [ ] Agendar Reunião in-IMP (modal or `/agendar`)  
- [ ] Hours 9:00–18:00 / 30 min; past dates blocked  
- [ ] Agendamentos list/calendar updates from session  
- [ ] Histórico filters Situação + Status Cliente  
- [ ] Session completions appear immediately  

### 5.5 Platform & polish

- [ ] No external BDR URL launch remaining  
- [ ] Module switching without leaving IMP  
- [ ] Visual pass vs UI reference (no redesign)  
- [ ] `bdr.*` permission keys registered (demo grant OK)  
- [ ] `BdrDataPort` mock only; API stub interface documented  
- [ ] Acceptance AC1–AC20 executed and recorded  

### 5.6 Explicitly do not do (this prototype)

- [ ] ~~Real telephony~~  
- [ ] ~~Visual redesign / new theme~~  
- [ ] ~~Simplify status matrix or dial gates~~  
- [ ] ~~Campaign-filtered dial queue~~  
- [ ] ~~Drop disposition catalog entries~~  
- [ ] ~~Post-manual idle instead of auto search~~ (unless client revises A5)  

---

## 6. Authority order for disputes

1. This document (§3 immutable + §2 resolutions)  
2. `docs/clinet-requirements.md` (client intent)  
3. `docs/BDR_FUNCTIONAL_SPECIFICATION.md` (operational truth)  
4. `docs/BDR_IMP_MIGRATION_BLUEPRINT.md` (how to build in IMP)  
5. UI / video / live analysis (copy & chrome)  

When “future product” and “live quirk” conflict: **prefer live operational behavior** for the prototype, per client core principle (*simulate the real operation* / *preserve business rules*), and log the quirk for a later product decision.

---

## 7. Ready to implement?

| Gate | Status |
|------|--------|
| Client requirements captured | Yes (`clinet-requirements.md`) |
| Compared to functional + blueprint | Yes |
| Immutable rules listed | Yes (§3) |
| Acceptance criteria listed | Yes (§4) |
| Checklist listed | Yes (§5) |
| Code | **Not started** (per request) |

**Next step after sign-off:** Blueprint Phase 1 — `BdrSessionProvider` + Painel FSM only.
