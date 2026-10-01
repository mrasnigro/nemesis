# Treinamento IA — Análise de Produto e Arquitetura (Referência × IMP)

**Tipo:** Análise de produto / arquitetura (sem alteração de código)  
**Data:** 5 agosto 2026  
**Status:** Aguardando decisão de evolução — **não implementar ainda**  
**Materiais analisados:**
- `docs/ai-reference/video-01.mp4` (~19,9 min, 1916×908)
- `docs/ai-reference/video-02.mp4` (~16,9 min, 1440×824) — URL observada: `app.vendiq.com.br`
- Módulo atual: `src/modules/training-ai/`

**Produto de referência identificado:** **Vendiq** (“POTENCIALIZA SUAS VENDAS”) — plataforma de IA para treinamento de vendas.  

> **Regra de trabalho:** estudar para **adaptar conceitos** ao IMP. **Não copiar** marca, UI roxa/laranja, copy proprietária, avatares, vozes TTS ou fluxos Admin do Vendiq.

---

## 0. Resumo executivo

| Dimensão | Vendiq (referência) | IMP `training-ai` (hoje) |
|----------|---------------------|---------------------------|
| Posicionamento | Plataforma dedicada de simulação de vendas por voz/texto com personas configuráveis | Módulo CRM: catálogo → simulação MCQ → relatório heurístico |
| Persona | Objeto rico (avatar, voz, negociador, objeções, crenças, B2B context) | Blob mínimo (nome, cargo, empresa, humor) embutido no cenário |
| Cenário | Catálogo tipado (contato frio, discovery, pós-venda…) + instruções + template de avaliação | 3 seeds com turns scriptados |
| Conversa | Principalmente **voz** (gravação + transcrição); texto como modo | **Múltipla escolha** de falas (sem áudio real) |
| Avaliação | Template com seções/critérios binários + pesos + feedback com timestamp | Score 0–100 + 4 dimensões sintéticas + strengths/improvements |
| Gestão | Personas, templates, histórico, dashboards, usuários/grupos/créditos minutos | Só Catálogo (+ simulação/relatório por rota) |
| Integração comercial | Instruções citam leads IMP (exemplo nos vídeos) | Isolado; handoff BDR não existe no módulo |

**Conclusão:** o IMP já cobre o **esqueleto democável** (catálogo → prática → nota). A referência mostra o **modelo de domínio** que o módulo deve evoluir: **Persona × Cenário × Template de Avaliação × Sessão × Relatório**, com conversa livre (voz/texto) e rubrica explícita — sem portar a skin Vendiq.

---

## 1. Conceitos aproveitáveis

### 1.1 Entidades de domínio

1. **Persona** — “cliente simulado” com identidade, estilo de negociador, contexto empresarial e scripts de comportamento (objeções, crenças, abertura).  
2. **Cenário de simulação** — estágio do funil (ex.: *Primeiro Contato Frio*, *Descoberta/Qualificação*, *Pós-Venda*).  
3. **Template de avaliação** — rubrica reutilizável ligada ao tipo de contato (ex.: *Contato Telefônico - Frio*).  
4. **Sessão / Histórico** — instância de treino (usuário, persona, tempo, score, conversa).  
5. **Modo de interação** — voz | texto | ambos.  
6. **Instruções ao vendedor** — briefing pré-call (o que o trainee vê antes de começar).  
7. **Crédito / minutos** (conceitual) — consumo de simulação por grupo (só relevante se IMP monetizar/medir uso).

### 1.2 Conceitos de coaching

- Avaliação por **checklist de critérios** (pass/fail) agrupados em seções, com **pesos = 100**.  
- Feedback **qualitativo** (pontos positivos / negativos) além da nota.  
- Ligação entre feedback e **momento da conversa** (timestamp / trecho).  
- Ações pós-treino: **Ver conversa**, **Refazer**, histórico por usuário.

### 1.3 Conceitos de IA (arquitetura futura)

- Persona alimenta system prompt / parâmetros de diálogo.  
- Template alimenta juiz (LLM judge) ou pipeline de scoring.  
- Transcrição + áudio como artefatos da sessão.  

No IMP atual esses serviços **não existem** (turns mock) — a adaptação deve prever a **forma dos dados** mesmo com score heurístico no protótipo.

---

## 2. Funcionalidades relevantes (referência)

