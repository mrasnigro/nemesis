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

export function getEvaluationTemplate(templateId, list = []) {
  return list.find((item) => item.id === templateId) || null
}

export function publishedTemplates(list = []) {
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
    scenarioTypes: ['cold_first', 'discovery', 'warm_first', 'post_sale', 'inbound'],
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
    scenarioTypes: template.scenarioTypes || ['cold_first', 'discovery', 'warm_first', 'post_sale', 'inbound'],
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

  const scenarioTypes = Array.isArray(input.scenarioTypes) ? input.scenarioTypes.filter(Boolean) : []
  if (!scenarioTypes.length) errors.push('Marque ao menos um cenário compatível.')

  const candidate = { title, description, contactType, status, scenarioTypes, sections }
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
