/**
 * BDR catalogs — live CRM IMP (Vw, Sw, Tw, thermometer, pains).
 * Do not drop entries without a written client decision.
 */

export const OPERATOR_STATUSES = [
  { id: 'desconectado', label: 'Desconectado' },
  { id: 'atendimento', label: 'Em atendimento' },
  { id: 'intervalo', label: 'Em intervalo' },
  { id: 'indisponivel', label: 'Indisponível' },
]

/** Live adjacency matrix (functional §3.2) */
export const OPERATOR_TRANSITIONS = {
  desconectado: ['atendimento'],
  atendimento: ['intervalo', 'indisponivel'],
  intervalo: ['atendimento', 'indisponivel'],
  indisponivel: ['atendimento'],
}

export const ILLEGAL_TRANSITION_TITLE = 'Transição indisponível para o status atual'
export const CURRENT_STATUS_TITLE = 'Status atual'

/** Auto-force atendimento → indisponivel (live demo quirk, ~5s) */
export const AUTO_INDISPONIVEL_MS = 5000

/** How often the console asks the API for the state of the ringing attempt. */
export const ATTEMPT_POLL_MS = 1500

/** Pause between an unanswered attempt and the next automatic dial. */
export const NEXT_DIAL_DELAY_MS = 1500

export const DIAL_OUTCOME_LABELS = {
  answered: 'Atendida',
  busy: 'Ocupado',
  no_answer: 'Não atendida',
  voicemail: 'Caixa postal',
  failed: 'Falha',
  cancelled: 'Cancelada',
  abandoned: 'Abandonada',
}

export function dialOutcomeLabel(outcome) {
  return DIAL_OUTCOME_LABELS[outcome] || outcome || '—'
}

export const DISPOSITIONS = [
  { id: 'interested', label: 'Em negociação whatsApp', color: 'green' },
  { id: 'callback', label: 'Agendamento / Retorno', color: 'blue' },
  { id: 'no_contact', label: 'Sem contato / Ligação caiu', color: 'yellow' },
  { id: 'no_interest', label: 'Sem interesse', color: 'red' },
  { id: 'wrong_number', label: 'Telefone incorreto / Engano', color: 'blue-dark' },
  { id: 'deceased', label: 'Falecido', color: 'black' },
  { id: 'sold', label: 'Venda feita por telefone', color: 'green-dark' },
]

export const CALL_SITUATIONS = [
  'Atendida',
  'Não atendida',
  'Abandonada',
  'Caixa postal pré-atendimento',
  'Fora do horário',
  'Caixa postal pós-atendimento',
  'Falha',
]

export const CLIENT_STATUSES = [
  'Interessado',
  'Sem Interesse',
  'Agendado',
  'Em negociação whatsApp',
  'Sem contato / Ligação caiu',
]

export const THERMOMETER = {
  frioMax: 30,
  mornoMax: 65,
}

export function thermometerLabel(value) {
  const n = Number(value) || 0
  if (n <= THERMOMETER.frioMax) return 'Frio'
  if (n <= THERMOMETER.mornoMax) return 'Morno'
  return 'Quente'
}

export const PAIN_ITEMS = [
  {
    id: 'lucro',
    source: 'O dinheiro entra, mas não sobra | Lucro',
    text: 'O dinheiro entra, mas não sobra | Lucro',
    color: '#22D3EE',
  },
  {
    id: 'vendas',
    source: 'As vendas caíram / dependo de indicação | Vendas / Crescimento',
    text: 'As vendas caíram / dependo de indicação | Vendas / Crescimento',
    color: '#4ADE80',
  },
  {
    id: 'gestao',
    source: 'Vivo apagando incêndios | Gestão',
    text: 'Vivo apagando incêndios | Gestão',
    color: '#E879F9',
  },
  {
    id: 'lideranca',
    source: 'A equipe depende de mim | Liderança',
    text: 'A equipe depende de mim | Liderança',
    color: '#60A5FA',
  },
  {
    id: 'todos',
    source: 'Tenho problemas em tudo',
    text: 'Tenho problemas em tudo',
    color: '#F87171',
  },
  {
    id: 'nenhum',
    source: 'Não tenho nenhum Problema',
    text: 'Não tenho nenhum Problema',
    color: '#A855F7',
  },
]

export const CONTACT_METHODS = [
  { id: 'phone', label: 'Telefone Fixo' },
  { id: 'whatsapp', label: 'WhatsApp' },
]

export const DIALER_TABS = [
  { id: 'company', label: 'Dados da Empresa', icon: 'grid' },
  { id: 'script', label: 'Script de Abordagem', icon: 'message' },
  { id: 'questions', label: 'Questionamentos Padrão', icon: 'help' },
  { id: 'diagnosis', label: 'Anotações de Diagnóstico', icon: 'file' },
]

export const SCHEDULE_HOURS = {
  open: '9:00',
  close: '18:00',
  intervalMin: 30,
}

export const BDR_PERMISSION_KEYS = [
  'bdr.operate',
  'bdr.campaigns.select',
  'bdr.history.self',
  'bdr.history.team',
  'bdr.schedule',
  'bdr.scripts.view',
]

export const CAMPAIGN_STORAGE_KEY = 'bdr_selectedCampaignId'
