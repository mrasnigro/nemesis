let sessionSeq = 0

function nextSessionId() {
  sessionSeq += 1
  return `${Date.now()}-${sessionSeq}`
}

export function createIdleCall() {
  return {
    status: 'idle',
    sessionId: null,
    elapsedTime: 0,
    currentLead: null,
    mode: null,
    contactMethod: null,
    manualPhone: '',
    connectPhone: '',
    attempt: null,
    nextDialAt: 0,
    queueWait: null,
  }
}

/**
 * "searching" = the dialer is working on this operator's behalf: reserving a lead and ringing it.
 * `attempt` is the provider attempt currently ringing; null while the next one is being requested.
 * `queueWait` (`{ nextAttemptAt, scheduled }`) is set while no lead is due and the dialer re-checks the queue.
 */
export function createSearchingCall({
  mode,
  contactMethod = 'phone',
  manualPhone = '',
  connectPhone = '',
  nextDialAt = 0,
  queueWait = null,
}) {
  return {
    status: 'searching',
    sessionId: nextSessionId(),
    elapsedTime: 0,
    currentLead: null,
    mode,
    contactMethod,
    manualPhone,
    connectPhone,
    attempt: null,
    nextDialAt,
    queueWait,
  }
}

export function createConnectedCall(call, lead, attempt = call.attempt) {
  return {
    ...call,
    status: 'connected',
    elapsedTime: 0,
    currentLead: lead,
    attempt,
  }
}

/** Live: after finalize always restart automatic searching */
export function createPostFinalizeSearchingCall() {
  return createSearchingCall({ mode: 'automatic', contactMethod: 'phone', manualPhone: '' })
}

export function canScheduleMeeting(callStatus) {
  return callStatus === 'connected'
}

export function validateManualStart({ phone, contactMethod, connectPhone = '' }) {
  if (!String(phone || '').trim()) {
    return { ok: false, error: 'Informe o número de telefone.' }
  }
  if (String(connectPhone || '').trim() && String(connectPhone).replace(/\D/g, '').length < 8) {
    return { ok: false, error: 'Informe o segundo número com DDD.' }
  }
  if (!contactMethod) {
    return { ok: false, error: 'Selecione o tipo de contato.' }
  }
  return { ok: true }
}

export function manualLeadFromPhone(phone) {
  return {
    id: `manual-${Date.now()}`,
    phone,
    name: 'Contato Manual',
    company: 'Ligação Manual',
    email: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    cnpj: '',
    protocol: `M${Date.now()}`,
    partnerName: 'Contato Manual',
    partnerCpf: '',
    identifier: 'Ligação Manual',
    socialReason: 'Ligação Manual',
  }
}
