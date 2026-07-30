import { SEARCH_CONNECT_SECONDS } from '../data/catalogs.js'

export function createIdleCall() {
  return {
    status: 'idle',
    elapsedTime: 0,
    currentLead: null,
    mode: null,
    contactMethod: null,
    manualPhone: '',
  }
}

export function createSearchingCall({ mode, contactMethod = 'phone', manualPhone = '' }) {
  return {
    status: 'searching',
    elapsedTime: 0,
    currentLead: null,
    mode,
    contactMethod,
    manualPhone,
  }
}

export function createConnectedCall(call, lead) {
  return {
    ...call,
    status: 'connected',
    currentLead: lead,
  }
}

/** Live: after finalize always restart automatic searching */
export function createPostFinalizeSearchingCall() {
  return createSearchingCall({ mode: 'automatic', contactMethod: 'phone', manualPhone: '' })
}

export function shouldConnectFromSearching(elapsedTime) {
  return elapsedTime >= SEARCH_CONNECT_SECONDS
}

export function canScheduleMeeting(callStatus) {
  return callStatus === 'connected'
}

export function validateManualStart({ phone, contactMethod }) {
  if (!String(phone || '').trim()) {
    return { ok: false, error: 'Informe o número de telefone.' }
  }
  if (!contactMethod) {
    return { ok: false, error: 'Selecione o tipo de contato.' }
  }
  return { ok: true }
}

export { SEARCH_CONNECT_SECONDS }