| Área | O que os vídeos mostram | Relevância IMP |
|------|-------------------------|----------------|
| Minhas Personas | Galeria/lista, busca, filtros por cenário, criar/editar | Alta — falta CRUD e modelo rico |
| Avatar + voz | Escolher avatar, voz TTS, preview de áudio | Média no protótipo (UI); Alta no produto real |
| Construção do cenário | Tags, cenário, template, instruções, contexto adicional | Alta |
| Modos voz/texto | Cards de seleção | Alta (começar por texto; voz depois) |
| Características comportamentais | Detalhes pessoais, objeções, prioridades, crenças (listas) | Alta para qualidade do roleplay |
| Consciência problema/solução | Texto opcional de awareness | Média–Alta |
| Contexto B2B/B2C | Empresa, setor, cargo | Alta (alinha BDR/prospecção) |
| Templates de Avaliação | Seções + critérios Sim/Não + peso | Alta |
| Relatório | Score, tempo, +/- , critérios ✓/✗, ver conversa, refazer | Alta — IMP já tem versão fraca |
| Feedback modal | Coaching com timestamp + player + transcrição | Alta no futuro; mock agora |
| Dashboards engajamento | DAU/WAU, minutos em simulação | Baixa no MVP módulo; possível métricas shell |
| Admin usuários/grupos | Limite minutos, convites | Fora do módulo training-ai (já há Admin IMP) |
| Ranking / Performance | Dashboards comerciais da plataforma | Não copiar como produto paralelo |

---

## 3. Fluxos de usuário (referência)

### 3.1 Fluxo principal de treino (operador)

```text
Login
  → Minhas Personas
    → Filtrar por cenário (ex.: Contato Frio)
      → Selecionar persona (ex.: Camilo)
        → Revisar instruções / negociador / cargo
          → [Simulação por Voz] (ou texto)
            → Diálogo (áudio + turno cliente/vendedor)
              → Relatório de Simulação
                → Resultados | Métricas de Comunicação
                → Ver conversa / Refazer / Histórico
```

### 3.2 Fluxo de configuração (admin/coach)

```text
Criar Persona
  → Informações básicas (nome, local, tipo negociador, idioma)
  → Avatar + voz
  → Construção do cenário (cenário + template + instruções)
  → Modo de interação
  → Características comportamentais (objeções, prioridades, crenças…)
  → Consciência / contexto B2B
  → Salvar
```

```text
Templates de Avaliação
  → Criar seções (ex.: Abertura, Qualificação)
  → Critérios Sim/Não + pesos (soma 100)
  → Publicar / reutilizar em personas
```

### 3.3 Fluxo IMP atual

```text
Catálogo
  → Iniciar cenário seed
    → 3 turnos MCQ (persona fala → trainee escolhe opção)
      → Relatório (score + dimensões + listas)
        → Novo treinamento / Refazer
```

**Gap de fluxo:** não há “biblioteca de personas”, nem configuração de rubrica, nem conversa livre, nem gravação/transcrição.

---

## 4. Estrutura de templates (avaliação)

### 4.1 Modelo observado (Vendiq)

- **Template** associado a tipo de contato (ex.: *Contato Telefônico - Frio*).  
- Organizado em **seções** (nome: “Abertura”, “Prospecção”, “Qualificação”…).  
- Cada **critério**:
  - nome
  - **peso** (numérico; soma da seção/template = 100)
  - **pergunta binária** para o avaliador IA (“O vendedor cumprimentou e se apresentou?”)
- No relatório: critérios com ✓ / ✗ e score parcial (ex.: **07/08** em Prospecção).

### 4.2 Modelo IMP atual

- Não há template editável.  
- `buildEvaluation()` soma `good|weak|poor` das opções MCQ e gera 4 dimensões (*Rapport, Clareza, Proposta de valor, Próximo passo*) de forma **derivada**, sem rubrica explícita.

### 4.3 Adaptação recomendada ao IMP

Definir schema de domínio (mesmo se UI admin vier depois):

```text
EvaluationTemplate {
  id, title, contactType
  sections: [{
    id, name, weight
    criteria: [{ id, name, weight, yesNoQuestion }]
  }]
}
```

Protótipo: seeds de 1–2 templates alinhados ao script BDR (abertura, dor, qualificação, próximo passo). Scoring mock pode marcar pass/fail por qualidade da opção *ou* por regras simples até existir juiz IA.

---

## 5. Estrutura de personas

### 5.1 Campos observados (referência)

