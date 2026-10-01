# Training IA — Reference Review & Restructure Report

**Date:** 7 August 2026  
**Purpose:** Thorough product + visual review of `docs/ai-reference` so you can restructure UI and logic.  
**Scope:** Analysis only (no code in this deliverable).  
**Rule:** Learn logic and IA from references. Do **not** copy Vendiq brand/UI purple, avatar marketplace, or admin SaaS surfaces.

---

## 0. Inventory of materials

| Asset | Size / duration | Nature | Use |
|-------|-----------------|--------|-----|
| `_Descritivo - Treinamento - IA.docx` | ~118 KB | Client product brief | **Primary product intent** (3 pillars) |
| `imp_agentes_humanos.png` | 1.6 MB | Client IMP mockup | Agentes gallery UI |
| `imp_novo_agente_completo.png` | 3.2 MB | Client IMP mockup | Agente create wizard |
| `imp_playbooks_score.png` | 2.7 MB | Client IMP mockup | Playbook timeline + weights |
| `imp_central_insights.png` | 3.0 MB | Client IMP mockup | Insights / call analysis |
| `video-01.mp4` | ~19.9 min · 1916×908 | External product walkthrough (Vendiq) | Domain flows, form depth, report |
| `video-02.mp4` | ~16.9 min · 1440×824 | External product walkthrough (Vendiq · `app.vendiq.com.br`) | Persona config, sim report, transcript modal |
| `WEBINAR_VISUAL_ADAPTATION_PLAN.md` | — | Webinar visual plan | **Ignore** (wrong module) |
| `_analysis_frames/*.jpg` | generated | Sample frames from videos | Evidence for this report |

### Two sources of truth (keep them distinct)

```text
A) CLIENT INTENT (DOCX + IMP mockups)
   → How Training IA should feel *inside IMP*
   → Labels: Agentes, Playbooks de Score, Central de Insights
   → Dark CRM chrome, orange accent (IMP family)

B) EXTERNAL REFERENCE (videos · Vendiq)
   → Workflows, domain fields, coaching loop
   → Purple/white standalone app — DO NOT CLONE visuals
```

---

## 1. Executive verdict

The product is a **closed-loop sales practice system**:

1. **Configure** human-like buyer agents + weighted score playbooks  
2. **Practice** free conversation (voice preferred in references; text acceptable for IMP prototype)  
3. **Analyze** with transcript + score + coaching → retry  

Client materials already define the **IMP packaging** (three pillars, dark UI, orange). Videos define the **depth of configuration and post-session coaching** IMP is still thin on.

**Restructure north star:** implement Client pillars A/B/C as first-class module IA, borrow field/flow richness from videos, keep IMP shell + graphite/amber, text-first until voice is approved.

---

## 2. Product understanding (from DOCX)

Client brief organizes Training IA into **three brains**:

### 2.1 Configurador de Agentes (Personas)

- **Problem:** generic simulations fail; agents must have personality, pains, awareness.  
- **Human face:** name, role, visual profile.  
- **Behavioral DNA:** traits (Analítico, Agressivo, Cético, Inseguro…).  
- **Business context:** B2B/B2C, company, sector, common objections.

### 2.2 Playbooks de Score (Templates)

- **Problem:** need a company “ruler” for success.  
- **Timeline:** Abertura → Rapport → Qualificação → … → Fechamento.  
- **Auditable criteria:** yes/no questions checked against the conversation.  
- **Weights:** per criterion → final score 0–100.

### 2.3 Central de Insights (History & analysis)

- **Problem:** practice must become strategic data.  
- **Transcript + sentiment** on each turn.  
- **Performance radar** across competencies.  
- **Audio repository** + detailed AI feedback for continuous coaching.

### 2.4 Final objective (client)

> Scalable practice in a safe environment so the seller has already faced and overcome key objections before the first real contact.

---

## 3. Visual / IA teardown — client mockups

### 3.1 `imp_agentes_humanos.png` — Configurador de Agentes

**Page job:** browse/manage AI personas.

| Zone | Pattern |
|------|---------|
| Header | Title + one-line purpose + primary **+ Novo Agente** |
| KPI strip | 4 cards: created / active / simulations / engagement |
| Body | Responsive **card grid** (≈4 columns) |
| Card anatomy | Status (Ativo/Pausado/Inativo) · kebab · **photo** · name · role · **3 trait pills** · sim count · chevron |
| Placement in CRM | Under Treinamentos → **Simular IA** (mockup CRM nav differs from current module shell) |

**Logic implications**

- Agent is a first-class entity with `status`, traits, usage metrics.  
- Cards are the entry to detail / edit / start simulation (mockup implies click-through).  
- Naming in mockup uses Greek “Agente Alpha…” — for IMP prefer **human names** (videos also use Gildo, Camilo, Matheus).

