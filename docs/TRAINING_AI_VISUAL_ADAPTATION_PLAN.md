# Treinamento IA — Plano de Adaptação Visual (Protótipo)

**Tipo:** Adaptação visual / UI polish (módulo existente)  
**Data:** 7 agosto 2026  
**Status:** Implementado — Similarity v2 (mockups + video loop)  
**Produto alvo:** identidade e experiência do **IMP Platform / CRM IMP**  
**Análise de domínio:** [`TRAINING_AI_REFERENCE_ANALYSIS.md`](./TRAINING_AI_REFERENCE_ANALYSIS.md)

> **Regra:** adaptar IA e densidade dos mockups/client doc + loop dos vídeos. **Não** clonar brand Vendiq, purple UI, stock photo avatars ou player de voz.

---

## Similarity v2 (7 ago 2026)

Passe posterior ao polish de panels: alinhamento visual/estrutural aos materiais em `docs/ai-reference/` (agora na raiz: `imp_agentes_humanos.png`, `imp_novo_agente_completo.png`, `imp_playbooks_score.png`, `imp_central_insights.png`, vídeos, DOCX).

| Superfície | Alinhamento |
|------------|-------------|
| Nav | Agentes · Playbooks · Insights |
| Agentes | Metric strip + card grid (avatar iniciais, status, traits, simulações) |
| Novo Agente | Wizard vertical + rail Resumo; modos Voz/Ambos desabilitados |
| Playbooks | Timeline de etapas + WeightRing + distribuição |
| Insights / Relatório | Split: transcrição + critérios \| radar + métricas + fortes/melhorias/próximos passos |
| Loop vídeo | Catálogo → Simulação (Agente→Briefing→Conversa) → Insights → Refazer |

**Não clonado de propósito:** fotos stock, CRM sidebar completa dos mockups, waveform/sentimento de áudio, dashboards DAU.

---

## 0. Princípios e limites

### 0.1 Objetivo

Protótipo recognizably alinhado aos mockups do cliente (Agentes / Playbooks / Insights) e ao fluxo dos vídeos, ainda dentro de `ModuleWorkspaceLayout` + tokens IMP.

### 0.2 Não-objetivos

| Não fazer | Motivo |
|-----------|--------|
| Voice / TTS / STT / sentiment em áudio | Fora do protótipo |
| Stock photo avatars / marketplace de voz | Evitar clone e assets externos |
| Session IDs / localStorage / LLM provider | Funcional — depois |
| Quebrar BDR ou permissões de módulos | Escopo só em `training-ai` |
| Clonar visual Vendiq (purple etc.) | Branding IMP |

### 0.3 Decisões de produto (locked)

- Entrada principal: **Catálogo / Cenários**
- Simulação **texto-first**
- Labels de cliente: **Agentes · Playbooks · Insights**
- Provider mock continua

### 0.4 Fonte de verdade visual

| Prioridade | Fonte |
|------------|-------|
| 1 | `src/index.css` tokens (graphite / amber) |
| 1 | `ModuleWorkspaceLayout` + `imp-*` |
| 2 | Mockups cliente em `docs/ai-reference/*.png` (IA/layout) |
| 3 | `training-ai.css` + components Avatar / WeightRing / SectionRadar |
| 1 | `ModuleWorkspaceLayout` + `imp-*` |
| 2 | `training-ai.css` só onde `imp-*` não cobre |
| 3 | Referência conceitual em `docs/ai-reference` — **não** look |

---

## 1. As-is (gaps)

- Shell e primitives `imp-*` já usados; sem vazamento roxo
- Copy “(mock) / Protótipo / sem LLM” em quase todas as páginas
- Sem header de página consistente; empties sem CTA
- Simulação sem stepper; Relatório com painel-header vazio e transcript fechado
- Poucos inline styles; detail grids 1 coluna; `imp-field` inconsistente quando `<label class="imp-field">`

---

## 2. Direção visual (to-be)

| Dimensão | Escolha |
|----------|---------|
| Shell | `ModuleWorkspaceLayout` + nav atual |
| Page chrome | `training-ai__page-header` (título + meta + CTA) |
| Empties | `training-ai__empty` com título, texto, botão primário |
| Simulação | Stepper 3 passos: Persona → Briefing → Conversa |
| Relatório | Hero score + banda; transcript aberto por padrão |
| Forms | Classe `training-ai__form`; labels tipografadas |
| Responsivo | Detail 2-col ≥720px; critérios empilham &lt;640px |

---

## 3. Por tela

| Tela | Mudanças |
|------|----------|
| Catálogo | Page header; metrics sem “(mock)”; empty de cenários; densidade de lista |
| Personas / Cenários / Templates | Header + empty CTA; scrub copy |
| Detalhes | Header; detail grid 2-col; copy sem “seed” |
| Forms | Sem disclaimer protótipo; `training-ai__form`; Cancelar consistente |
| Simulação | Stepper; pill “Conversa por texto”; briefing limpo |
| Relatório | Hero; transcript default on; painéis fortes/melhorias |
| Histórico | Header; empty CTA; sem underline inline |

---

## 4. Arquivos

- `docs/TRAINING_AI_VISUAL_ADAPTATION_PLAN.md` (este)
- `src/modules/training-ai/styles/training-ai.css`
- `src/modules/training-ai/pages/*.jsx`
- `src/layouts/ModuleWorkspaceLayout.css` (link `imp-list-item` + `.imp-field` label fix)

---

## 5. Aceite

- [x] Sem “mock/protótipo/sem LLM” nas superfícies principais
- [x] Listas com header + empty com CTA
- [x] Stepper na simulação; relatório parece coaching finalizado
- [x] Desktop + ~768px usável; tokens IMP
- [x] Funções mock atuais intactas (sem API nova)
- [x] Agentes grid + wizard recognizably aligned to mockups
- [x] Playbooks timeline + weight distribution rail
- [x] Insights dual-pane (transcrição + radar/métricas/insights)
- [x] Nav labels: Agentes · Playbooks · Insights
