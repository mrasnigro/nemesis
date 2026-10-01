# Treinamento IA — Analysis of Reference Materials (Prototype Evolution)

**Type:** Product research / architecture analysis (no code changes)  
**Date:** 6 August 2026  
**Status:** Analysis only — await approval before implementation  
**Module baseline:** `src/modules/training-ai/`

> **Rule:** Study reference materials to adapt **core logic** into IMP. Do **not** copy external product UI, branding, terminology catalogs, avatar libraries, TTS voices, dashboards, or implementation details.

---

## Sources analyzed

| Source | Path | Role |
|--------|------|------|
| Video 01 | `docs/ai-reference/video-01.mp4` (~20 min) | External AI sales-training demo: personas, scenarios, evaluation, reports, admin/engagement surfaces |
| Video 02 | `docs/ai-reference/video-02.mp4` (~17 min) | External product walkthrough: persona library, voice simulation, behavioral forms, report with playback/transcript |
| Product description | `docs/ai-reference/_Descritivo - Treinamento - IA.docx` | Client product intent in three pillars (Agents, Score Playbooks, Insights Center) |
| Templates screenshot | `docs/ai-reference/1- Templates Padrão/imp_playbooks_score.png` | Client vision for weighted stage/criterion score models |
| Personas gallery | `docs/ai-reference/2- Minhas Personas/imp_agentes_humanos.png` | Client vision for AI agent/persona library |
| Persona wizard | `docs/ai-reference/2- Minhas Personas/imp_novo_agente_completo.png` | Multi-step agent creation (basics → scenario → modes → behavior → review) |
| History / insights | `docs/ai-reference/3- Histórico/imp_central_insights.png` | Post-session review: transcript, performance radar, metrics, AI insights |
| Prior IMP analysis | `docs/TRAINING_AI_PRODUCT_ANALYSIS.md` | Earlier gap analysis (partially outdated vs current free-text + CRUD code) |
| Provider architecture | `docs/TRAINING_AI_AI_PROVIDER_ARCHITECTURE.md` | Current AI abstraction contract (mock only) |

**Note:** `docs/ai-reference/WEBINAR_VISUAL_ADAPTATION_PLAN.md` is out of scope for Training IA and was ignored.

**Two input streams (keep distinct):**

1. **External reference product (videos)** — competitor/inspiration. Extract workflows and domain logic only.  
2. **Client descriptive doc + IMP-branded mockups** — product intent for IMP. Use as requirements direction, but **adapt into the existing Training IA module architecture** (do not rebuild as a parallel “mini-CRM training app” or renavigate the whole shell).

---

## 1. Product understanding

### 1.1 Problem the reference system solves

Commercial teams need a **safe practice environment** before talking to real buyers. Generic quizzes are not enough: trainees must face **human-like resistance** (personality, objections, awareness level) and be measured against a **company playbook** (weighted checklist), then review evidence (transcript / recording) to close the coaching loop.

Final objective stated by the client document: *scalable training where the seller has already faced and overcome key objections before the first real contact.*

### 1.2 Main user journey

```text
Configure practice materials (coach/admin)
  → Persona/agent with behavioral DNA + business context
  → Evaluation template / score playbook (stages + weighted yes/no criteria)
  → Scenario / simulation setup (instructions + template binding)

Trainee practices
  → Choose scenario (and often persona)
  → Briefing (seller instructions)
  → Free conversation (text first; voice later)
  → End session

Review & improve
  → Score vs playbook
  → Strengths / improvements / next steps
  → Transcript (and optional sentiment / communication metrics)
  → History list → reopen report → retry
```

### 1.3 Main actors / users

| Actor | Needs |
|-------|--------|
| **Trainee / seller** | Practice, receive actionable feedback, retry weak scenarios |
| **Coach / sales manager** | Define rubrics, personas, scenarios; review team history |
| **Admin** | Module access / permissions (IMP Admin already covers users/modules — do not duplicate credit/group SaaS admin inside Training IA) |

### 1.4 Core business concepts

| Concept (client language) | Meaning | IMP map |
|---------------------------|---------|---------|
| **Agente / Persona** | Simulated human buyer with traits, role, objections, context | `Persona` |
| **Playbook de Score / Template** | Weighted stage→criterion rubric auditing the conversation | `EvaluationTemplate` |
| **Cenário / Simulação** | Practice instance binding persona + objective + instructions + template | `Scenario` + `Session` |
| **Central de Insights / Histórico** | Repository of past sessions with transcript + scoring + insights | `History` + `Report` |
| **Modos de interação** | Voice / text / both | Prototype: **text-first**; voice deferred |