### 3.2 `imp_novo_agente_completo.png` — Criar Novo Agente

**Layout:** 3 columns — CRM nav | form | sticky **Resumo**.

**Wizard steps (6):**

1. Informações básicas  
2. Construção do cenário  
3. Modos de interação (Voz / Texto / Ambos)  
4. Características comportamentais  
5. Configurações avançadas  
6. Revisão e publicação  

**Field groups seen**

- Name, role dropdown, main objective, tone of voice, department, language  
- Seller instructions (≤2000), scenario context (≤2000)  
- Mode toggles  
- Draft badge, progress %, Save & continue / Save draft / Cancel  

**Logic implications**

- Draft/publish lifecycle.  
- Modes are first-class; prototype can enable Texto only and show Voz/Ambos as disabled.  
- Resumo rail mirrors form state live.

### 3.3 `imp_playbooks_score.png` — Playbooks de Score

**Layout:** header + model summary · **timeline center** · **distribution right rail**.

**Patterns**

- Active model strip: name, Ativo, stages count, max score 100%, criteria count, last update  
- Timeline ↔ Lista toggle  
- Stage: number · name · description · **stage weight %** · expandable criteria  
- Criterion row: name · weight input · Active toggle · kebab · add criterion  
- Right: donut “100% Score total” + per-stage distribution · Publish / auto-save messaging  

**Example stage weights (mockup):** Abertura 15 · Rapport 15 · Qualificação 25 · Proposta 20 · Negociação 15 · Fechamento 10  

**Logic implications**

- Prefer **stage weight + criterion weight** (mockup shows both); current IMP mostly weights criteria to 100 — decide if stage sub-totals must also sum.  
- Publish state vs draft.  
- Playbook is reusable across scenarios (see also video “cenários compatíveis”).

### 3.4 `imp_central_insights.png` — Central de Insights / Análise

**This mockup is call-analysis dense** (live call + audio). Treat as **target product vision**, not all of it for the text-first prototype.

| Zone | Contents |
|------|----------|
| Header | Contact, CONCLUÍDA, phone, company, datetime · Download / Share |
| Top player | Waveform · duration · **sentiment markers** on timeline |
| Left | Tabs Transcrição / Resumo Inteligente · searchable chat with per-turn sentiment |
| Right | Score 85/100 · **radar (6 competencies)** · metrics vs Ideal · AI insights (fortes / melhoria / próximos passos) |

**Metrics vs Ideal (mockup):** duration, talk share, interruptions, questions asked, price mentions  

**Logic implications for Training IA**

- Dual pane is mandatory for “Insights feel.”  
- Sentiment + waveform require voice/audio pipeline → **phase later**.  
- Radar axes should map to playbook stages or fixed competency set.  
- Separate clearly: **training session analysis** vs **real CRM call analysis** (mockup looks like real call; training module should still reuse this composition).

---

## 4. Visual / flow teardown — videos (Vendiq)

Frames sampled into `_analysis_frames/` (not product assets).

### 4.1 Information architecture (video IA)

```text
Treinamento com IA
  ├── Minhas Personas
  ├── Templates de Avaliação
  └── Histórico

(+ Dashboards: Engajamento, Ranking, Performance, Métricas de Comunicação)
(+ Administração: Usuários, Grupos, Minha Conta)
```

**For IMP module:** keep only Training subset; dashboards/admin stay out (or shell metrics only).

### 4.2 Persona creation depth (video)

Observed field groups beyond current IMP seeds:

| Block | Fields / UX |
|-------|-------------|
| Basics | Name, location, negotiator type, language, avatar picker, voice picker + preview audio |
| Scenario construction | Simulation scenario dropdown · evaluation template · seller instructions · tags |
| Modes | Voice / text / both |
| Behavioral lists | Personal details · objections · priorities · beliefs (dynamic +/− pills, 3rd person copy) |
| Approach (optional) | Opening line · problem awareness · solution awareness |
| Sales context | B2B/B2C toggle · company · sector · role · company info |

Example seller instruction from video: *“Você está ligando para um Lead que se cadastrou no site da IMP.”* — strong BDR alignment.

### 4.3 Evaluation templates (video)

- Criterion: **name + weight + yes/no question**  
- Add/remove criteria  
- **Compatible scenarios** checkboxes (Cold contact, Discovery…)  
- Weight UI in one example used small integers (1, 10…) — client mockup uses **% totaling 100**; prefer **% / 100** for IMP (clearer + matches Playbooks mockup).

### 4.4 Training & report loop (video)