| Bloco | Campos |
|-------|--------|
| Básicos | Nome, localização, tipo de negociador, idioma |
| Visual/áudio | Avatar, voz (locale), preview |
| Cenário | Etiquetas, cenário da simulação, template de avaliação |
| Briefing | Instruções ao vendedor, contexto adicional |
| Interação | Voz / texto / ambos |
| Comportamento | Detalhes pessoais, objeções comuns, prioridades, crenças/opiniões (listas) |
| Abordagem (opc.) | Frase de abertura, consciência do problema, consciência da solução |
| Contexto vendas | B2B/B2C, empresa, setor, cargo |
| Objetivos | Lista de objetivos/dores (removíveis) |

**Tipos de negociador vistos:** Cliente Analítico, Cliente Dominante (e similares).  
**Cenários vistos:** Primeiro Contato Frio, Descoberta/Qualificação, Primeiro Contato Morno, Pós-Venda, Contato Receptivo.

### 5.2 Persona IMP atual

```js
persona: { name, role, company, mood }
+ scriptHints[]
```

Embutida *dentro* de `trainingScenarios[]` — não é entidade própria.

### 5.3 Adaptação recomendada

Separar:

```text
Persona { identity, negotiatorType, locale, behaviorLists, salesContext, openingLine, awareness }
ScenarioTemplate { funnelStage, defaultInteractionModes }
TrainingScenarioConfig { personaId, scenarioStage, evaluationTemplateId, sellerInstructions }
```

No protótipo: enriquecer seeds sem TTS/avatar reais (placeholders IMP).

---

## 6. Modelo de conversação

### 6.1 Referência

- Modo dominante: **simulação por voz** (telefone / player).  
- Artefatos: **gravação** + **transcrição** com turnos Cliente × Vendedor + timestamps.  
- Persona inicia com **frase de abertura** configurável (“Bom dia, pois não!?”).  
- Diálogo aparentemente **livre** (não MCQ na UI de relatório).  
- Coach comenta trechos por timestamp (ex.: 00:45).

### 6.2 IMP atual

- Chat textual estilo bolhas (`imp-chat`).  
- Cada turno: fala IA fixa + **3 opções** `good|weak|poor`.  
- Sem áudio, sem STT, sem LLM, sem free text.

### 6.3 Adaptação recomendada (evolução em camadas)

| Camada | Modelo | Uso |
|--------|--------|-----|
| **A (agora/protótipo)** | MCQ enriquecido (já existe) | Demo estável sem backend IA |
| **B** | Texto livre + respostas mock por regras / branching | Melhor UX sem voz |
| **C** | Texto livre + LLM (persona prompt + judge) | Produto real |
| **D** | Voz (WebRTC/TTS/STT) | Paridade com referência |

**Não** copiar a obrigação de voz no MVP IMP: o demo atual e a ausência de serviços de mídia tornam **texto-first** mais coerente com o restante do CRM.

---

## 7. Sistema de avaliação

### 7.1 Referência — camadas do relatório

1. **Header da sessão** — trainee, data/hora, nome do template/cenário.  
2. **Resultados** — tempo de negociação, desempenho (nota 0–100 / gauge).  
3. **Pontos positivos / negativos** — texto coach.  
4. **Critérios** — checklist por seção com pass/fail.  
5. **Métricas de comunicação** — aba separada (tom, ritmo, etc. — superfície observada).  
6. **Ver conversa** — player + transcrição + feedback contextual.  
7. **Refazer / Histórico / Novo feedback**.

### 7.2 IMP atual

- Score agregado + pill de banda (`Excelente`…`Precisa reforço`).  
- 4 barras de dimensão.  
- Listas strengths / improvements baseadas nas labels das opções.  
- `coachNotes` binário por limiar 80.

### 7.3 Adaptação recomendada

Manter score + banda (já IMP-friendly), e evoluir para:

- Rubrica explícita (seção/critério) mesmo que pass/fail seja mock.  
- Separar **conteúdo comercial** (dor, qualificação, next step) de **métricas de comunicação** (futuro).  
- Persistir histórico por usuário (hoje só sessão em memória).  
- CTA **Ver conversa** reabrindo o transcript da sessão (já possível com `messages[]`).

---

## 8. O que pode ser adaptado ao IMP

### 8.1 Adaptar (sim)

| Ideia | Como no IMP |
|-------|-------------|
| IA de domínio Persona / Cenário / Template | Novos modelos em `data/` + páginas/nav |
| Listar personas + iniciar treino | Evoluir Catálogo |
| Briefing “Instruções ao vendedor” | Card pré-simulação |
| Modo texto primeiro | Expandir Simulation |
| Rubrica com critérios e pesos | Seeds + Report UI |
| Relatório com ✓/✗ + score + ver conversa | Estender Report |
| Tipos de cenário alinhados ao BDR | Contato frio, objeção, diagnóstico/termômetro |
| Handoff conceito comercial | Links para BDR / Prospecção pós-treino (como Webinar) |
| Histórico de treinos | Lista estável no catálogo (já começa) |
| Visual IMP | Graphite/âmbar `imp-*` / ModuleWorkspace — **não** purple Vendiq |

