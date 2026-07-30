import {
  AUTO_INDISPONIVEL_MS,
  CURRENT_STATUS_TITLE,
  ILLEGAL_TRANSITION_TITLE,
  OPERATOR_STATUSES,
  OPERATOR_TRANSITIONS,
} from '../data/catalogs.js'

export function canTransition(from, to) {
  if (from === to) return true
  const allowed = OPERATOR_TRANSITIONS[from] || []
  return allowed.includes(to)
}

export function statusButtonTitle(currentStatus, buttonStatus) {
  if (currentStatus === buttonStatus) return CURRENT_STATUS_TITLE
  if (!canTransition(currentStatus, buttonStatus)) return ILLEGAL_TRANSITION_TITLE
  return OPERATOR_STATUSES.find((s) => s.id === buttonStatus)?.label || buttonStatus
}

export function isDialAllowed(operatorStatus) {
  return operatorStatus === 'atendimento'
}

/**
 * Pure transition helper — returns next status or null if illegal.
 */
export function transitionOperatorStatus(from, to) {
  if (!canTransition(from, to)) return null
  return to
}

export { AUTO_INDISPONIVEL_MS, OPERATOR_STATUSES, OPERATOR_TRANSITIONS }