---

## 2. Extracted concepts

### A) Templates (Playbooks de Score)

**What is a template?**  
The “ruler” that measures simulation success. It encodes the company’s ideal sales script as an auditable checklist the evaluator (today: keyword mock; later: LLM judge) applies to the conversation.

**What information it contains (from mockup + videos + doc):**

- Title / active model name  
- Contact or process type (e.g. cold call stages vs full commercial process)  
- **Stages / sections** on a timeline (Abertura, Rapport, Qualificação, Proposta, Negociação, Fechamento…), each with weight contribution  
- **Criteria** per stage: name, weight %, active flag, binary audit question (“Did the seller…?”)  
- Constraints: active criteria aggregate to **100%** score max  
- Publish / draft lifecycle (client mockup) — optional for prototype

**How it influences training:**

- Defines what “good” means for a given scenario  
- Drives report structure (section scores, ✓/✗ criteria)  
- Later drives LLM judge prompts; today drives `passRule` keyword evaluation

**How IMP should represent this:**

Keep current `EvaluationTemplate { sections[] → criteria[] }` model. Evolve presentation toward a **timeline/list of stages with weights** (client vision), without adopting external branding or a separate “Playbooks CRM” nav. Criteria already have `yesNoQuestion`, `weight`, `passRule` — reinforce stage-level totals and validation UX in the next prototype phase.

**Do not implement yet:** full commercial-process CRM playbooks outside Training IA, donut analytics for publishing, or live call scoring of real BDR phones.

---

### B) Personas (Agents)

**How personas are configured (client wizard + videos):**

1. Basic info — name, role, main objective, tone, language, department  
2. Scenario construction — seller instructions + scenario context  
3. Interaction modes — voice / text / both  
4. Behavioral characteristics — traits, objections, priorities, beliefs/awareness  
5. Advanced + review/publish  

Gallery pattern: status (active/paused/inactive), trait tags, usage counts (later).

**Attributes that matter for conversation quality:**

| Attribute | Why it matters |
|-----------|----------------|
| Role + company + industry | Grounds B2B realism |
| Negotiator type / trait tags | Forces adaptation of discourse |
| Objections / priorities / beliefs | Fuels realistic pushback |
| Opening line | Starts the simulation in character |
| Difficulty / mood / behavior blurb | Controls challenge level |
| Seller instructions (often on scenario) | Brief trainee before talk |
| Awareness of problem/solution (client/video) | Controls how “warm” the lead is |

**How personas affect conversations:**

Persona is the **behavioral brain** of the reply engine: mock (and later LLM) responses should reflect traits, objections, and opening stance — not generic chatbot fluff.

**IMP representation:** Keep entity `Persona` separate from `Scenario`. Current seeds already cover identity, negotiator type, objections, priorities, opening line, difficulty. Next evolution: optional trait tags, awareness fields, status (active/draft), and clearer separation of **seller instructions** (scenario) vs **persona DNA** (persona). Skip photographic avatar catalogs and Greek “Agente Alpha” naming aesthetics.

---

### C) Training scenarios

**How scenarios are structured:**

A scenario is the **practice unit** trainees start from. It connects:

```text
Scenario
  ├── default personaId (overridable at setup)
  ├── evaluationTemplateId
  ├── funnel stage / objective / difficulty / duration
  ├── sellerInstructions + scriptHints
  └── focus tags (e.g. Rapport, Objeções)
```

Client wizard sometimes folds “scenario construction” into agent creation. Videos often filter personas by scenario type. IMP should keep **Scenario as first-class** (better catalog UX for BDR-aligned practice), with optional override of persona at simulation setup (already implemented).

**Connection persona + objectives + evaluation:**

| Link | Purpose |
|------|---------|
| Persona → how the “client” behaves | Roleplay realism |
| Objective / sellerInstructions → what success looks like for the trainee | Briefing |
| EvaluationTemplate → how success is scored | Report |

---

### D) Conversation simulation

**Flow:**

```text
idle → setup (pick persona) → briefing → running (free chat) → finished → report
```

**User actions:**

