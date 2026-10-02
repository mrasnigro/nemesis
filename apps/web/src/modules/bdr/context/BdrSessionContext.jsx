import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import {
  ATTEMPT_POLL_MS,
  AUTO_INDISPONIVEL_MS,
  CAMPAIGN_STORAGE_KEY,
  dialOutcomeLabel,
  NEXT_DIAL_DELAY_MS,
} from '../data/catalogs.js'
import { isScriptCompleted } from '../data/scriptContent.js'
import {
  createEmptyDiagnosis,
  createEmptyScriptProgress,
  EMPTY_METRICS,
} from '../data/emptyAttendance.js'
import {
  createConnectedCall,
  createIdleCall,
  createPostFinalizeSearchingCall,
  createSearchingCall,
  manualLeadFromPhone,
  validateManualStart,
} from '../services/callSessionMachine.js'
import { getBdrPermissionsForUser } from '../services/bdrPermissions.js'
import { BdrApiError, BLOCKING_DIAL_ERRORS } from '../services/bdrErrors.js'
import { bdrRepository } from '../services/bdrRepository.js'
import {
  canTransition,
  isDialAllowed,
  statusButtonTitle,
  transitionOperatorStatus,
} from '../services/operatorStatusMachine.js'
import {
  advanceSectionAfterAnswer,
  commercialDispositionRequiresDepth,
  mapScriptRadioToDiagnosis,
  syncDiagnosisSelectToScriptAnswer,
  togglePainSelection,
} from '../services/scriptSync.js'
import {
  dispositionLabel,
  dispositionToClientStatus,
} from '../services/historyMapping.js'

const BdrSessionContext = createContext(null)

function loadSelectedCampaignId() {
  try {
    const stored = sessionStorage.getItem(CAMPAIGN_STORAGE_KEY)
    if (stored) return stored
  } catch {
    /* ignore */
  }
  return ''
}

const RECENT_ATTEMPTS_LIMIT = 20
const MAX_POLL_FAILURES = 5
const START_RETRY_DELAYS_MS = [1000, 2000, 4000]
/** Waiting on an empty queue still re-checks this often, so freshly imported leads are picked up. */
const QUEUE_RECHECK_MS = 30_000

function recentAttemptEntry(attempt) {
  return {
    id: attempt.id,
    phone: attempt.lead?.phone || attempt.phone,
    company: attempt.lead?.company || '',
    leadName: attempt.lead?.name || '',
    outcome: attempt.outcome,
    outcomeLabel: dialOutcomeLabel(attempt.outcome),
    attempts: attempt.lead?.attempts ?? null,
    at: new Date().toLocaleTimeString('pt-BR'),
  }
}

function meetingStartIso(meeting) {
  if (!meeting) return null
  const raw = meeting.startsAt || (meeting.date && meeting.time ? `${meeting.date}T${meeting.time}:00` : null)
  const date = raw ? new Date(raw) : null
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null
}

const CLEARED_ATTENDANCE = {
  diagnosis: createEmptyDiagnosis(),
  scriptProgress: createEmptyScriptProgress(),
  dispositionId: null,
  salesTemperature: 50,
  notes: '',
  activeTab: 'company',
  activeCallMeetingIds: [],
}

