# Webinar — Plano de Adaptação Visual ao IMP Platform

**Tipo:** Análise visual + plano de adaptação (sem alteração de código)  
**Data:** 5 agosto 2026  
**Status:** Aguardando aprovação para implementação  
**Referência de produto (cliente):** [https://s1m0ne.tec.br/](https://s1m0ne.tec.br/) — **não copiar** UI/UX do sistema externo  
**Alvo visual:** identidade e experiência do **IMP Platform / CRM IMP**

---

## 0. Princípios e limites

### 0.1 Objetivo

Adaptar o módulo **Webinar** já existente no IMP para que a **aparência, navegação, densidade e padrões de componente** se alinhem ao restante da plataforma (launcher, Admin, BDR e demais módulos `imp-*`), mantendo o escopo funcional atual do protótipo.

### 0.2 Não-objetivos

| Não fazer | Motivo |
|-----------|--------|
| Clonar layout, tipografia, ilustrações ou marca **S1m0ne** | Pedido explícito do cliente / produto |
| Reimplementar streaming, sala ao vivo, chat ou CDN | Fora do protótipo (simulação UI) |
| Migrar Webinar para `DialerLayout` / shell do BDR | BDR é domínio operacional de discagem; Webinar é módulo de eventos/marketing |
| Quebrar rotas, seeds ou permissões atuais | Adaptação é visual/UX de superfície |

### 0.3 Fonte de verdade visual no IMP

| Prioridade | Fonte | Uso neste plano |
|------------|-------|-----------------|
| 1 | `src/index.css` (`:root` graphite/amber) | Tokens de cor, tipografia, raio, sombra |
| 1 | `ModuleWorkspaceLayout` + `ModuleWorkspaceLayout.css` (`imp-*`) | Shell de módulo + cards/métricas/tabelas/botões |
| 2 | Admin `FormModal` / padrões de formulário | Criar/editar evento quando houver UI |
| 2 | BDR (`bdr-theme`, `bdr-home__*`, `bdr-page__back`) | Referência de densidade e hierarquia — **inspiração**, não cópia de classes |
| 3 | S1m0ne (`s1m0ne.tec.br`) | Referência **funcional** de domínio webinar (eventos, acesso, presença) — **não** referência de look |

### 0.4 Nota sobre o sistema real (S1m0ne)

No momento da análise, o site [https://s1m0ne.tec.br/](https://s1m0ne.tec.br/) apresentou proteção anti-bot; a superfície pública confirmada foi a tela de login:

- Título: **S1m0ne - Plataforma de Webinars**
- Campos: Email, Senha
- Ações: Entrar · Esqueceu a senha · Cadastre-se

Conclusão para este plano: S1m0ne valida o **espaço de problema** (plataforma de webinars com conta). A adaptação visual deve **IMP-ificar** o módulo mock (Eventos → Detalhe → Métricas), não reproduzir a skin do S1m0ne.

---

## 1. Estrutura visual atual do Webinar

### 1.1 Inventário de arquivos UI

| Arquivo | Papel |
|---------|-------|
| `src/modules/webinar/Layout.jsx` | Provider + `ModuleWorkspaceLayout` (1 item de nav: Eventos) |
| `src/modules/webinar/pages/Events.jsx` | KPIs + lista “Gestão de eventos” + Publicar |
| `src/modules/webinar/pages/Detail.jsx` | Resumo do evento + tabela de participantes + presença |
| `src/modules/webinar/pages/Metrics.jsx` | KPIs de presença + engajamento + handoff BDR/Prospecção |
| `src/modules/webinar/context/WebinarContext.jsx` | Estado mock + permissões |
| `src/modules/webinar/data/seeds.js` | Eventos, participantes, labels |
| *(sem CSS próprio)* | Todo o visual vem de `ModuleWorkspaceLayout.css` + tokens globais |

**Stub legado (não usado nas rotas atuais):** `src/pages/modules/Webinar.jsx`.

### 1.2 Arquitetura de telas (as-is)

```text
/modules/webinar
├── Events          → métricas 4-up + lista de cards (imp-list-item)
├── :eventId        → toolbar Voltar/Métricas + painel resumo + tabela participantes
└── :eventId/metricas → toolbar + KPIs + grid 2 colunas (engajamento / próximos passos)
```

### 1.3 Shell atual

- Layout: `module-workspace` (sidebar 240px + main)
- Brand: marca **IMP** âmbar + “CRM IMP” / subtítulo “Webinar”
- Badge: **Live**
- Nav interna: **apenas Eventos** (texto, sem ícones)
- Header: eyebrow + `h1` “Webinar” + usuário + Sair
- Conteúdo: `imp-module` com `max-width: 1200px`
- Footer da sidebar: “← Módulos IMP”

### 1.4 Primitivas usadas hoje

| Elemento | Classes | Observação |
|----------|---------|------------|
| Métricas | `imp-module__metrics` / `imp-metric` | 4 colunas; números 1.75rem |
| Painéis | `imp-panel` / `imp-panel__header` | Lista e seções |
| Lista | `imp-list` / `imp-list-item` | Eventos como linhas-card |
| Status | `imp-pill` (`--amber/--green/--muted/--rose`) | Evento e participante |
| Botões | `imp-btn` (`--primary/--ghost`) | Sem toolbar “Voltar” estilo BDR |
| Tabela | `imp-table` | Participantes |
| Progresso | `imp-progress` | Só na página de métricas |
| Formulários | — | **Inexistentes** (há `imp-field` no CSS compartilhado, não usado) |
| Inline styles | vários em Events/Detail/Metrics | Espaçamento/cor sem classes |

### 1.5 Estado funcional visual vs permissões

| Permissão | Label | UI atual |
|-----------|-------|----------|
| `webinar.manage` | Gerenciar webinars (criar/editar) | Só botão **Publicar** em rascunho — **sem criar/editar** |
| `webinar.participants` | Participantes | Tabela + Presente / No-show |
| `webinar.metrics` | Métricas | Página metricas + link no detalhe |

---

## 2. Diferenças vs CRM IMP (e vs módulos maduros)

### 2.1 O que já está alinhado

- Dark graphite (`#111827` / `#1f2937`) e accent âmbar (`#f59e0b`)
- Fontes Inter + Space Grotesk
- Shell de módulo igual a Radar / VSL / Training / Prospecting (`ModuleWorkspaceLayout`)
- Pills, métricas e painéis do design system `imp-*`

### 2.2 Lacunas de experiência IMP

| Dimensão | CRM IMP / BDR maduro | Webinar hoje | Impacto |
|----------|----------------------|--------------|---------|
| Densidade visual | Métricas maiores, spacing ritmado, hierarquia clara | Lista genérica + styles inline | Parece “placeholder” |
| Navegação de módulo | Itens com ícone / grupos (ex.: Dialer) | Um único link texto | Difícil localizar Métricas/participantes no mapa mental |
| Toolbar de página | `bdr-page__back` slate consistente | `imp-btn--ghost` “← Voltar…” | Quebra consistência entre módulos |
| Empty / loading states | Copy e cards próprios | `imp-empty` mínimo | Pouco polish demo |
| Formulários | `FormModal` + fields | Zero create/edit | Permissão `manage` subutilizada |
| CSS de módulo | `bdr-theme` / `Bdr.css` / foundation | Nenhum `webinar*.css` | Overrides inline; difícil evoluir |
| Cards de evento | Em BDR: status badge + CTA alinhados | `imp-list-item` com coluna de ações vertical ad-hoc | Visual “lista” frágil |
| CTAs rápidos | Botões centralizados / ícones lucide em Quick Actions | Ghost/Primary sem ícone | Menos legível em demo |
| Responsivo | Breakpoints explícitos em BDR | Grid 4-up métricas sem variante forte | Métricas apertam em viewport médio |

### 2.3 Diferença vs S1m0ne (domínio, não visual)

O sistema real é uma **plataforma de webinars** (conta, acesso, operação de evento). O IMP Webinar é um **módulo de gestão pós/pré-evento dentro do CRM** (lista, presença, métricas, handoff comercial).  

A adaptação visual **não** deve aproximar Webinar do look do S1m0ne; deve aproximar Webinar do look do **IMP**, mantendo fluxos do protótipo.

---

## 3. Componentes que precisam ser adaptados

### 3.1 Prioridade P0 — superfície já existente

| Componente / superfície | Ação proposta |
|-------------------------|---------------|
| `WebinarLayout` / nav | Ampliar mapa de navegação; ícones; estados ativos IMP |
| `Events.jsx` | Cabeçalho de página IMP; cards de evento tipados; CTA “Novo evento” (mesmo que desabilitado ou mock); remover inline styles |
| `Detail.jsx` | Toolbar Voltar alinhada; hero do evento (título, status, meta); tabela participantes polida; ações de presença |
| `Metrics.jsx` | KPIs + painéis com tipografia/tokens consistentes; handoff como card de ações |
| Shared `imp-*` uso | Preferir classes existentes; criar **somente** `webinar-*` onde `imp-*` não cobrir |

### 3.2 Prioridade P1 — componentes novos (ainda no design IMP)

| Componente sugerido | Função |
|---------------------|--------|
| `WebinarEventCard` | Card padrão de evento (status, data, host, CTAs) |
| `WebinarPageHeader` | Título + subtítulo + Voltar + ações primárias |
| `WebinarMetricStrip` | Wrapper tipado das 4 métricas (ou reuso estrito de `imp-metric`) |
| `WebinarParticipantTable` | Tabela + empty + pills |
| `WebinarEventFormModal` (opcional P1) | Criar/editar com `FormModal` + `imp-field` / campos admin |

### 3.3 Prioridade P2 — polish

- Ícones de nav / CTAs (padronizar stroke lucide-style como BDR `DialerIcons`)
- Empty states por página
- Skeleton/loading (se houver fetch futuro)
- Remover stub `pages/modules/Webinar.jsx` ou realinhar export

---

## 4. Navegação

### 4.1 Rotas atuais (manter)

| Rota | Página |
|------|--------|
| `/modules/webinar` | Eventos |
| `/modules/webinar/:eventId` | Detalhe |
| `/modules/webinar/:eventId/metricas` | Métricas |

Proteção: `ProtectedRoute` + `ModuleRoute moduleId="webinar"`.

### 4.2 Nav interna proposta (visual)

Hoje só **Eventos**. Para experiência IMP mais clara (sem copiar S1m0ne), sugerido:

| Item nav | Destino | Nota |
|----------|---------|------|
| Eventos | `/modules/webinar` | Mantém `end: true` |
| *(opcional)* Métricas (overview) | futuro `/modules/webinar/metricas` | **Não existe** — só inventar se produto pedir; senão métricas continuam por evento |
| Voltar ao launcher | `/dashboard` | Já no footer da sidebar |

Navegação **in-context** (toolbar):

- Detail → Voltar aos eventos; Ver métricas  
- Metrics → Voltar ao evento  

Padronizar botão Voltar com padrão visual compartilhado (classe dedicada ou alinhamento a `bdr-page__back` via token/`imp-btn` aprimorado — decidir na implementação).

### 4.3 Registry / launcher

Já registrado em `registry.js` (amber, badge Live, features). Adaptação visual **não** exige mudar metadados, salvo alinhar `icon: 'live'` com ícone real no Dashboard se ainda for genérico.

---

## 5. Layout

### 5.1 Manter

- `ModuleWorkspaceLayout` como shell (coerente com outros módulos IMP não-BDR)
- Conteúdo centralizado `max-width ≈ 1200px` (ou elevar para `1280px` se alinhar `bdr-section`)
- Hierarquia: header workspace → conteúdo página → seções

### 5.2 Ajustar

| Área | De | Para (IMP) |
|------|----|------------|
| Page chrome | Título só no shell | Header de página com subtítulo + ações (como Agendamentos / Discagem) |
| Stack Events | Métricas soltas + 1 painel lista | Métricas → toolbar do painel (título + CTA) → grid/lista tipada |
| Detail | Dois painéis soltos | Hero evento + seção participantes com hierarchy |
| Metrics | Header painel vazio + métricas + grid | Remover painel “vazio”; KPIs primeiro; 2 cards abaixo |
| Inline `style=` | Espalhados | Migrar para CSS `webinar-*.css` ou classes `imp-*` |
| Responsivo | Grid 4 colunas rígido | `repeat(auto-fit, minmax(...))` ou breakpoints 1024/768 |

### 5.3 O que evitar

- Colapsar Webinar dentro do `DialerLayout`
- Sidebar largura/estilo idênticos ao Dialer BDR (ícones SVG densos) **sem** motivo — o padrão Module Workspace já é o correto para este módulo

---

## 6. Cores

### 6.1 Tokens oficiais (já usados / a reforçar)

| Token | Valor | Uso Webinar |
|-------|-------|-------------|
| `--bg` | `#111827` | Fundo página |
| `--surface` / `--bg-elevated` | `#1f2937` | Sidebar, cards, painéis |
| `--border` | `#374151` | Bordas |
| `--text-h` / `--text` | `#f3f4f6` | Títulos / corpo |
| `--text-muted` | `#9ca3af` | Meta, labels |
| `--brand` | `#f59e0b` | Accent métricas, badge Live, primary hover rim |
| `--brand-strong` | `#d97706` | Primary hover |
| `--success` | `#22c55e` | Presente / presença média |
| `--danger` / rose pill | `#f87171` | No-show |
| `--shadow-card` | sombra sutil | Métricas e painéis |

### 6.2 Semântica de status (alinhar)

| Status evento | Pill |
|---------------|------|
| `draft` | `imp-pill--muted` |
| `scheduled` / `live` | `imp-pill--amber` |
| `completed` | `imp-pill--green` |

| Status participante | Pill |
|---------------------|------|
| `registered` | `imp-pill--muted` |
| `attended` | `imp-pill--green` |
| `no_show` | `imp-pill--rose` |

### 6.3 Não introduzir

- Paleta S1m0ne (desconhecida / fora de escopo)
- Teal/purple “tema marketing” distinto do CRM
- Fundos claros ou light mode

---

## 7. Cards

### 7.1 Métricas (`imp-metric`)

**Manter** estrutura 4-up. Ajustes sugeridos na implementação:

- Tipografia alinhada à densidade IMP (avaliar `strong` → ~2–2.25rem como `bdr-home__metric` **opcional**)
- Labels em uppercase pequeno ou peso 500 muted (padrão já próximo)
- Grid responsivo

### 7.2 Card / linha de evento

Hoje: `imp-list-item` com título, 2–3 `<p>`, coluna de ações (`flex-direction: column`).

**Proposta IMP:**

```text
┌─────────────────────────────────────────────────────────────┐
│ Título evento                         [Pill status]         │
│ Data · duração · Host                                       │
│ Descrição (1–2 linhas, muted)                               │
│                                    [Abrir] [Publicar|Métricas]│
└─────────────────────────────────────────────────────────────┘
```

- Hover: borda âmbar suave (já em `imp-list-item:hover`)
- CTAs em linha (não coluna), alinhados à direita
- Opcional: card elevado `imp-panel` por evento se lista ficar longa demais

### 7.3 Painéis

Padronizar `imp-panel__header` com:

- `h2` + subtítulo muted  
- slot de ação à direita (Novo evento / Ver métricas)

### 7.4 Cards Metrics (engajamento / próximos passos)

Manter `imp-grid-2`; remover estilos inline; botões handoff com hierarquia Primary = BDR, Ghost = Prospecção (já ok).

---

## 8. Formulários

### 8.1 Estado atual

- **Nenhum formulário** no módulo
- CSS compartilhado já oferece `.imp-field` (input/select/textarea, focus `brand`)
- Admin possui `FormModal` (overlay blur, panel 520px, primary/ghost)

### 8.2 Gap de produto

`webinar.manage` descreve “Criar e editar eventos”, mas a UI só **Publica** rascunhos seed.

### 8.3 Plano de formulários (visual IMP — a validar na implementação)

| Formulário | Campos mínimos sugeridos | Container |
|------------|--------------------------|-----------|
| Novo / Editar evento | Título, data/hora, duração (min), host, descrição, status | `FormModal` + `imp-field` |
| Filtros lista (opcional) | Status, busca texto | Inline no header do painel |

Regras UI:

- Labels muted; focus ring/border `--brand`
- Botões: Cancelar ghost · Salvar primary âmbar
- Validação visual inline (mensagem danger), sem inventar backend real
- Não usar look de formulário do S1m0ne (login claro / brand própria)

### 8.4 Fora de escopo visual imediato

- Cadastro público de participante
- Landing de inscrição
- Player / sala ao vivo

---

## 9. Roadmap de implementação (após aprovação)

> **Nenhuma alteração de código neste documento.** Ordem sugerida quando autorizar implementação:

### Fase A — Fundação visual

1. Criar `src/modules/webinar/styles/webinar.css` (só overrides tipados)
2. Remover inline styles de Events / Detail / Metrics
3. Padronizar toolbar Voltar + ações
4. Aprimorar `WebinarEvent` list/card + header “Gestão de eventos”

### Fase B — Navegação e hierarquia

5. Ícones na nav / CTAs (stroke IMP)
6. Empty states consistentes
7. Responsividade das métricas e tabelas

### Fase C — Formulários (se produto confirmar)

8. Modal criar/editar evento via `FormModal`
9. Ligar a `canManage` + mutations no context (ainda mock)

### Fase D — Limpeza

10. Remover ou realinhar stub `pages/modules/Webinar.jsx`
11. Checklist visual de demo (ver §10)

### Critério de aceite visual

- [ ] Webinar “parece” um módulo IMP (graphite/amber, tipografia, cards, botões)
- [ ] Não “parece” um clone de S1m0ne
- [ ] Eventos → Detalhe → Métricas fluem com Voltar/CTAs previsíveis
- [ ] Sem `style={{}}` ad-hoc nas páginas principais
- [ ] Tabela e pills legíveis em desktop demo
- [ ] Formulário create/edit (se no escopo) usa padrão Admin/IMP

---

## 10. Checklist de demo (pós-implementação)

1. Abrir Webinar pelo launcher (badge Live)  
2. Ver 4 métricas + lista de eventos tipada  
3. Publicar rascunho (se `webinar.manage`)  
4. Abrir evento → marcar Presente / No-show  
5. Ver métricas → handoff Prospecção / BDR  
6. Voltar ao dashboard via “Módulos IMP”  

---

## 11. Decisões em aberto (aguardar antes de codar)

| # | Pergunta | Default se não responder |
|---|----------|---------------------------|
| D1 | Incluir modal **Novo evento** nesta onda visual? | **Não** — só polish das telas existentes (Fase A–B) |
| D2 | Alinhar tamanho das métricas ao BDR (2.25rem)? | Manter `imp-metric` 1.75rem (consistência entre módulos `imp-*`) |
| D3 | Adicionar item de nav “Métricas globais”? | **Não** — métricas só por evento |
| D4 | Extrair componentes `Webinar*` dedicados vs só CSS? | Extrair cards/header se JSX repetir; senão CSS + páginas |

---

## 12. Resumo executivo

O Webinar do IMP **já usa a paleta e o shell certos**, mas ainda se comporta como **mock genérico**: nav mínima, lista sem tipagem IMP, styles inline, sem formulários apesar da permissão de gestão.

A adaptação pedida é **elevar a fidelidade visual ao CRM IMP** (cards, formulários, navegação, layout, cores) **sem** clonar [s1m0ne.tec.br](https://s1m0ne.tec.br/).

**Próximo passo:** aguardar aprovação e respostas às decisões D1–D4; só então iniciar implementação (Fase A).