### 8.2 Não adaptar / não copiar (não)

| Ideia | Motivo |
|-------|--------|
| Identidade visual Vendiq (roxo/laranja, logo, login) | Pedido explícito + identidade CRM IMP |
| Avatares fotográficos stock + vozes TTS catalogadas | Custo/complexidade; risco de clone |
| Plataforma standalone de engajamento/ranking como produto paralelo | IMP já tem launcher + Admin |
| Créditos/minutos por grupo no Admin training | Admin IMP já governa módulos; monetização fora do escopo demo |
| Obrigar simulação por voz no MVP | Sem stack de mídia no protótipo |
| Dashboard DAU/WAU/fidelização | Não é núcleo do módulo Treinamento |
| Copiar UX densa de formulário longo “cria persona” pixel a pixel | Adaptar em etapas; excesso quebra demo |

### 8.3 Melhorias necessárias no módulo atual

1. **Modelo de dados**: separar Persona vs Scenario vs EvaluationTemplate vs Session.  
2. **Nav**: Catálogo · Personas (ou “Cenários”) · Histórico · (Templates se `training.manage`).  
3. **Simulação**: briefing visível; opções MCQ com qualidade + (fase B) free text.  
4. **Relatório**: rubrica + transcript + refazer.  
5. **Permissões**: além de view/simulate/report, considerar `training.manage` (editar personas/templates — alinhado a outros módulos).  
6. **Visual**: remover inline styles; cards IMP; empty states.  
7. **Integração narrativas**: cenários que treinem skill do BDR (abertura, objeção, termômetro).  
8. **Honestidade do mock**: manter label de simulação (sem fingir LLM se não houver).

---

## 9. Comparativo detalhado vs `src/modules/training-ai/`

| Capacidade | Vendiq | IMP hoje | Gap |
|------------|--------|----------|-----|
| Shell | App próprio | `ModuleWorkspaceLayout` | OK |
| Nav | Personas / Templates / Histórico + dashboards | Só **Catálogo** | Expandir |
| Catálogo | Personas filtradas por cenário | 3 cenários seed | Enriquecer |
| Persona editor | Form completo multi-seção | Não existe | Novo |
| Templates editor | Critérios/pesos | Não existe | Novo |
| Simulação | Voz (+ texto) | MCQ texto | Evoluir |
| Avaliação | Rubrica + coach + áudio | Heurística MCQ | Evoluir |
| Histórico | Persistente na UI | Sessão memória | Melhorar |
| Métricas módulo | Completados / score / streak | Seeds estáticos | Liga ao histórico |
| Permissões | Admin grupos/usuários | `view/simulate/report` | Opcional manage |
| CSS próprio | App dedicado | Só `imp-*` | Opcional `training-ai.css` |

**Arquivos IMP atuais (baseline):**

- `Layout.jsx` — nav única  
- `pages/Catalog.jsx` | `Simulation.jsx` | `Report.jsx`  
- `data/seeds.js` — cenários + turns + `buildEvaluation`  
- `data/catalogs.js` — difficulty / score bands  
- `context/TrainingAiContext.jsx` — state machine idle/running/finished  
- `services/trainingPermissions.js`

---

## 10. Ideias que devemos implementar (backlog priorizado)

### P0 — Evolução de domínio no protótipo (sem LLM/voz)

1. Extrair **Persona** e **EvaluationTemplate** como seeds editáveis na UI (ou ao menos dados estruturados).  
2. Tela/fluxo de **briefing** antes da simulação.  
3. Relatório com **critérios ✓/✗** alinhados ao template (mesmo se derivados do MCQ).  
4. **Ver conversa** a partir do relatório (reuso de `messages`).  
5. Nav: Catálogo + Histórico (páginas/âncoras).  
6. Alinhar cenários ao vocabulário BDR (contato frio, objeção de preço, diagnóstico/termômetro — já parcialmente).  

### P1 — Qualidade de treino

7. Mais turns / ramificações por qualidade da resposta.  
8. Free-text opcional com avaliação mock (keywords / classificador simples).  
9. `training.manage` + UI mínima de edit persona/template.  
10. Métricas do catálogo calculadas do histórico real da sessão.  

### P2 — Produto real (pós-backend)