```text
Persona (optional filter by scenario)
  → Start voice/text simulation
  → Free dialogue (cliente/vendedor)
  → Relatório de Simulação
       Tabs: Resultados | Métricas de Comunicação | Template name
       Cards: duration · score gauge · seller brief · +/- feedback
       Footer: Ver conversa · Refazer · Novo feedback · history
  → Modal: timestamped coaching points + audio player + transcript bubbles
```

**High-value coaching pattern:** feedback items linked to **timestamps** that seek into audio/transcript (00:39, 01:10…). For text-first IMP, link to **message id / clock time** instead.

### 4.5 What videos add that mockups understate

- Persona is also the **start surface** (not only catalog of scenarios).  
- Heavy behavioral list UX.  
- Report qualitative narrative, not only ✓/✗.  
- Communication metrics tab (tone / talk patterns).  
- Admin credits/users — **do not port**.

---

## 5. Unified domain model (recommended for restructure)

```text
Agent (Persona)
  identity: name, role, company, industry, location, language
  status: active | paused | inactive | draft
  traits[] / negotiatorType / tone
  behaviorLists: personalDetails[], objections[], priorities[], beliefs[]
  awareness: openingLine, problemAwareness, solutionAwareness
  context: b2b|b2c, companyInfo, scenarioContext
  modes: text | voice | both   (proto: text)
  media: avatarRef, voiceRef   (proto: initials avatar)

Playbook (EvaluationTemplate)
  title, contactType, status draft|published
  stages[]: { name, description, weight?, criteria[] }
  criteria: { name, weight, yesNoQuestion, passRule?, active }
  compatibleScenarioTypes[] | used by Scenario.playbookId

Scenario (practice unit)
  title, funnelStage, objective, difficulty, duration
  agentId (default), playbookId
  sellerInstructions, scriptHints[], focus[]

Session
  userId, scenarioId, agentId, playbookId, mode, messages[]
  startedAt, endedAt, artifacts{ transcript, audio? }

Evaluation / Insight
  score 0–100, band, stageResults[], criterionResults[]
  strengths[], improvements[], coachNotes, nextSteps[]
  communicationMetrics{} (later / mock from text)
  timestampedFeedback[] (link to message/time)
```

**Relationship preference**

Videos often bind scenario+template **on the persona**. Client mockups treat Playbooks and Agentes as **parallel libraries**. IMP already has **Scenario as hub** — recommended keep:

`Scenario → Agent + Playbook`  
with override of Agent at simulation setup.

---

## 6. Target user journeys (for UI restructure)

### 6.1 Coach / admin configure

```text
Agentes → Novo Agente (wizard) → Publish
Playbooks → Nova etapa / critérios → Publish (weights = 100)
Cenários → bind Agent + Playbook + seller instructions
```

### 6.2 Trainee practice (video loop, text-first)

```text
Catálogo (or Agente → Treinar)
  → Choose agent
  → Briefing (seller instructions + objective)
  → Free text chat
  → End
  → Central de Insights (dual pane)
  → Refazer / Histórico
```

### 6.3 Manager review

```text
Insights list → open analysis → share/download (later) → coach team
```

---

## 7. Visual system guidance (restructure)

| Do | Don’t |
|----|-------|
| Dark graphite + **amber/orange** IMP accents | Purple Vendiq sidebar/buttons |
| ModuleWorkspaceLayout module shell | Rebuild full CRM chrome from mockups |
| Card grid / timeline / dual-pane Insights | Flat admin tables only |
| Initials or IMP-owned avatars | Stock marketplace / Vendiq avatar pack |
| Text mode honest | Fake waveform pretending real voice |
| Client labels: Agentes / Playbooks / Insights | Mixing Persona/Template language inconsistently |

Density targets:

- Agentes: **gallery cards** not only list rows  
- Playbooks: **numbered timeline + distribution rail**  
- Insights: **≥50% width transcript**, right metrics stack  

---

## 8. Gap vs current IMP `training-ai` (for your restructure)

| Area | Reference expectation | Current prototype (approx.) | Restructure priority |
|------|----------------------|----------------------------|----------------------|
| Triple IA language | Agentes / Playbooks / Insights | Nav renamed; still uneven copy | P0 consistency |
| Agent gallery | Photo cards, status, KPIs | Initials cards (improved) | P1 photos optional |
| Agent wizard depth | 6 steps, draft, mode toggles, lists | Multi-step stub of fields | P0 deepen behavior lists |
| Awareness / B2B block | Explicit in videos | Weak / missing | P1 |
| Playbook stage weights + publish | Mockup core | Criteria weights; timeline UI starting | P0 stage model + publish |
| Compatible scenarios on playbook | Video | Reverse link only | P1 |
| Simulation start from agent | Video primary | Catalog primary | P0 both entry points |
| Voice | Dominant in refs | Out of scope proto | Defer |
| Insights dual pane | Mockup + video | Partial | P0 harden layout |
| Timestamped coaching | Video modal | Missing | P1 (message-linked) |
| Sentiment / waveform | Mockup | Missing | Defer |
| Comm metrics Ideal ranges | Mockup | Weak/mock | P1 text-derived metrics |
| Engagement dashboards | Video only | Out | Skip |