- Select scenario from catalog  
- Confirm/override persona  
- Read briefing / hints  
- Send free-text messages  
- End session (minimum one trainee message)  
- View report / transcript / retry  

**AI behavior expectations:**

- Open with persona opening line  
- Stay in character (objections, priorities, difficulty)  
- Respond turn-by-turn to trainee text  
- Prototype: mock provider only; honesty label “mock” remains  

**Validation rules:**

- Permissions: `training.simulate` to run  
- Cannot finish with empty trainee contribution  
- Rubric evaluation happens at finish (not mid-turn, for prototype)  
- Voice/STT/TTS, interruption counting, talk-ratio — deferred  

---

### E) Evaluation / reporting

**How performance is measured (reference):**

1. Weighted yes/no criteria rolled into 0–100 score  
2. Section aggregates (e.g. Qualificação 2/3)  
3. Qualitative strengths / improvements  
4. Optional communication metrics (talk time, interruptions, questions asked) — voice-era  
5. Optional competency radar (opening, discovery, objections, closing…)  
6. Suggested next steps  
7. Transcript with optional sentiment markers  

**What should appear after training (IMP prototype):**

- Already valuable: score, band, section ✓/✗, strengths/improvements, coach notes, transcript, redo  
- Next prototype priority: session identity (unique id), clearer criterion evidence (“matched keywords…”), optional lightweight “communication metrics” **mocked** from text (message count, duration estimate) — not real call analytics  
- Defer: audio player, sentiment timeline, radar charts driven by LLM voice analysis  

**Valuable insights:**

- Which playbook criteria failed repeatedly  
- Which persona types the trainee struggles with  
- Actionable next practice (retry same scenario / harder persona)  

---

### F) History and analytics

**What should be stored:**

| Field | Prototype | Later |
|-------|-----------|-------|
| Session id, user, timestamps | Mock session id | Persist |
| Scenario / persona / template refs + titles | Yes | Yes |
| Score, band, section results | Yes | Yes |
| Full messages transcript | Yes | Yes |
| Duration, message counts | Partial / easy add | Yes |
| Audio blob / STT | No | Optional |
| Sentiment per turn | No | Optional |
| Team rankings / DAU dashboards | No | Out of module scope |

**How users review previous sessions:**

- History list → open report  
- Report → toggle conversation → retry simulation  
- Catalog metrics (completed, avg score) derived from history  

Gap vs client “Central de Insights”: no dual-pane transcript + radar/metrics analytics, no durable multi-user store, report keyed primarily by `scenarioId` (collision risk on repeats).

---

## 3. Compare with current IMP implementation

| Reference concept | Current IMP status | Recommended evolution |
|-------------------|--------------------|------------------------|
| Persona as behavioral agent | **Implemented** — CRUD + seeds (role, traits-ish negotiator, objections, opening) | Enrich with trait tags, awareness, status; keep IMP naming `Personas` |
| Scenario binding persona + template + briefing | **Implemented** | Strengthen catalog filters (funnel stage, difficulty); optional multi-persona practice packs |
| Evaluation template stages + weighted criteria | **Implemented** — sections/criteria weights sum 100 + passRules | UX closer to stage timeline + weight distribution preview; validate weights in form |
| Free conversation simulation | **Implemented** — text free-chat via mock AI provider | Improve mock reply quality; async provider wiring; no external LLM yet |
| Briefing before chat | **Implemented** | Minor UX polish; show linked template summary |
| Rubric report ✓/✗ + score + transcript | **Implemented** | Unique session report routes; criterion evidence; optional mocked soft metrics |
| History of sessions | **Partial** — in-memory list only | Session-stable ids; filter; richer list cards; localStorage optional for demo longevity |
| Communication metrics (talk %, interruptions) | **Missing** | Prototype: mock/derived from text only; label as mock |
| Performance radar | **Missing** | Optional Phase 2 UI from section scores (no new AI) |
| Sentiment on transcript | **Missing** | **Should not** implement in prototype (needs NLP/voice) |
| Voice / TTS / STT / recording player | **Missing** | **Should not** implement in next prototype phase |
| Avatar photo marketplace | **Missing** | **Should not** implement |
| Engagement DAU/WAU / credits-minutes admin | **Missing** | **Should not** implement inside training-ai (Admin/modules already govern access) |
| AI provider abstraction | **Implemented** — mock only | Keep; optional fake latency; swap later without rewriting UI |
| Permissions view/simulate/report/manage | **Partial** — keys exist; coarse “all if module access” | Keep keys; do not break BDR; optional finer demo later |
| Handoff to BDR after practice | **Missing** | Soft narrative links only if desired; **do not** alter BDR permissions/flows |
| Publish/draft lifecycle for agents & playbooks | **Missing** | Optional simple `status: active\|draft` on entities |
| Multi-user persistence / backend | **Missing** | Out of prototype scope |

