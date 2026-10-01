/**
 * Guided Script de Abordagem — section order matches live UI (UI ref §3.4.2).
 * Interactive radios map into diagnosis via scriptSync.
 */

export const SCRIPT_SECTIONS = [
  'abertura',
  'dores_intro',
  'dores',
  'priorizacao',
  'contexto_decisorio',
  'qualificacao',
  'transicao',
  'posicionamento',
  'convite',
  'disponibilidade',
  'agenda',
  'confirmacao',
]

export const EQUIPE_OPTIONS = [
  { value: '1-5', label: 'de 1 a 5', companySize: 'micro' },
  { value: '6-20', label: 'de 6 a 20', companySize: 'pequena' },
  { value: '21-50', label: 'de 21 a 50', companySize: 'pequena' },
  { value: '50plus', label: 'mais de 50', companySize: 'media' },
]

/** Labels match live Dialer “Anotações de Diagnóstico” selects. */
export const FATURAMENTO_OPTIONS = [
  { value: 'ate-200k', label: 'até r$ 200 mil mês' },
  { value: '200k-500k', label: 'entre r$ 200 – r$ 500 mil mês' },
  { value: '500k-800k', label: 'entre r$ 500 – r$ 800 mil mês' },
  { value: 'acima-800k', label: 'acima de r$ 800 mil mês' },
]

export const DECISAO_OPTIONS = [
  { value: 'nao', label: 'Decide sozinho (não precisa de sócio na reunião)', partnerPresence: 'nao' },
  { value: 'sim', label: 'Decisão compartilhada (sócio(s) participam)', partnerPresence: 'sim' },
]

export const PRIORITY_OPTIONS = [
  { value: 'alta', label: 'Alta Prioridade', accent: 'red' },
  { value: 'media', label: 'Media Prioridade', accent: 'amber' },
  { value: 'baixa', label: 'Baixa Prioridade', accent: 'green' },
]

export const COMPANY_SIZE_OPTIONS = [
  { value: 'micro', label: 'Micro (1 - 5 colaboradores)' },
  { value: 'pequena', label: 'Pequena (6 - 49 colaboradores)' },
  { value: 'media', label: 'Média (50 - 249 colaboradores)' },
  { value: 'grande', label: 'Grande (250+ colaboradores)' },
]

export const EMPLOYEE_OPTIONS = [
  { value: '1-5', label: '1 a 5' },
  { value: '6-20', label: '6 a 20' },
  { value: '21-50', label: '21 a 50' },
  { value: '50plus', label: 'Mais de 50' },
]
export const REVENUE_OPTIONS = FATURAMENTO_OPTIONS.map(({ value, label }) => ({ value, label }))
export const PARTNER_OPTIONS = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]

/** Markers used in spoken script copy */
export const SCRIPT_MARKERS = {
  resposta: '[RESPOSTA]',
  aguardar: '[AGUARDAR RESPOSTA]',
  cliente: '[CLIENTE]',
  bdr: '[BDR]',
  agente: '[AGENTE]',
  empresa: '[EMPRESA]',
  prospect: '[EMPRESA_PROSPECT]',
  produto: '[PRODUTO/SERVIÇO]',
  hora: '[HORA:MIN]',
}

export function substituteScriptPlaceholders(text, { agentName, companyName, productName, prospectName } = {}) {
  return String(text || '')
    .replaceAll('[AGENTE]', agentName || 'Consultor IMP')
    .replaceAll('[BDR]', agentName || 'Consultor IMP')
    .replaceAll('[EMPRESA]', companyName || 'IMP')
    .replaceAll('[EMPRESA_PROSPECT]', prospectName || '[CLIENTE]')
    .replaceAll('[CLIENTE]', prospectName || '[CLIENTE]')
    .replaceAll('[PRODUTO/SERVIÇO]', productName || 'metodologia IMP de crescimento')
}

export function requiredScriptAnswers() {
  return ['equipe', 'faturamento', 'decisao', 'priority']
}

export function isScriptCompleted(scriptProgress) {
  if (scriptProgress?.completed) return true
  const answered = scriptProgress?.answered || {}
  const painsTouched = Boolean(scriptProgress?.painsTouched)
  const section = scriptProgress?.section || 'abertura'
  const requiredOk = requiredScriptAnswers().every((key) => Boolean(answered[key]))
  const reachedEnd =
    section === 'confirmacao' ||
    SCRIPT_SECTIONS.indexOf(section) >= SCRIPT_SECTIONS.indexOf('confirmacao')
  return requiredOk && painsTouched && reachedEnd
}