---

## 9. Recommended restructure phases

### Phase R1 — Information architecture (UI + data shape)

- Make **Agentes / Playbooks / Cenários / Catálogo / Insights** roles crystal-clear.  
- Deepen Agent model (lists + awareness + status + draft).  
- Align Playbook to **stages with descriptions + distribution rail** (weights rule: criteria sum 100; stage weight = sum children).  
- Scenario remains binder.

### Phase R2 — Practice & Insights fidelity

- Dual entry: Catálogo **and** Agente → Treinar.  
- Simulation workspace denser (brief + sticky agent DNA).  
- Insights report: dual pane, radar from stages, strengths/improvements/next steps, message-linked coaching notes.  
- Session ids for history (fix report collisions).

### Phase R3 — Media & judge (product)

- Provider LLM for replies + optional LLM judge on yes/no questions.  
- Voice/STT/TTS, waveform, sentiment.  
- Real Ideal metrics (talk ratio, interruptions).

---

## 10. Decisions you should lock before rebuilding

| # | Decision | Suggestion |
|---|----------|------------|
| R1 | Primary practice entry | **Both** Catálogo + Agente (Catálogo default for BDR skills) |
| R2 | Weight model | Criteria % sum to **100**; stage weight derived |
| R3 | Playbook publish | `draft` / `published`; only published selectable |
| R4 | Voice in next UI restructure | **UI stubs only**; no audio stack |
| R5 | Insights = training only or real calls too | **Training sessions first**; don’t merge BDR call analytics yet |
| R6 | Trait UX | Pills + free list (max 3 highlight pills on cards) |
| R7 | Avatar | Initials now; optional upload later — no Vendiq gallery |

---

## 11. Appendix — DOCX full text (normalized)

**Configurador de Agentes (Personas)**  
Cérebro comportamental. Agentes com personalidade, dores e consciência. Perfil visual humano, nome e cargo. DNA (Analítico, Agressivo, Cético, Inseguro…). Contexto B2B/B2C, empresa, setor, objeções.

**Playbooks de Score (Templates)**  
Régua de sucesso. Timeline (Abertura, Rapport, Qualificação, Fechamento). Critérios sim/não na transcrição. Pesos → nota 0–100.

**Central de Insights**  
Dados estratégicos. Transcrição com sentimento. Radar de competencies. Repositório de áudio + análise AI. Feedback contínuo.

**Objetivo final**  
Treino escalável em ambiente seguro antes do cliente real.

---

## 12. Appendix — Out of scope from references

- Vendiq Engajamento / Ranking / Performance dashboards as product  
- Credits/minutes per group  
- Full avatar + voice marketplace  
- Cloning purple visual system  
- Webinar plan in this folder  

---

## 13. How to use this report

1. Lock decisions §10.  
2. Sketch wireframes for: Agentes grid, Agente wizard, Playbook timeline, Insights dual-pane, Simulation loop — against **IMP tokens**, using mockup **composition**.  
3. Adjust data model §5 before large UI rewrite.  
4. Treat videos as field/flow checklist; treat client PNGs as IA/layout targets.

When you start the restructure, this document is the shared source of truth across design and implementation.

---

## 14. Implementation progress log

| When | Step | Status |
|------|------|--------|
| 7 ago 2026 | Locked §10 defaults | Done |
| 7 ago 2026 | R1 Agent domain (lists, awareness, B2B, status) + 6-step wizard | Done |
| 7 ago 2026 | R1 Playbook stage description + published/draft + rail | Done |
| 7 ago 2026 | R1 Dual entry Catálogo + Agente→Treinar; Scenario binds published playbooks | Done |
| 7 ago 2026 | R2 Session-id Insights routes; dual-pane; message-linked coaching; denser briefing | Done |
| 7 ago 2026 | R3b Voice UI scaffolding: sim Texto\|Voz chrome, Insights waveform + sentiment markers, voice picker stub | Done |
| 7 ago 2026 | R3a Offline LLM-shaped provider (`llm-mock`): async DNA replies, `judgeRubric` contract, keyword fallback, async sim/finish | Done |
| — | Real OpenAI-compatible HTTP + Ideal audio metrics | Deferred |
