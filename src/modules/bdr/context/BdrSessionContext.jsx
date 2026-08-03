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
  AUTO_INDISPONIVEL_MS,
  CAMPAIGN_STORAGE_KEY,
  SEARCH_CONNECT_SECONDS,
} from '../data/catalogs.js'
import { isScriptCompleted } from '../data/scriptContent.js'
import {
  createEmptyDiagnosis,
  createEmptyScriptProgress,
  SEED_CAMPAIGNS,
  SEED_HISTORY,
  SEED_MEETINGS,
  SEED_METRICS,
} from '../data/seeds.js'
import {
  createConnectedCall,
  createIdleCall,
  createPostFinalizeSearchingCall,
  createSearchingCall,
  shouldConnectFromSearching,
  validateManualStart,
} from '../services/callSessionMachine.js'
import { getBdrPermissionsForUser } from '../services/bdrPermissions.js'
import { mockBdrRepository } from '../services/mockBdrRepository.js'
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
    if (stored && SEED_CAMPAIGNS.some((c) => c.id === stored)) return stored
  } catch {
    /* ignore */
  }
  return SEED_CAMPAIGNS[0]?.id || '1'
}

function createInitialState() {
  return {
    operatorStatus: 'desconectado',
    tempoAtendimentoSec: 0,
    selectedCampaignId: loadSelectedCampaignId(),
    campaigns: structuredClone(SEED_CAMPAIGNS),
    metrics: structuredClone(SEED_METRICS),
    call: createIdleCall(),
    diagnosis: createEmptyDiagnosis(),
    scriptProgress: createEmptyScriptProgress(),
    dispositionId: null,
    salesTemperature: 50,
    notes: '',
    activeTab: 'company',
    history: structuredClone(SEED_HISTORY),
    meetings: structuredClone(SEED_MEETINGS),
    activeCallMeetingIds: [],
    permissions: getBdrPermissionsForUser(null, true),
    hydrated: false,
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
        call: createSearchingCall({ mode: 'automatic', contactMethod: 'phone' }),
        diagnosis: createEmptyDiagnosis(),
        scriptProgress: createEmptyScriptProgress(),
        dispositionId: null,
        salesTemperature: 50,
        notes: '',
        activeTab: 'company',
        activeCallMeetingIds: [],
      }
    }

    case 'START_MANUAL': {
      const check = validateManualStart(action)
      if (!check.ok) return state
      return {
        ...state,
        // Entering a manual dial always puts the operator in session
        operatorStatus: 'atendimento',
        call: createSearchingCall({
          mode: 'manual',
          contactMethod: action.contactMethod,
          manualPhone: action.phone.trim(),
        }),
        diagnosis: createEmptyDiagnosis(),
        scriptProgress: createEmptyScriptProgress(),
        dispositionId: null,
        salesTemperature: 50,
        notes: '',
        activeTab: 'company',
        activeCallMeetingIds: [],
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
      if (state.call.status !== 'searching') return state
      return {
        ...state,
        call: createConnectedCall(state.call, action.lead),
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
  const pickingLeadRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [campaigns, history, meetings, metrics] = await Promise.all([
        mockBdrRepository.listCampaigns(),
        mockBdrRepository.listHistory(),
        mockBdrRepository.listMeetings(),
        mockBdrRepository.getMetrics(),
      ])
      if (cancelled) return
      dispatch({
        type: 'HYDRATE',
        payload: {
          campaigns,
          history,
          meetings,
          metrics,
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

  // Connect after SEARCH_CONNECT_SECONDS while searching
  useEffect(() => {
    if (state.call.status !== 'searching') {
      pickingLeadRef.current = false
      return undefined
    }
    if (!shouldConnectFromSearching(state.call.elapsedTime)) return undefined
    if (pickingLeadRef.current) return undefined
    pickingLeadRef.current = true
    let cancelled = false
    ;(async () => {
      let lead
      if (state.call.mode === 'manual') {
        lead = {
          id: `manual-${Date.now()}`,
          phone: state.call.manualPhone,
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
      } else {
        lead = await mockBdrRepository.pickNextLead(state.selectedCampaignId)
      }
      if (cancelled) return
      dispatch({ type: 'CONNECT_LEAD', lead })
      pickingLeadRef.current = false
    })()
    return () => {
      cancelled = true
    }
  }, [
    state.call.status,
    state.call.elapsedTime,
    state.call.mode,
    state.call.manualPhone,
    state.selectedCampaignId,
  ])

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

  const prependMeeting = useCallback((meeting) => {
    dispatch({ type: 'PREPEND_MEETING', meeting })
    void mockBdrRepository.saveMeeting(meeting)
  }, [])

  const updateMeeting = useCallback((id, patch) => {
    dispatch({ type: 'UPDATE_MEETING', id, patch })
    void mockBdrRepository.updateMeeting(id, patch)
  }, [])

  const removeMeeting = useCallback((id) => {
    dispatch({ type: 'REMOVE_MEETING', id })
    void mockBdrRepository.removeMeeting(id)
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
        id: `h_${Date.now()}`,
        phone,
        company: lead?.company || (state.call.mode === 'manual' ? 'Manual' : ''),
        leadName: lead?.name || '',
        qualification: qualificationLabel,
        qualificationId: disposition,
        result: qualificationLabel,
        duration: state.call.elapsedTime,
        method: state.call.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Telefone Fixo',
        timestamp: new Date().toLocaleString('pt-BR'),
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
        recordingUrl: `https://example.com/recordings/mock-${Date.now()}.mp3`,
        meetingIds: callMeetings.map((m) => m.id),
        meetings: callMeetings,
      }
      for (const meeting of callMeetings) {
        const patch = { linkedHistoryId: row.id, callNotes: row.notes }
        await mockBdrRepository.saveMeeting({ ...meeting, ...patch })
        dispatch({ type: 'UPDATE_MEETING', id: meeting.id, patch })
      }
      await mockBdrRepository.saveHistory(row)
      dispatch({ type: 'PREPEND_HISTORY', row })
      dispatch({ type: 'BUMP_CALL_METRICS' })
      // Live rule: always restart automatic searching
      dispatch({ type: 'RESET_AFTER_FINALIZE' })
      return { ok: true, row, meetings: callMeetings }
    },
    [state],
  )

  const hangupToIdle = useCallback(() => {
    dispatch({ type: 'HANGUP_TO_IDLE' })
  }, [])

  const disconnectSession = useCallback(() => {
    dispatch({ type: 'DISCONNECT_SESSION' })
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
      searchConnectSeconds: SEARCH_CONNECT_SECONDS,
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
      disconnectSession,
      prependMeeting,
      updateMeeting,
      removeMeeting,
      selectedCampaign: state.campaigns.find((c) => c.id === state.selectedCampaignId) || null,
    }
  }, [
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
