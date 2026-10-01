import {
  DECISAO_OPTIONS,
  EQUIPE_OPTIONS,
  FATURAMENTO_OPTIONS,
  isScriptCompleted,
  SCRIPT_SECTIONS,
} from '../data/scriptContent.js'
import { PAIN_ITEMS } from '../data/catalogs.js'

const PAIN_IDS = PAIN_ITEMS.map((p) => p.id)

/**
 * Apply a script radio answer → diagnosis patch + scriptProgress.answered
 */
export function mapScriptRadioToDiagnosis(name, value) {
  switch (name) {
    case 'equipe': {
      const opt = EQUIPE_OPTIONS.find((o) => o.value === value)
      if (!opt) return null
      return {
        diagnosis: { employees: opt.value, companySize: opt.companySize },
        answeredKey: 'equipe',
      }
    }
    case 'faturamento': {
      const opt = FATURAMENTO_OPTIONS.find((o) => o.value === value)
      if (!opt) return null
      return {
        diagnosis: { monthlyRevenue: opt.value },
        answeredKey: 'faturamento',
      }
    }
    case 'decisao': {
      const opt = DECISAO_OPTIONS.find((o) => o.value === value)
      if (!opt) return null
      return {
        diagnosis: { partnerPresence: opt.partnerPresence },
        answeredKey: 'decisao',
      }
    }
    case 'priority':
      return {
        diagnosis: { priority: value },
        answeredKey: 'priority',
      }
    case 'abertura':
      return {
        diagnosis: {},
        answeredKey: 'abertura',
      }
    default:
      return null
  }
}

/**
 * Pain exclusivity: todos / nenhum clear the rest; individual clears todos/nenhum.
 */
export function togglePainSelection(currentPains, painId) {
  const pains = { ...currentPains }
  const next = !pains[painId]

  if (painId === 'todos') {
    PAIN_IDS.forEach((id) => {
      pains[id] = false
    })
    pains.todos = next
  } else if (painId === 'nenhum') {
    PAIN_IDS.forEach((id) => {
      pains[id] = false
    })
    pains.nenhum = next
  } else {
    pains.todos = false
    pains.nenhum = false
    pains[painId] = next
  }

  const selectedLabels = PAIN_ITEMS.filter((item) => pains[item.id]).map((item) => item.text)

  return {
    pains,
    painPoints: selectedLabels.join('; '),
  }
}

export function syncDiagnosisSelectToScriptAnswer(field, value) {
  if (field === 'employees') {
    return mapScriptRadioToDiagnosis('equipe', value)
  }
  if (field === 'monthlyRevenue') {
    return mapScriptRadioToDiagnosis('faturamento', value)
  }
  if (field === 'partnerPresence') {
    return mapScriptRadioToDiagnosis('decisao', value)
  }
  if (field === 'priority') {
    return mapScriptRadioToDiagnosis('priority', value)
  }
  if (field === 'companySize') {
    return { diagnosis: { companySize: value }, answeredKey: null }
  }
  return { diagnosis: { [field]: value }, answeredKey: null }
}

export function nextScriptSection(current) {
  const idx = SCRIPT_SECTIONS.indexOf(current)
  if (idx < 0) return SCRIPT_SECTIONS[0]
  if (idx >= SCRIPT_SECTIONS.length - 1) return SCRIPT_SECTIONS[SCRIPT_SECTIONS.length - 1]
  return SCRIPT_SECTIONS[idx + 1]
}

export function advanceSectionAfterAnswer(section, answeredKey) {
  const advanceMap = {
    abertura: 'dores_intro',
    priority: 'contexto_decisorio',
    decisao: 'qualificacao',
    faturamento: 'qualificacao',
    equipe: 'transicao',
  }
  const target = advanceMap[answeredKey]
  if (!target) return section
  const curIdx = SCRIPT_SECTIONS.indexOf(section)
  const tgtIdx = SCRIPT_SECTIONS.indexOf(target)
  return tgtIdx > curIdx ? target : section
}

export function evaluateScriptCompletion(scriptProgress) {
  return isScriptCompleted(scriptProgress)
}

export function commercialDispositionRequiresDepth(dispositionId) {
  return ['interested', 'sold', 'callback'].includes(dispositionId)
}

export function softDisposition(dispositionId) {
  return ['no_contact', 'wrong_number', 'deceased'].includes(dispositionId)
}