function createInitialState() {
  return {
    operatorStatus: 'desconectado',
    tempoAtendimentoSec: 0,
    selectedCampaignId: loadSelectedCampaignId(),
    campaigns: [],
    metrics: { ...EMPTY_METRICS },
    call: createIdleCall(),
    diagnosis: createEmptyDiagnosis(),
    scriptProgress: createEmptyScriptProgress(),
    dispositionId: null,
    salesTemperature: 50,
    notes: '',
    activeTab: 'company',
    history: [],
    meetings: [],
    activeCallMeetingIds: [],
    permissions: getBdrPermissionsForUser(null, true),
    dialerConfig: null,
    dialError: null,
    recentAttempts: [],
    hydrated: false,
    loadError: null,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, hydrated: true }

    case 'SET_OPERATOR_STATUS': {
      const next = transitionOperatorStatus(state.operatorStatus, action.status)
      if (!next) return state
      return {
        ...state,
        operatorStatus: next,
        tempoAtendimentoSec:
          next === 'atendimento' && state.operatorStatus !== 'atendimento'
            ? state.tempoAtendimentoSec
            : next !== 'atendimento'
              ? state.tempoAtendimentoSec
              : state.tempoAtendimentoSec,
      }
    }

    case 'TICK_ATTENDANCE':
      if (state.operatorStatus !== 'atendimento') return state
      return { ...state, tempoAtendimentoSec: state.tempoAtendimentoSec + 1 }

    case 'SELECT_CAMPAIGN':
      return { ...state, selectedCampaignId: action.campaignId }

    case 'START_AUTOMATIC': {
      if (!isDialAllowed(state.operatorStatus)) return state
      return {
        ...state,
        ...CLEARED_ATTENDANCE,
        dialError: null,
        call: createSearchingCall({ mode: 'automatic', contactMethod: 'phone' }),
      }
    }

    case 'SET_DIALER_CONFIG':
      return { ...state, dialerConfig: action.config }

    case 'SET_CAMPAIGNS':
      return { ...state, campaigns: action.campaigns }

    case 'ATTEMPT_STARTED':
    case 'ATTEMPT_UPDATED':
      if (state.call.status !== 'searching' || state.call.sessionId !== action.sessionId) return state
      return { ...state, call: { ...state.call, attempt: action.attempt, queueWait: null } }

    /** No lead is due yet but some are waiting for their retry time: keep the session and check again later. */
    case 'QUEUE_WAITING': {
      if (state.call.status !== 'searching' || state.call.sessionId !== action.sessionId) return state
      if (!isDialAllowed(state.operatorStatus)) return state
      const dueIn = action.queue.nextAttemptAt ? Date.parse(action.queue.nextAttemptAt) - Date.now() : Infinity
      return {
        ...state,
        call: createSearchingCall({
          mode: 'automatic',
          contactMethod: 'phone',
          nextDialAt: Date.now() + Math.min(QUEUE_RECHECK_MS, Math.max(NEXT_DIAL_DELAY_MS, dueIn)),
          queueWait: { nextAttemptAt: action.queue.nextAttemptAt, scheduled: action.queue.scheduled },
        }),
      }
    }

    /** Unanswered (or reclassified) attempt: never reaches the operator; automatic mode dials the next lead. */
    case 'ATTEMPT_ENDED': {
      if (state.call.sessionId !== action.sessionId) return state
      const recentAttempts = [recentAttemptEntry(action.attempt), ...state.recentAttempts].slice(
        0,
        RECENT_ATTEMPTS_LIMIT,
      )
      if (state.call.mode === 'automatic' && isDialAllowed(state.operatorStatus)) {
        return {
          ...state,
          ...CLEARED_ATTENDANCE,
          recentAttempts,
          call: createSearchingCall({
            mode: 'automatic',
            contactMethod: 'phone',
            nextDialAt: Date.now() + NEXT_DIAL_DELAY_MS,
          }),
        }
      }
      return {
        ...state,
        ...CLEARED_ATTENDANCE,
        recentAttempts,
        call: createIdleCall(),
        dialError:
          state.call.mode === 'manual'
            ? { code: 'NOT_ANSWERED', message: `Ligação ${dialOutcomeLabel(action.attempt.outcome).toLowerCase()}.` }
            : state.dialError,
      }
    }

    case 'DIAL_ERROR':
      if (action.sessionId && state.call.sessionId !== action.sessionId) return state
      return { ...state, call: createIdleCall(), dialError: action.error }

    case 'CLEAR_DIAL_ERROR':
      return { ...state, dialError: null }

    case 'START_MANUAL': {
      const check = validateManualStart(action)
      if (!check.ok) return state
      return {
        ...state,
        ...CLEARED_ATTENDANCE,
        dialError: null,
        // Entering a manual dial always puts the operator in session
        operatorStatus: 'atendimento',
        call: createSearchingCall({
          mode: 'manual',
          contactMethod: action.contactMethod,
          manualPhone: action.phone.trim(),
        }),
      }
    }

    case 'TICK_CALL': {
      const { call } = state
      if (call.status !== 'searching' && call.status !== 'connected') return state
      return {
        ...state,
        call: { ...call, elapsedTime: call.elapsedTime + 1 },
      }
    }

    case 'CONNECT_LEAD':
      if (state.call.status !== 'searching' || state.call.sessionId !== action.sessionId) return state
      return {
        ...state,
        call: createConnectedCall(state.call, action.lead, action.attempt ?? state.call.attempt),
        activeTab: 'company',
      }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab }

    case 'PATCH_DIAGNOSIS':
      return { ...state, diagnosis: { ...state.diagnosis, ...action.patch } }

    case 'PATCH_SCRIPT_PROGRESS':
      return {
        ...state,
        scriptProgress: { ...state.scriptProgress, ...action.patch },
      }

    case 'ANSWER_SCRIPT_RADIO': {
      const mapped = mapScriptRadioToDiagnosis(action.name, action.value)
      if (!mapped) return state
      const answered = {
        ...state.scriptProgress.answered,
        [mapped.answeredKey]: action.value,
      }
      const nextProgress = {
        ...state.scriptProgress,
        answered,
        section: advanceSectionAfterAnswer(state.scriptProgress.section, mapped.answeredKey),
      }
      if (isScriptCompleted({ ...nextProgress, painsTouched: nextProgress.painsTouched })) {
        nextProgress.completed = true
        nextProgress.section = 'confirmacao'
      }
      return {
        ...state,
        diagnosis: { ...state.diagnosis, ...mapped.diagnosis },
        scriptProgress: nextProgress,
      }
    }

    case 'TOGGLE_PAIN': {
      const { pains, painPoints } = togglePainSelection(state.diagnosis.pains || {}, action.painId)
      const nextProgress = {
        ...state.scriptProgress,
        painsTouched: true,
        section:
          state.scriptProgress.section === 'dores_intro' ||
          state.scriptProgress.section === 'abertura'
            ? 'dores'
            : state.scriptProgress.section,
      }
      if (isScriptCompleted(nextProgress)) {
        nextProgress.completed = true
      }
      return {
        ...state,
        diagnosis: { ...state.diagnosis, pains, painPoints },
        scriptProgress: nextProgress,
      }
    }

    case 'PATCH_DIAGNOSIS_FIELD': {
      const synced = syncDiagnosisSelectToScriptAnswer(action.field, action.value)
      const answered = { ...state.scriptProgress.answered }
      if (synced.answeredKey) {
        answered[synced.answeredKey] = action.value
      }
      const nextProgress = { ...state.scriptProgress, answered }
      if (isScriptCompleted(nextProgress)) {
        nextProgress.completed = true
      }
      return {
        ...state,
        diagnosis: { ...state.diagnosis, ...synced.diagnosis },
        scriptProgress: nextProgress,
      }
    }

    case 'SET_SCRIPT_SECTION':
      return {
        ...state,
        scriptProgress: { ...state.scriptProgress, section: action.section },
      }

    case 'MARK_SCRIPT_COMPLETED': {
      const next = {
        ...state.scriptProgress,
        completed: true,
        section: 'confirmacao',
        painsTouched: true,
      }
      return { ...state, scriptProgress: next }
    }

    case 'SET_DISPOSITION':
      return { ...state, dispositionId: action.dispositionId }

    case 'SET_TEMPERATURE':
      return { ...state, salesTemperature: action.value }

    case 'SET_NOTES':
      return { ...state, notes: action.notes }

    case 'PREPEND_HISTORY':
      return { ...state, history: [action.row, ...state.history] }

    case 'PREPEND_MEETING': {
      const meeting = action.meeting
      const ids = state.activeCallMeetingIds.includes(meeting.id)
        ? state.activeCallMeetingIds
        : [meeting.id, ...state.activeCallMeetingIds]
      return {
        ...state,
        meetings: [meeting, ...state.meetings.filter((m) => m.id !== meeting.id)],
        activeCallMeetingIds: ids,
        metrics: {
          ...state.metrics,
          meetingsScheduled: state.metrics.meetingsScheduled + (state.meetings.some((m) => m.id === meeting.id) ? 0 : 1),
        },
      }
    }

    case 'UPDATE_MEETING':
      return {
        ...state,
        meetings: state.meetings.map((m) =>
          m.id === action.id ? { ...m, ...action.patch } : m,
        ),
      }

    case 'REMOVE_MEETING':
      return {
        ...state,
        meetings: state.meetings.filter((m) => m.id !== action.id),
        activeCallMeetingIds: state.activeCallMeetingIds.filter((id) => id !== action.id),
        metrics: {
          ...state.metrics,
          meetingsScheduled: Math.max(0, state.metrics.meetingsScheduled - 1),
        },
      }

    case 'BUMP_CALL_METRICS':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          totalCalls: state.metrics.totalCalls + 1,
          callsToday: state.metrics.callsToday + 1,
        },
      }

    case 'RESET_AFTER_FINALIZE':
      return {
        ...state,
        call: createPostFinalizeSearchingCall(),
        diagnosis: createEmptyDiagnosis(),
        scriptProgress: createEmptyScriptProgress(),
        dispositionId: null,
        salesTemperature: 50,
        notes: '',
        activeTab: 'company',
        activeCallMeetingIds: [],
      }

    case 'HANGUP_TO_IDLE':
      return {
        ...state,
        call: createIdleCall(),
        diagnosis: createEmptyDiagnosis(),
        scriptProgress: createEmptyScriptProgress(),
        dispositionId: null,
        activeTab: 'company',
        activeCallMeetingIds: [],
      }

    /** Leave dialer via Voltar — end call and force Desconectado (exit path, not status matrix). */
    case 'DISCONNECT_SESSION':
      return {
        ...state,
        operatorStatus: 'desconectado',
        call: createIdleCall(),
        diagnosis: createEmptyDiagnosis(),
        scriptProgress: createEmptyScriptProgress(),
        dispositionId: null,
        salesTemperature: 50,
        notes: '',
        activeTab: 'company',
        activeCallMeetingIds: [],
      }

    default:
      return state
  }
}

