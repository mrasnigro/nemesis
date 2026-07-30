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
      }
    }

    case 'START_MANUAL': {
      if (!isDialAllowed(state.operatorStatus)) return state
      const check = validateManualStart(action)
      if (!check.ok) return state
      return {
        ...state,
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

    case 'SET_DISPOSITION':
      return { ...state, dispositionId: action.dispositionId }

    case 'SET_TEMPERATURE':
      return { ...state, salesTemperature: action.value }

    case 'SET_NOTES':
      return { ...state, notes: action.notes }

    case 'PREPEND_HISTORY':
      return { ...state, history: [action.row, ...state.history] }

    case 'PREPEND_MEETING':
      return {
        ...state,
        meetings: [action.meeting, ...state.meetings],
        metrics: {
          ...state.metrics,
          meetingsScheduled: state.metrics.meetingsScheduled + 1,
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
      }

    case 'HANGUP_TO_IDLE':
      return {
        ...state,
        call: createIdleCall(),
        diagnosis: createEmptyDiagnosis(),
        scriptProgress: createEmptyScriptProgress(),
        dispositionId: null,
        activeTab: 'company',
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
      const lead = await mockBdrRepository.pickNextLead(state.selectedCampaignId)
      if (cancelled) return
      dispatch({ type: 'CONNECT_LEAD', lead })
      pickingLeadRef.current = false
    })()
    return () => {
      cancelled = true
    }
  }, [state.call.status, state.call.elapsedTime, state.selectedCampaignId])

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

  const patchScriptProgress = useCallback((patch) => {
    dispatch({ type: 'PATCH_SCRIPT_PROGRESS', patch })
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

  const finalizeAttendance = useCallback(
    async ({ dispositionId, salesTemperature, notes, diagnosis } = {}) => {
      const disposition = dispositionId ?? state.dispositionId
      if (!disposition) {
        return { ok: false, error: 'Selecione uma qualificação (disposição).' }
      }
      const lead = state.call.currentLead
      const phone =
        state.call.mode === 'manual' && state.call.manualPhone
          ? state.call.manualPhone
          : lead?.phone || ''
      const row = {
        id: `h_${Date.now()}`,
        phone,
        company: lead?.company || (state.call.mode === 'manual' ? 'Manual' : ''),
        leadName: lead?.name || '',
        qualification:
          // resolved in UI via catalogs; store id + label later phases
          disposition,
        qualificationId: disposition,
        duration: state.call.elapsedTime,
        method: state.call.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Telefone Fixo',
        timestamp: new Date().toLocaleString('pt-BR'),
        notes: notes ?? state.notes,
        diagnosis: {
          ...(diagnosis || state.diagnosis),
          salesTemperature: salesTemperature ?? state.salesTemperature,
        },
        campaignId: state.selectedCampaignId,
        mode: state.call.mode || 'automatic',
        callStatus: 'Atendida',
        clientStatus: disposition,
        protocol: lead?.protocol,
      }
      await mockBdrRepository.saveHistory(row)
      dispatch({ type: 'PREPEND_HISTORY', row })
      dispatch({ type: 'BUMP_CALL_METRICS' })
      // Live rule: always restart automatic searching
      dispatch({ type: 'RESET_AFTER_FINALIZE' })
      return { ok: true, row }
    },
    [state],
  )

  const hangupToIdle = useCallback(() => {
    dispatch({ type: 'HANGUP_TO_IDLE' })
  }, [])

  const value = useMemo(() => {
    const dialAllowed = isDialAllowed(state.operatorStatus)
    const scheduleAllowed = state.call.status === 'connected'

    return {
      ...state,
      dialAllowed,
      scheduleAllowed,
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
      patchScriptProgress,
      setDisposition,
      setSalesTemperature,
      setNotes,
      finalizeAttendance,
      hangupToIdle,
      prependMeeting,
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
    patchScriptProgress,
    setDisposition,
    setSalesTemperature,
    setNotes,
    finalizeAttendance,
    hangupToIdle,
    prependMeeting,
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
