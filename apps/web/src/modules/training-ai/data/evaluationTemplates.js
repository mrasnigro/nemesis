/**
 * Evaluation rubrics / Playbooks de Score — report §5.
 * Weights across all criteria must sum to 100; stage weight = sum of children.
 */

export const CONTACT_TYPE_OPTIONS = [
  { id: 'cold_call', label: 'Contato frio' },
  { id: 'objection', label: 'Objeção' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'warmup', label: 'Contato morno' },
  { id: 'custom', label: 'Personalizado' },
]

export const PASS_RULE_TYPES = [
  { id: 'keywords', label: 'Passa se a fala contiver palavras-chave' },
  { id: 'avoid_keywords', label: 'Passa se a fala evitar palavras-chave' },
]

export const PLAYBOOK_STATUSES = ['published', 'draft']

/** Stage description defaults for seed timeline (client playbook mockup). */
const STAGE_DEFAULT_DESCRIPTIONS = {
  Abertura: 'Estabelecer contato e gerar interesse inicial.',
  'Proposta de valor': 'Trazer insight e proposta clara de valor.',
  Qualificação: 'Entender necessidades e contexto do prospect.',
  'Tratamento de objeção': 'Reposicionar valor sem conceder desconto precoce.',
  Fechamento: 'Consolidar próximo passo e compromisso.',
  Discovery: 'Mapear dor, stakeholders e termômetro.',
  'Termômetro e fecho': 'Fechar com marco e playbook leve.',
}