11. LLM persona + LLM judge com template.  
12. Gravação/STT/TTS e feedback timestamped.  
13. Persistência multi-usuário / ranking por equipe.  

---

## 11. Ideias que não fazem sentido (agora)

- Clonar login/branding Vendiq.  
- Implementar stack de voz completa só para demo.  
- Dashboard de engajamento estilo “fidelização SaaS” dentro do módulo.  
- Marketplace de avatares/vozes.  
- Créditos de minutos por grupo (Admin IMP já resolve acesso a módulos).  
- Substituir BDR training scripts pelo player Vendiq — são produtos diferentes (discagem real vs roleplay).  

---

## 12. Proposta de evolução do módulo IMP

### 12.1 Norte de produto

> **Treinamento IA no IMP** = academismo do time comercial **dentro do CRM**: personas e cenários calibrados ao playbook IMP/BDR, prática curta, feedback acionável, histórico — identidade visual e navegação **IMP**, inteligência pluggable.

### 12.2 Arquitetura alvo (lógica)

```text
training-ai/
  data/
    personas.js
    scenarios.js          # ligação persona + stage + tips
    evaluationTemplates.js
    simulationScripts.js  # turns MCQ (camada A) / prompts (camada C)
  services/
    scoring.js            # apply template + answers → report
    conversation.js       # future LLM adapter
  pages/
    Catalog.jsx
    Personas.jsx          # P0/P1
    Simulation.jsx
    Report.jsx
    Templates.jsx         # P1
    History.jsx           # P0
  context/
    TrainingAiContext.jsx
```

### 12.3 Fases de entrega sugeridas

| Fase | Entrega | Critério de aceite |
|------|---------|--------------------|
| **F0** | (este doc) alinhamento | Stakeholder valida P0/P1 |
| **F1** | Modelo de dados + Report rubrica + Ver conversa + Histórico nav | Demo mais “produto” sem API IA |
| **F2** | Personas CRUD mock + briefing + mais cenários BDR | Manage permission |
| **F3** | Texto livre + scoring melhor | Ainda sem voz |
| **F4** | Integração LLM + (opcional) voz | Fora do protótipo atual |

### 12.4 Princípios de UX IMP

- Shell: `ModuleWorkspaceLayout` + tokens `:root` graphite/âmbar.  
- Primárias âmbar/azul IMP; success/danger para ✓/✗.  
- Não portar sidebar/conteúdo light purple do Vendiq.  
- Manter português operacional do CRM.

### 12.5 Riscos

| Risco | Mitigação |
|-------|-----------|
| Escopo inflar para “mini-Vendiq” | Limitar F1–F2 ao domínio + demo |
| Expectativa de IA real na demo | Label “simulação” / turns mock explícitos |
| Duplicar Admin | Usuários/grupos ficam no Admin IMP |
| Desalinhamento com BDR | Cenários e critérios espelham script/disposições |

---

## 13. Decisões em aberto (antes de codar)

| # | Pergunta | Default sugerido |
|---|----------|------------------|
| D1 | Priorizar F1 (rubrica + histórico) ou F2 (CRUD personas)? | **F1** |
| D2 | Incluir modo voz no roadmap próximo trimestre? | **Não** — só texto |
| D3 | Templates editáveis na UI ou só seeds? | Seeds em F1; editor em F2 |
| D4 | Free-text na simulação já em F1? | **Não** — manter MCQ; free-text F3 |
| D5 | Criar `training.manage` já? | Sim se F2; senão adiar |

---

## 14. Evidências dos materiais

| Fonte | Duração | Conteúdo predominante |
|-------|---------|------------------------|
| `video-01.mp4` | ~20 min | Personas (wire/form), cenário, modos, relatório, critérios de avaliação, dashboards engajamento, admin grupos |
| `video-02.mp4` | ~17 min | Login Vendiq, biblioteca personas + detalhe, CTA Simulação por Voz, formulário comportamental, relatório com playback/transcrição |

**Nota:** Foi gerado material de trabalho em `docs/ai-reference/_frames/` (amostras JPEG) e `_extract_frames.py` apenas para análise. Podem ser removidos depois; **não** fazem parte do produto.

Arquivo `docs/ai-reference/WEBINAR_VISUAL_ADAPTATION_PLAN.md` parece fora de contexto nesta pasta (plano Webinar); ignorado nesta análise.

---

## 15. Próximo passo

Aguardar aprovação das decisões **D1–D5** e da sequência **F1 → F2**.  
**Nenhuma alteração de código** neste ciclo — este documento é a base para a evolução do módulo `training-ai`.