export function BdrSessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const autoIndisponivelRef = useRef(null)
  const startingSessionRef = useRef(null)
  const pollInFlightRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let loaded
      try {
        loaded = await Promise.all([
          bdrRepository.listCampaigns(),
          bdrRepository.listHistory(),
          bdrRepository.listMeetings(),
          bdrRepository.getMetrics(),
          bdrRepository.getDialerConfig().catch(() => null),
        ])
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: 'HYDRATE',
            payload: { loadError: error?.message || 'Não foi possível carregar os dados da Discagem.' },
          })
        }
        return
      }
      if (cancelled) return
      const [campaigns, history, meetings, metrics, dialerConfig] = loaded
      const selected = stateRef.current.selectedCampaignId
      const fallback = campaigns.find((c) => c.status === 'active') || campaigns[0]
      dispatch({
        type: 'HYDRATE',
        payload: {
          campaigns,
          history,
          meetings,
          metrics,
          dialerConfig,
          selectedCampaignId: campaigns.some((c) => c.id === selected)
            ? selected
            : fallback?.id || selected,
          permissions: getBdrPermissionsForUser(null, true),
        },
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, state.selectedCampaignId)
    } catch {
      /* ignore */
    }
  }, [state.selectedCampaignId])

  // Attendance timer
  useEffect(() => {
    if (state.operatorStatus !== 'atendimento') return undefined
    const id = window.setInterval(() => dispatch({ type: 'TICK_ATTENDANCE' }), 1000)
    return () => window.clearInterval(id)
  }, [state.operatorStatus])

  // Live quirk: ~5s in atendimento → indisponivel (only while idle on painel path)
  useEffect(() => {
    if (autoIndisponivelRef.current) {
      window.clearTimeout(autoIndisponivelRef.current)
      autoIndisponivelRef.current = null
    }
    if (state.operatorStatus !== 'atendimento') return undefined
    // Do not kick operator while a call session is active
    if (state.call.status === 'searching' || state.call.status === 'connected') {
      return undefined
    }
    autoIndisponivelRef.current = window.setTimeout(() => {
      dispatch({ type: 'SET_OPERATOR_STATUS', status: 'indisponivel' })
    }, AUTO_INDISPONIVEL_MS)
    return () => {
      if (autoIndisponivelRef.current) {
        window.clearTimeout(autoIndisponivelRef.current)
        autoIndisponivelRef.current = null
      }
    }
  }, [state.operatorStatus, state.call.status])

  // Call elapsed timer
  useEffect(() => {
    if (state.call.status !== 'searching' && state.call.status !== 'connected') {
      return undefined
    }
    const id = window.setInterval(() => dispatch({ type: 'TICK_CALL' }), 1000)
    return () => window.clearInterval(id)
  }, [state.call.status])

  // Dial loop, step 1: request an attempt (reserve a lead + ring it) for the current searching session.
  const needsAttempt = state.call.status === 'searching' && !state.call.attempt
  useEffect(() => {
    const { call } = stateRef.current
    if (!needsAttempt) return undefined
    if (startingSessionRef.current === call.sessionId) return undefined
    const sessionId = call.sessionId

    if (call.mode === 'manual' && call.contactMethod === 'whatsapp') {
      startingSessionRef.current = sessionId
      dispatch({ type: 'CONNECT_LEAD', sessionId, lead: manualLeadFromPhone(call.manualPhone), attempt: null })
      return undefined
    }

    const delay = Math.max(0, call.nextDialAt - Date.now())
    const timer = window.setTimeout(async () => {
      startingSessionRef.current = sessionId
      try {
        if (call.mode !== 'manual' && !stateRef.current.selectedCampaignId) {
          throw new BdrApiError('Crie ou selecione uma campanha com leads antes de discar.', {
            code: 'NO_CAMPAIGN',
          })
        }
        const request = async () =>
          call.mode === 'manual'
            ? {
                attempt: await bdrRepository.startManualAttempt(
                  call.manualPhone,
                  stateRef.current.selectedCampaignId,
                ),
                queue: null,
              }
            : bdrRepository.startAttempt(stateRef.current.selectedCampaignId)
        let attempt
        let queue
        for (let retry = 0; ; retry += 1) {
          try {
            ;({ attempt, queue } = await request())
            break
          } catch (error) {
            // A dropped connection or a server hiccup should not stop the operator: retry a few times first.
            const transient = error?.status === 0 || error?.status >= 500
            const stillDialing =
              stateRef.current.call.status === 'searching' && stateRef.current.call.sessionId === sessionId
            if (!transient || !stillDialing || retry >= START_RETRY_DELAYS_MS.length) throw error
            await new Promise((resolve) => window.setTimeout(resolve, START_RETRY_DELAYS_MS[retry]))
          }
        }
        if (!attempt) {
          if (queue?.scheduled > 0 || queue?.active > 0) {
            dispatch({ type: 'QUEUE_WAITING', sessionId, queue })
            return
          }
          throw new BdrApiError(
            queue?.total > 0
              ? 'Todos os leads desta campanha já foram trabalhados. Importe novos leads ou escolha outra campanha.'
              : 'Esta campanha ainda não tem leads. Importe uma lista para começar.',
            { code: 'QUEUE_EMPTY' },
          )
        }
        const current = stateRef.current.call
        if (current.status !== 'searching' || current.sessionId !== sessionId) {
          void bdrRepository.hangupAttempt(attempt.id).catch(() => null)
          return
        }
        dispatch({ type: 'ATTEMPT_STARTED', sessionId, attempt })
      } catch (error) {
        const blocking = BLOCKING_DIAL_ERRORS.has(error?.code)
        dispatch({
          type: 'DIAL_ERROR',
          sessionId,
          error: {
            code: error?.code || 'NETWORK',
            message: blocking
              ? error.message
              : `Falha ao discar: ${error?.message || 'erro de rede'}`,
          },
        })
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [needsAttempt, state.call.sessionId])

  // Dial loop, step 2: follow the ringing attempt until the PABX reports a person on the line or an outcome.
  const ringingAttemptId =
    state.call.status === 'searching' && state.call.attempt?.status === 'ringing'
      ? state.call.attempt.id
      : null
  useEffect(() => {
    if (!ringingAttemptId) return undefined
    const sessionId = stateRef.current.call.sessionId
    let failures = 0
    let stopped = false
    const id = window.setInterval(async () => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      try {
        const attempt = await bdrRepository.pollAttempt(ringingAttemptId)
        failures = 0
        if (stopped) return
        if (attempt.status === 'answered') {
          const call = stateRef.current.call
          const lead = attempt.lead || manualLeadFromPhone(call.manualPhone || attempt.phone)
          dispatch({ type: 'CONNECT_LEAD', sessionId, lead, attempt })
        } else if (attempt.status === 'ended') {
          dispatch({ type: 'ATTEMPT_ENDED', sessionId, attempt })
        } else {
          dispatch({ type: 'ATTEMPT_UPDATED', sessionId, attempt })
        }
      } catch (error) {
        failures += 1
        if (!stopped && failures >= MAX_POLL_FAILURES) {
          void bdrRepository.hangupAttempt(ringingAttemptId).catch(() => null)
          dispatch({
            type: 'DIAL_ERROR',
            sessionId,
            error: { code: 'POLL_FAILED', message: `Conexão com a telefonia perdida: ${error?.message || ''}` },
          })
        }
      } finally {
        pollInFlightRef.current = false
      }
    }, ATTEMPT_POLL_MS)
    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [ringingAttemptId])

  // Leaving Em atendimento (intervalo / indisponível) stops the dialer and releases the ringing lead.
  useEffect(() => {
    if (state.call.status !== 'searching' || state.operatorStatus === 'atendimento') return
    const attemptId = state.call.attempt?.id
    if (attemptId) void bdrRepository.hangupAttempt(attemptId).catch(() => null)
    dispatch({ type: 'HANGUP_TO_IDLE' })
  }, [state.operatorStatus, state.call.status, state.call.attempt?.id])

  const setOperatorStatus = useCallback((status) => {
    dispatch({ type: 'SET_OPERATOR_STATUS', status })
  }, [])

  const selectCampaign = useCallback((campaignId) => {
    dispatch({ type: 'SELECT_CAMPAIGN', campaignId })
  }, [])

  const startAutomatic = useCallback(() => {
    dispatch({ type: 'START_AUTOMATIC' })
  }, [])

  const startManual = useCallback((phone, contactMethod) => {
    const check = validateManualStart({ phone, contactMethod })
    if (!check.ok) return check
    dispatch({ type: 'START_MANUAL', phone, contactMethod })
    return { ok: true }
  }, [])

  const setActiveTab = useCallback((tab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab })
  }, [])

  const patchDiagnosis = useCallback((patch) => {
    dispatch({ type: 'PATCH_DIAGNOSIS', patch })
  }, [])

  const patchDiagnosisField = useCallback((field, value) => {
    dispatch({ type: 'PATCH_DIAGNOSIS_FIELD', field, value })
  }, [])

  const patchScriptProgress = useCallback((patch) => {
    dispatch({ type: 'PATCH_SCRIPT_PROGRESS', patch })
  }, [])

  const answerScriptRadio = useCallback((name, value) => {
    dispatch({ type: 'ANSWER_SCRIPT_RADIO', name, value })
  }, [])

  const togglePain = useCallback((painId) => {
    dispatch({ type: 'TOGGLE_PAIN', painId })
  }, [])

  const setScriptSection = useCallback((section) => {
    dispatch({ type: 'SET_SCRIPT_SECTION', section })
  }, [])

  const markScriptCompleted = useCallback(() => {
    dispatch({ type: 'MARK_SCRIPT_COMPLETED' })
  }, [])

  const setDisposition = useCallback((dispositionId) => {
    dispatch({ type: 'SET_DISPOSITION', dispositionId })
  }, [])

  const setSalesTemperature = useCallback((value) => {
    dispatch({ type: 'SET_TEMPERATURE', value })
  }, [])

  const setNotes = useCallback((notes) => {
    dispatch({ type: 'SET_NOTES', notes })
  }, [])

  const prependMeeting = useCallback(async (meeting) => {
    const saved = await bdrRepository.saveMeeting(meeting)
    dispatch({ type: 'PREPEND_MEETING', meeting: saved || meeting })
  }, [])

  const updateMeeting = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_MEETING', id, patch })
    void bdrRepository.updateMeeting(id, patch)
  }, [])

  const removeMeeting = useCallback((id) => {
    dispatch({ type: 'REMOVE_MEETING', id })
    void bdrRepository.removeMeeting(id)
  }, [])

  const finalizeAttendance = useCallback(
    async ({ dispositionId, salesTemperature, notes, diagnosis } = {}) => {
      if (state.call.status !== 'connected') {
        return { ok: false, error: 'Finalize somente com chamada conectada.' }
      }
      const disposition = dispositionId ?? state.dispositionId
      if (!disposition) {
        return { ok: false, error: 'Selecione uma qualificação (disposição).' }
      }
      const diag = diagnosis || state.diagnosis
      const temp = salesTemperature ?? state.salesTemperature
      if (commercialDispositionRequiresDepth(disposition)) {
        const hasPain =
          Boolean(diag.painPoints) || Object.values(diag.pains || {}).some(Boolean)
        if (!hasPain && !diag.conversationSummary) {
          return {
            ok: false,
            error:
              'Para esta qualificação comercial, registre dores ou resumo da conversa antes de finalizar.',
          }
        }
      }
      const qualificationLabel = dispositionLabel(disposition)
      const lead = state.call.currentLead
      const phone =
        state.call.mode === 'manual' && state.call.manualPhone
          ? state.call.manualPhone
          : lead?.phone || ''
      const callMeetings = state.meetings.filter((m) =>
        state.activeCallMeetingIds.includes(m.id),
      )
      const hasMeeting = callMeetings.length > 0
      const clientStatus = dispositionToClientStatus(disposition, { hasMeeting })
      const row = {
        phone,
        company: lead?.company || (state.call.mode === 'manual' ? 'Manual' : ''),
        leadName: lead?.name || '',
        qualification: qualificationLabel,
        qualificationId: disposition,
        result: qualificationLabel,
        duration: state.call.elapsedTime,
        method: state.call.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Telefone Fixo',
        notes: notes ?? state.notes,
        diagnosis: {
          ...diag,
          salesTemperature: temp,
        },
        campaignId: state.selectedCampaignId,
        mode: state.call.mode || 'automatic',
        callStatus: 'Atendida',
        clientStatus,
        protocol: lead?.protocol,
        cnpj: lead?.cnpj || '',
        partnerName: lead?.partnerName || lead?.name || '',
        partnerCpf: lead?.partnerCpf || '',
        email: lead?.email || '',
        address: lead?.address || '',
        city: lead?.city || '',
        state: lead?.state || '',
        attemptId: state.call.attempt?.id || null,
        callbackAt: disposition === 'callback' ? meetingStartIso(callMeetings[0]) : null,
        meetingIds: callMeetings.map((m) => m.id),
      }
      let savedRow
      try {
        savedRow = await bdrRepository.saveHistory(row)
      } catch (error) {
        return { ok: false, error: `Não foi possível salvar a ligação: ${error?.message || 'erro de rede'}` }
      }
      // The API links the meetings to the saved call; mirror that locally so the calendar stays in sync.
      for (const meeting of callMeetings) {
        dispatch({ type: 'UPDATE_MEETING', id: meeting.id, patch: { callId: savedRow.id } })
      }
      dispatch({ type: 'PREPEND_HISTORY', row: savedRow })
      dispatch({ type: 'BUMP_CALL_METRICS' })
      // Live rule: always restart automatic searching
      dispatch({ type: 'RESET_AFTER_FINALIZE' })
      void bdrRepository.listCampaigns().then(
        (campaigns) => dispatch({ type: 'SET_CAMPAIGNS', campaigns }),
        () => null,
      )
      return { ok: true, row: savedRow, meetings: callMeetings }
    },
    [state],
  )

  const hangupToIdle = useCallback(() => {
    const attemptId = stateRef.current.call.attempt?.id
    if (attemptId) void bdrRepository.hangupAttempt(attemptId).catch(() => null)
    dispatch({ type: 'HANGUP_TO_IDLE' })
  }, [])

  /** Drops the phone line of a connected call; the attendance stays open for wrap-up notes. */
  const hangupLine = useCallback(() => {
    const { call } = stateRef.current
    if (call.status === 'connected' && call.attempt?.id) {
      void bdrRepository.hangupAttempt(call.attempt.id).catch(() => null)
    }
  }, [])

  /** The connected party was not a person (carrier voicemail, fax...): log it and move on without wrap-up. */
  const markNotHuman = useCallback(async (outcome = 'voicemail') => {
    const { call } = stateRef.current
    if (call.status !== 'connected' || !call.attempt?.id) return { ok: false }
    try {
      const attempt = await bdrRepository.markAttemptOutcome(call.attempt.id, outcome)
      dispatch({ type: 'ATTEMPT_ENDED', sessionId: call.sessionId, attempt })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error?.message }
    }
  }, [])

  const disconnectSession = useCallback(() => {
    const attemptId = stateRef.current.call.attempt?.id
    if (attemptId) void bdrRepository.hangupAttempt(attemptId).catch(() => null)
    dispatch({ type: 'DISCONNECT_SESSION' })
  }, [])

  const clearDialError = useCallback(() => {
    dispatch({ type: 'CLEAR_DIAL_ERROR' })
  }, [])

  /** From the dial screen: back to Em atendimento (if needed) and dial again, without a trip to the panel. */
  const resumeDialing = useCallback(() => {
    dispatch({ type: 'CLEAR_DIAL_ERROR' })
    if (stateRef.current.operatorStatus !== 'atendimento') {
      dispatch({ type: 'SET_OPERATOR_STATUS', status: 'atendimento' })
    }
    dispatch({ type: 'START_AUTOMATIC' })
  }, [])

  const setExtension = useCallback(async (extension) => {
    const config = await bdrRepository.setExtension(extension)
    dispatch({ type: 'SET_DIALER_CONFIG', config })
    return config
  }, [])

  const reloadDialerConfig = useCallback(async () => {
    const config = await bdrRepository.getDialerConfig()
    dispatch({ type: 'SET_DIALER_CONFIG', config })
    return config
  }, [])

  const reloadCampaigns = useCallback(async () => {
    const campaigns = await bdrRepository.listCampaigns()
    dispatch({ type: 'SET_CAMPAIGNS', campaigns })
    return campaigns
  }, [])

  const value = useMemo(() => {
    const dialAllowed = isDialAllowed(state.operatorStatus)
    const scheduleAllowed = state.call.status === 'connected'
    const scriptCompleted = isScriptCompleted(state.scriptProgress)

    return {
      ...state,
      dialAllowed,
      scheduleAllowed,
      scriptCompleted,
      autoIndisponivelMs: AUTO_INDISPONIVEL_MS,
      canTransitionOperator: (to) => canTransition(state.operatorStatus, to),
      getStatusButtonTitle: (buttonStatus) =>
        statusButtonTitle(state.operatorStatus, buttonStatus),
      setOperatorStatus,
      selectCampaign,
      startAutomatic,
      startManual,
      setActiveTab,
      patchDiagnosis,
      patchDiagnosisField,
      patchScriptProgress,
      answerScriptRadio,
      togglePain,
      setScriptSection,
      markScriptCompleted,
      setDisposition,
      setSalesTemperature,
      setNotes,
      finalizeAttendance,
      hangupToIdle,
      hangupLine,
      markNotHuman,
      disconnectSession,
      clearDialError,
      resumeDialing,
      setExtension,
      reloadDialerConfig,
      reloadCampaigns,
      prependMeeting,
      updateMeeting,
      removeMeeting,
      selectedCampaign: state.campaigns.find((c) => c.id === state.selectedCampaignId) || null,
    }
  }, [
    hangupLine,
    markNotHuman,
    clearDialError,
    resumeDialing,
    setExtension,
    reloadDialerConfig,
    reloadCampaigns,
    state,
    setOperatorStatus,
    selectCampaign,
    startAutomatic,
    startManual,
    setActiveTab,
    patchDiagnosis,
    patchDiagnosisField,
    patchScriptProgress,
    answerScriptRadio,
    togglePain,
    setScriptSection,
    markScriptCompleted,
    setDisposition,
    setSalesTemperature,
    setNotes,
    finalizeAttendance,
    hangupToIdle,
    disconnectSession,
    prependMeeting,
    updateMeeting,
    removeMeeting,
  ])

  return <BdrSessionContext.Provider value={value}>{children}</BdrSessionContext.Provider>
}

export function useBdrSession() {
  const ctx = useContext(BdrSessionContext)
  if (!ctx) {
    throw new Error('useBdrSession must be used within BdrSessionProvider')
  }
  return ctx
}

export default BdrSessionContext