export const seedEvaluationTemplates = [
  {
    id: 'tpl_cold_call',
    title: 'Contato Telefônico - Frio',
    description:
      'Rubrica para abertura consultiva em ligação fria: saudação, permissão, valor e próximo passo.',
    contactType: 'cold_call',
    sections: [
      {
        id: 'sec_abertura',
        name: 'Abertura',
        criteria: [
          {
            id: 'crit_saudacao',
            name: 'Saudação e apresentação',
            weight: 15,
            yesNoQuestion: 'O vendedor cumprimentou e se apresentou com clareza?',
            passRule: {
              type: 'keywords',
              keywords: ['bom dia', 'boa tarde', 'olá', 'sou da', 'me chamo', 'imp'],
            },
          },
          {
            id: 'crit_permissao',
            name: 'Pedido de permissão',
            weight: 10,
            yesNoQuestion: 'Pediu um momento curto antes de avançar o pitch?',
            passRule: {
              type: 'keywords',
              keywords: ['segundos', 'minuto', 'momento', 'posso', 'bom momento', 'permit'],
            },
          },
        ],
      },
      {
        id: 'sec_valor',
        name: 'Proposta de valor',
        criteria: [
          {
            id: 'crit_insight',
            name: 'Insight do segmento',
            weight: 15,
            yesNoQuestion: 'Trouxe um insight relevante para o segmento do lead?',
            passRule: {
              type: 'keywords',
              keywords: ['logíst', 'indústria', 'segmento', 'pipeline', 'lead', 'insight'],
            },
          },
          {
            id: 'crit_agenda',
            name: 'Agenda clara',
            weight: 15,
            yesNoQuestion: 'Propôs um próximo passo com tempo e objetivo explícitos?',
            passRule: {
              type: 'keywords',
              keywords: ['12 minut', '15 minut', 'agenda', 'discovery', 'reunião', 'agendar'],
            },
          },
        ],
      },
      {
        id: 'sec_qualificacao',
        name: 'Qualificação',
        criteria: [
          {
            id: 'crit_beneficio',
            name: 'Benefício concreto',
            weight: 20,
            yesNoQuestion: 'Explicou o que o lead ganha na conversa (não só o produto)?',
            passRule: {
              type: 'keywords',
              keywords: ['você ganha', 'benefício', 'eficiência', 'resultado', 'impacto', 'ganho'],
            },
          },
          {
            id: 'crit_decisor',
            name: 'Confirmação de decisores',
            weight: 10,
            yesNoQuestion: 'Validou ou abriu caminho para envolvimento de decisores?',
            passRule: {
              type: 'keywords',
              keywords: ['decisor', 'diretor', 'time', 'stakeholder', 'envolver', 'quem decide'],
            },
          },
        ],
      },
      {
        id: 'sec_fecho',
        name: 'Próximo passo',
        criteria: [
          {
            id: 'crit_next',
            name: 'Fechamento do próximo passo',
            weight: 15,
            yesNoQuestion: 'Convidou para um próximo marco agendável?',
            passRule: {
              type: 'keywords',
              keywords: ['próximo passo', 'marcar', 'agendar', 'semana que vem', 'calendário'],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl_objection',
    title: 'Tratamento de Objeção - Preço',
    description:
      'Rubrica para reposicionar valor sob pressão de custo, sem desconto precoce.',
    contactType: 'objection',
    sections: [
      {
        id: 'sec_reconhecimento',
        name: 'Reconhecimento',
        criteria: [
          {
            id: 'crit_empatia',
            name: 'Empatia com a pressão de custo',
            weight: 15,
            yesNoQuestion: 'Reconheceu a preocupação de custo sem atacar o concorrente?',
            passRule: {
              type: 'keywords',
              keywords: ['entendo', 'faz sentido', 'pressão', 'custo', 'orçamento'],
            },
          },
        ],
      },
      {
        id: 'sec_reposicao',
        name: 'Reposição de valor',
        criteria: [
          {
            id: 'crit_custo_oculto',
            name: 'Custo oculto / oportunidade',
            weight: 20,
            yesNoQuestion: 'Separou preço de custo de oportunidade com argumento claro?',
            passRule: {
              type: 'keywords',
              keywords: ['custo oculto', 'oportunidade', 'retrabalho', 'custo de oportunidade'],
            },
          },
          {
            id: 'crit_numero',
            name: 'Evidência numérica',
            weight: 20,
            yesNoQuestion: 'Trouxe um número concreto e crível?',
            passRule: {
              type: 'keywords',
              keywords: ['%', 'min', 'horas', 'dias', 'reais', 'r$'],
            },
          },
        ],
      },
      {
        id: 'sec_avanco',
        name: 'Avanço comercial',
        criteria: [
          {
            id: 'crit_piloto',
            name: 'Prova controlada',
            weight: 25,
            yesNoQuestion: 'Propôs um próximo passo sem exigir compra imediata?',
            passRule: {
              type: 'keywords',
              keywords: ['piloto', 'prova', 'teste', 'trial', 'controlad'],
            },
          },
          {
            id: 'crit_sem_desconto',
            name: 'Evitar desconto precoce',
            weight: 20,
            yesNoQuestion: 'Evitou cair em desconto imediato como resposta principal?',
            passRule: {
              type: 'avoid_keywords',
              keywords: ['desconto', 'mais barato', 'abaixar preço', 'preço menor'],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl_discovery',
    title: 'Diagnóstico / Discovery',
    description:
      'Rubrica para discovery: processo, gargalo, stakeholders e marco sem pitch precoce.',
    contactType: 'discovery',
    sections: [
      {
        id: 'sec_diagnostico',
        name: 'Diagnóstico',
        criteria: [
          {
            id: 'crit_processo',
            name: 'Exploração do processo atual',
            weight: 20,
            yesNoQuestion: 'Perguntou como o processo funciona hoje antes de oferecer solução?',
            passRule: {
              type: 'keywords',
              keywords: ['como funciona', 'processo', 'hoje', 'atual', 'rotina'],
            },
          },
          {
            id: 'crit_gargalo',
            name: 'Identificação do gargalo',
            weight: 20,
            yesNoQuestion: 'Aprofundou a dor/gargalo mencionado pelo lead?',
            passRule: {
              type: 'keywords',
              keywords: ['dor', 'gargalo', 'trava', 'dificuldade', 'problema'],
            },
          },
        ],
      },
      {
        id: 'sec_stakeholders',
        name: 'Stakeholders',
        criteria: [
          {
            id: 'crit_cadencia',
            name: 'Cadência e ownership',
            weight: 20,
            yesNoQuestion: 'Clarificou quem define cadência/metas no processo?',
            passRule: {
              type: 'keywords',
              keywords: ['cadência', 'meta', 'owner', 'responsável', 'quem define'],
            },
          },
        ],
      },
      {
        id: 'sec_termometro',
        name: 'Termômetro e fecho',
        criteria: [
          {
            id: 'crit_playbook',
            name: 'Playbook / próximo marco',
            weight: 25,
            yesNoQuestion: 'Propôs um playbook leve ou marco com data?',
            passRule: {
              type: 'keywords',
              keywords: ['playbook', 'marco', 'próximo', 'agendar', 'data'],
            },
          },
          {
            id: 'crit_sem_pitch',
            name: 'Evitar pitch prematuro',
            weight: 15,
            yesNoQuestion: 'Evitou empurrar features antes de validar o contexto?',
            passRule: {
              type: 'avoid_keywords',
              keywords: ['nossa plataforma', 'temos ia', 'funcionalidades', 'features', 'integração com'],
            },
          },
        ],
      },
    ],
  },
]

for (const template of seedEvaluationTemplates) {
  if (!template.status) template.status = 'published'
  for (const section of template.sections || []) {
    if (!section.description) {
      section.description = STAGE_DEFAULT_DESCRIPTIONS[section.name] || ''
    }
  }
}

/** Alias for seed / smoke imports */
export const evaluationTemplates = seedEvaluationTemplates

export function getEvaluationTemplate(templateId, list = seedEvaluationTemplates) {
  return list.find((item) => item.id === templateId) || null
}

export function publishedTemplates(list = seedEvaluationTemplates) {
  return (list || []).filter((item) => (item.status || 'published') === 'published')
}

export function flattenCriteria(template) {
  if (!template) return []
  return template.sections.flatMap((section) =>
    section.criteria.map((criterion) => ({
      ...criterion,
      sectionId: section.id,
      sectionName: section.name,
      sectionDescription: section.description || '',
    })),
  )
}

export function sectionWeightsFromTemplate(template) {
  return (template?.sections || []).map((section) => ({
    id: section.id,
    name: section.name,
    description: section.description || '',
    weight: (section.criteria || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0),
  }))
}

export function assertTemplateWeights(template) {
  const total = flattenCriteria(template).reduce((sum, c) => sum + Number(c.weight || 0), 0)
  return total === 100
}

export function totalTemplateWeight(template) {
  return flattenCriteria(template).reduce((sum, c) => sum + Number(c.weight || 0), 0)
}

export function scenariosUsingTemplate(templateId, scenarios = []) {
  return scenarios.filter((item) => item.evaluationTemplateId === templateId)
}

function slugify(value, fallback) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  return base || fallback
}

export function createEmptyTemplateDraft() {
  return {
    title: '',
    description: '',
    contactType: 'custom',
    status: 'draft',
    sections: [
      {
        id: 'sec_geral',
        name: 'Geral',
        description: '',
        criteria: [
          {
            id: 'crit_1',
            name: '',
            weight: 50,
            yesNoQuestion: '',
            passRule: { type: 'keywords', keywords: [] },
            keywordsText: '',
            active: true,
          },
          {
            id: 'crit_2',
            name: '',
            weight: 50,
            yesNoQuestion: '',
            passRule: { type: 'keywords', keywords: [] },
            keywordsText: '',
            active: true,
          },
        ],
      },
    ],
  }
}

export function createEmptyCriterionDraft(index = 1) {
  return {
    id: `crit_${index}`,
    name: '',
    weight: 10,
    yesNoQuestion: '',
    passRule: { type: 'keywords', keywords: [] },
    keywordsText: '',
  }
}

export function templateToFormState(template) {
  return {
    title: template.title || '',
    description: template.description || '',
    contactType: template.contactType || 'custom',
    status: template.status || 'published',
    sections: (template.sections || []).map((section) => ({
      id: section.id,
      name: section.name || '',
      description: section.description || '',
      criteria: (section.criteria || []).map((criterion) => ({
        id: criterion.id,
        name: criterion.name || '',
        weight: criterion.weight ?? 0,
        yesNoQuestion: criterion.yesNoQuestion || '',
        active: criterion.active !== false,
        passRule: {
          type: criterion.passRule?.type || 'keywords',
          keywords: criterion.passRule?.keywords || [],
        },
        keywordsText: (criterion.passRule?.keywords || []).join('\n'),
      })),
    })),
  }
}

/**
 * Normalize create/edit form payload into a template object.
 */
export function normalizeTemplateInput(input = {}) {
  const errors = []
  const title = String(input.title || '').trim()
  const description = String(input.description || '').trim()
  const contactType = String(input.contactType || 'custom').trim()
  const status = PLAYBOOK_STATUSES.includes(input.status) ? input.status : 'draft'

  if (!title) errors.push('Informe o nome do playbook.')
  if (!description) errors.push('Informe a descrição.')

  const rawSections = Array.isArray(input.sections) ? input.sections : []
  if (!rawSections.length) errors.push('Adicione ao menos uma seção com critérios.')

  const sections = []
  let criterionOrdinal = 0

  for (let sIdx = 0; sIdx < rawSections.length; sIdx += 1) {
    const rawSection = rawSections[sIdx] || {}
    const sectionName = String(rawSection.name || '').trim()
    const sectionDescription = String(rawSection.description || '').trim()
    if (!sectionName) {
      errors.push(`Informe o nome da etapa ${sIdx + 1}.`)
      continue
    }

    const rawCriteria = Array.isArray(rawSection.criteria) ? rawSection.criteria : []
    if (!rawCriteria.length) {
      errors.push(`A seção "${sectionName}" precisa de ao menos um critério.`)
      continue
    }

    const criteria = []
    for (let cIdx = 0; cIdx < rawCriteria.length; cIdx += 1) {
      criterionOrdinal += 1
      const raw = rawCriteria[cIdx] || {}
      const name = String(raw.name || '').trim()
      const yesNoQuestion = String(raw.yesNoQuestion || '').trim()
      const weight = Number(raw.weight)
      const ruleType = String(raw.passRule?.type || raw.passRuleType || 'keywords')
      const keywords =
        raw.keywordsText != null
          ? String(raw.keywordsText)
              .split(/\n|,/)
              .map((item) => item.trim())
              .filter(Boolean)
          : Array.isArray(raw.passRule?.keywords)
            ? raw.passRule.keywords.map((item) => String(item).trim()).filter(Boolean)
            : Array.isArray(raw.keywords)
              ? raw.keywords.map((item) => String(item).trim()).filter(Boolean)
              : []

      if (!name) errors.push(`Informe o nome do critério ${cIdx + 1} em "${sectionName}".`)
      if (!yesNoQuestion) {
        errors.push(`Informe a pergunta pass/fail do critério "${name || cIdx + 1}".`)
      }
      if (!Number.isFinite(weight) || weight <= 0) {
        errors.push(`Peso inválido no critério "${name || cIdx + 1}".`)
      }
      if (!PASS_RULE_TYPES.some((item) => item.id === ruleType)) {
        errors.push(`Regra pass/fail inválida em "${name || cIdx + 1}".`)
      }
      if (!keywords.length) {
        errors.push(`Informe palavras-chave da regra pass/fail em "${name || cIdx + 1}".`)
      }

      criteria.push({
        id: String(raw.id || '').trim() || `crit_${slugify(name, `n${criterionOrdinal}`)}`,
        name,
        weight: Math.round(weight),
        yesNoQuestion,
        active: raw.active !== false,
        passRule: {
          type: ruleType,
          keywords,
        },
      })
    }

    sections.push({
      id: String(rawSection.id || '').trim() || `sec_${slugify(sectionName, `s${sIdx + 1}`)}`,
      name: sectionName,
      description: sectionDescription,
      criteria,
    })
  }

  const candidate = { title, description, contactType, status, sections }
  const weightTotal = totalTemplateWeight(candidate)
  if (sections.length && weightTotal !== 100) {
    errors.push(`A soma dos pesos deve ser 100 (atual: ${weightTotal}).`)
  }

  if (errors.length) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    template: candidate,
  }
}