Legend: **Implemented** · **Partial** · **Missing** · **Should not (now)**

---

## 4. Recommended IMP prototype evolution

### Principles

- Prototype first; **mock data acceptable**  
- **No external LLM** unless using existing abstraction later by config (default remains mock)  
- Maintain current domain: Persona × Scenario × EvaluationTemplate × Session → Report/History  
- Preserve `ModuleWorkspaceLayout`, IMP graphite/amber tokens, Portuguese CRM copy  
- **Do not break** BDR, webinar sidecar, or module permission registration patterns  

### Product north star (adapted)

> Training IA inside IMP = short, BDR-aligned roleplay against configurable personas, scored by company rubrics, with reviewable transcripts — pluggable AI, honest mocks, IMP shell.

### Next prototype phase (proposed **Phase N1**)

Goal: close the gap between “working mock skeleton” and “client-recognizable training loop” **without** voice or real LLM.

1. **Session identity** — report/history keyed by `sessionId` (not only `scenarioId`)  
2. **Template editor UX** — stage weight summary / distribution (inspired by playbook mockup logic, IMP components)  
3. **Persona enrichment** — trait tags + optional awareness fields; gallery status  
4. **Report depth** — criterion evidence from passRules; optional section-derived “radar” from existing section scores  
5. **History cards** — persona, score, date, duration; filters by scenario/persona  
6. **Catalog metrics honesty** — completed / avg from history; drop or clearly label fake streak if still mock  

### Later phases (not this coding cycle)

| Phase | Focus |
|-------|--------|
| **N2** | Stronger mock conversation (branching / objection scripts); localStorage persistence |
| **N3** | Wire real provider behind `services/ai` abstraction; optional LLM judge for rubric |
| **N4** | Voice (STT/TTS), audio artifacts, sentiment — only with product approval |

---

## 5. Proposed screens / workflows

### Navigation (keep current structure)

```text
Catálogo → Cenários → Personas → Templates → Histórico
(+ Simulação / Relatório as flow routes)
```

Do **not** rename nav to external/client marketing labels (“Central de Insights”, “Playbooks de Score”, “Agentes”) as primary IA — use IMP module vocabulary; secondary subtitles may explain mapping if useful for demos.

### Pages & components (evolution, not rewrite)

| Screen | User actions | Components (conceptual) |
|--------|--------------|-------------------------|
| **Catálogo** | Start practice; see metrics | Metrics row, scenario cards, CTA Iniciar |
| **Cenários** list/detail/form | CRUD (manage); open simulation | List, detail panels, form fields for persona/template bind |
| **Personas** list/detail/form | CRUD; inspect DNA | Gallery/list, trait pills, form sections |
| **Templates** list/detail/form | CRUD rubrics | Stage timeline/list, criterion rows, weight total = 100 |
| **Simulação** | Setup → briefing → chat → finish | Persona picker, briefing card, chat, finish bar |
| **Relatório** | Review score, criteria, transcript, retry | Score metrics, section tables, conversation drawer |
| **Histórico** | Open past reports | Filterable session list |

### Data relationships

```text
Persona 1 ──< Scenario >── 1 EvaluationTemplate
                 │
                 ▼
              Session (trainee, messages[], phase, mode)
                 │
                 ▼
           Evaluation / Report  →  History[]
```

Simulation may override `personaId` at setup without mutating the scenario seed.

---

## 6. Architecture impact

| Area | Change needed for next prototype? | Notes |
|------|-------------------------------------|-------|
| **TrainingAiContext** | **Yes (limited)** | Prefer `sessionId` on evaluations; optional metrics fields; avoid new phase machine if current setup/briefing/running/finished works |
| **Personas** | **Yes (data + forms)** | Additive fields only; keep seeds compatible |
| **Scenarios** | **Minor** | Filters / catalog presentation; model largely sufficient |
| **Evaluation templates** | **Yes (UX + soft validation)** | Weight distribution UI; keep `passRule` for mock scoring |
| **AI provider abstraction** | **No breaking change** | Stay on mock; maybe async/latency polish only |
| **Reports** | **Yes** | Session-keyed routes; optional evidence + mock soft metrics |
| **History** | **Yes** | Richer list; stable keys |
| **Permissions** | **No breakage** | Keep `training.view|simulate|report|manage`; do not touch BDR permission maps except leaving them alone |
| **BDR module** | **None** | No coupling required for N1 |

Backend / `services/` sidecar: **not required** for N1 (continue in-SPA mock like current training module).

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope expands into voice + sentiment + real call analytics | Slows prototype; fake complexity | Explicitly defer voice/sentiment; mock-only soft metrics if any |
| Renaming entities to client marketing terms breaks demo continuity | Confusion vs already-shipped Training IA | Keep Personas / Templates / Histórico; document mapping in this file |
| Report collisions (`scenarioId` only) mislead demos | Wrong transcript shown | Introduce `sessionId` before more history UI |
| Keyword scoring feels “random” vs client expectations of AI audit | Demo distrust | Surface evidence (matched keywords); keep “mock” labels |
| Copying external UI density / purple aesthetics | Brand conflict | Stick to `imp-*` / ModuleWorkspace |
| Treating client mockups as final shell redesign | Diverge from module launcher architecture | Adapt concepts into existing training-ai routes only |
| Accidental BDR/permission regressions | Cross-module breakage | No edits to BDR; training permissions additive only |

---

## 8. Unclear requirements (need client confirmation)

| # | Question | Suggested default |
|---|----------|-------------------|
| Q1 | Primary entry for practice: **scenarios catalog** or **persona gallery**? | Keep **Catálogo de cenários** as primary (aligned with BDR skills); personas remain configuration + setup override |
| Q2 | Must next demo include **voice**, even mocked? | **No** — text-first |
| Q3 | Prefer client labels (Agentes / Playbooks / Central de Insights) in UI? | Keep current IMP labels; optional subtitle mapping for stakeholders |
| Q4 | Is **radar + communication metrics** required for prototype demo? | Soft optional: radar from section scores; skip talk-time/interruptions until voice |
| Q5 | Should history survive browser refresh (`localStorage`)? | **Yes** for demos if cheap; otherwise document “session memory” |
| Q6 | LLM/OpenAI wiring for N1? | **No** — mock provider only |
| Q7 | Should Training IA score real BDR calls (Central de Insights mock shows live call analysis)? | **Out of scope** for Training IA prototype — training sessions only; real call analytics is a different product surface |
| Q8 | Publish/draft workflow for personas & templates? | Simple `active/draft` enough; full publishing workflow later |
| Q9 | Cross-link from report to BDR / Prospection modules? | Optional narrative CTA only; no functional coupling |

---

## 9. Recommended implementation phases (for post-approval coding)

| Phase | Deliverable | Acceptance |
|-------|-------------|------------|
| **N0** | This analysis approved | Stakeholder OK on Q1–Q9 defaults |
| **N1** | Session ids, richer history/report, template weight UX, persona trait/status enrichment | Demo loop feels like “configure → practice → audit → review” without voice/LLM |
| **N2** | Optional localStorage; stronger mock dialogue; filters | Refresh-safe demo; higher conversation realism |
| **N3** | Real AI provider + optional LLM judge | Still via `services/ai` abstraction |
| **N4** | Voice / transcript sentiment | Explicit new initiative |

---

## 10. Analysis summary (executive)

The reference materials converge on a **three-pillar training system**: (1) configurable **personas/agents**, (2) weighted **score playbooks/templates**, (3) **session review/history** with transcript and coaching insights. Voice and sentiment analysis appear in client vision and competitor demos but are **not** required to complete the next IMP prototype.

Current IMP Training IA **already implements** the correct architecture skeleton (Persona × Scenario × Template × free conversation × rubric scoring × history × AI provider abstraction). The outdated product analysis from 5 Aug understated this. Remaining gap is **depth and demo fidelity**: durable session identity, richer review UX, template weight clarity, persona DNA enrichment — **not** a greenfield rebuild and **not** a UI clone of the external product or client marketing mockups.

**Next step:** confirm open questions (Section 8), then implement **Phase N1** only. **No code in this cycle.**
