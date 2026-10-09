import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import { createEmptyPersonaDraft, normalizePersonaInput } from '../data/personas.js'
import { createEmptyScenarioDraft, normalizeScenarioInput, scenariosForPersona } from '../data/scenarios.js'
import {
  createEmptyTemplateDraft,
  createEmptyCriterionDraft,
  normalizeTemplateInput,
  scenariosUsingTemplate,
  templateToFormState,
} from '../data/evaluationTemplates.js'
import { getTrainingPermissionsForUser, hasTrainingPermission } from '../services/trainingPermissions.js'
import { trainingApi } from '../services/api/client.js'

/**
 * Training IA state. Everything that matters is decided by the platform API: the persona's replies, the
 * score and the stored transcript. This context only holds what the screens show and the steps the trainee
 * goes through before the conversation starts (agent, briefing, text or voice).
 */
const TrainingAiContext = createContext(null)

const EMPTY_METRICS = { completed: 0, avgScore: 0, pending: 0, streakDays: 0 }

const NO_PERMISSION = {
  persona: 'Sem permissão para gerenciar agentes.',
  scenario: 'Sem permissão para gerenciar cenários.',
  template: 'Sem permissão para gerenciar playbooks.',
}

function failure(error, fallback) {
  return { ok: false, error: error?.message || fallback, code: error?.code }
}

function mediaModeFor(persona) {
  return persona?.interactionMode === 'voice' || persona?.interactionMode === 'both' ? 'voice' : 'text'
}

/** What the history screens list: the session summary from the API, keyed for the report links. */
function toHistoryItem(session) {
  return { ...session, sessionId: session.id }
}

export function TrainingAiProvider({ children }) {
  const { user } = useAuth()
  const { hasModuleAccess } = useWorkspace()
  const permissions = useMemo(
    () => getTrainingPermissionsForUser(user, hasModuleAccess('training-ai')),
    [user, hasModuleAccess],
  )

  const [personas, setPersonas] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [evaluationTemplates, setEvaluationTemplates] = useState([])
  const [history, setHistory] = useState([])
  const [metrics, setMetrics] = useState(EMPTY_METRICS)
  const [aiStatus, setAiStatus] = useState(null)
  const [catalogReady, setCatalogReady] = useState(false)
  const [catalogError, setCatalogError] = useState(null)

  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [phase, setPhase] = useState('idle') // idle | setup | briefing | running | finished
  const [evaluation, setEvaluation] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [isJudging, setIsJudging] = useState(false)
  const [showConversation, setShowConversation] = useState(true)
  const [draftPersonaId, setDraftPersonaId] = useState(null)
  const busyRef = useRef(false)

  const reloadCatalog = useCallback(async () => {
    try {
      const [nextPersonas, nextScenarios, nextTemplates, sessions, nextMetrics, status] = await Promise.all([
        trainingApi.listPersonas(),
        trainingApi.listScenarios(),
        trainingApi.listTemplates(),
        trainingApi.listSessionsAll(),
        trainingApi.getMetrics(),
        trainingApi.getStatus(),
      ])
      setPersonas(nextPersonas)
      setScenarios(nextScenarios)
      setEvaluationTemplates(nextTemplates)
      setHistory((sessions || []).map(toHistoryItem))
      setMetrics(nextMetrics)
      setAiStatus(status)
      setCatalogError(null)
    } catch (error) {
      setCatalogError(error.message || 'Não foi possível carregar o treinamento.')
    } finally {
      setCatalogReady(true)
    }
  }, [])

  useEffect(() => {
    reloadCatalog()
  }, [reloadCatalog])

  const refreshProgress = useCallback(async () => {
    try {
      const [sessions, nextMetrics] = await Promise.all([trainingApi.listSessionsAll(), trainingApi.getMetrics()])
      setHistory((sessions || []).map(toHistoryItem))
      setMetrics(nextMetrics)
    } catch {
      // The report is already saved; the lists refresh on the next load.
    }
  }, [])

  const findPersona = useCallback((id) => personas.find((item) => item.id === id) || null, [personas])
  const findScenario = useCallback((id) => scenarios.find((item) => item.id === id) || null, [scenarios])
  const findTemplate = useCallback(
    (id) => evaluationTemplates.find((item) => item.id === id) || null,
    [evaluationTemplates],
  )

  /** Deep-link / stale-cache: fetch one persona and merge into the catalog when missing. */
  const ensurePersona = useCallback(
    async (personaId) => {
      const existing = findPersona(personaId)
      if (existing) return existing
      try {
        const row = await trainingApi.getPersona(personaId)
        if (!row?.id) return null
        setPersonas((prev) => (prev.some((item) => item.id === row.id) ? prev : [row, ...prev]))
        return row
      } catch {
        return null
      }
    },
    [findPersona],
  )

  const selectedScenario = useMemo(
    () => (session?.scenarioId ? findScenario(session.scenarioId) : null),
    [findScenario, session],
  )
  const selectedPersona = useMemo(
    () => (session?.personaId ? findPersona(session.personaId) : null),
    [findPersona, session],
  )

  const getScenariosForPersona = useCallback((personaId) => scenariosForPersona(personaId, scenarios), [scenarios])
  const getScenariosForTemplate = useCallback(
    (templateId) => scenariosUsingTemplate(templateId, scenarios),
    [scenarios],
  )

  // ------------------------------------------------------------------ catalog (customer administrator)

  const createPersona = useCallback(
    async (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.persona }
      const normalized = normalizePersonaInput(input)
      if (!normalized.ok) return { ok: false, errors: normalized.errors }
      try {
        const payload = await trainingApi.createPersona(normalized.persona)
        setPersonas((prev) => [payload.data, ...prev])
        return { ok: true, persona: payload.data }
      } catch (error) {
        return failure(error, 'Não foi possível salvar o agente.')
      }
    },
    [permissions],
  )

  const updatePersona = useCallback(
    async (personaId, input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.persona }
      const existing = findPersona(personaId)
      if (!existing) return { ok: false, error: 'Agente não encontrado.' }

      const normalized = normalizePersonaInput({
        ...existing,
        ...input,
      })
      if (!normalized.ok) return { ok: false, errors: normalized.errors }
      try {
        const payload = await trainingApi.updatePersona(personaId, normalized.persona)
        setPersonas((prev) => prev.map((item) => (item.id === personaId ? payload.data : item)))
        return { ok: true, persona: payload.data }
      } catch (error) {
        return failure(error, 'Não foi possível salvar o agente.')
      }
    },
    [findPersona, permissions],
  )

  const deletePersona = useCallback(
    async (personaId) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.persona }
      try {
        await trainingApi.deletePersona(personaId)
        setPersonas((prev) => prev.filter((item) => item.id !== personaId))
        return { ok: true }
      } catch (error) {
        return failure(error, 'Não foi possível excluir o agente.')
      }
    },
    [permissions],
  )

  const createScenario = useCallback(
    async (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.scenario }
      const normalized = normalizeScenarioInput(input, { templateLookup: findTemplate })
      if (!normalized.ok) return { ok: false, errors: normalized.errors }
      if (!findPersona(normalized.scenario.personaId)) return { ok: false, errors: ['Agente vinculado não encontrado.'] }
      try {
        const payload = await trainingApi.createScenario(normalized.scenario)
        setScenarios((prev) => [payload.data, ...prev])
        return { ok: true, scenario: payload.data }
      } catch (error) {
        return failure(error, 'Não foi possível salvar o cenário.')
      }
    },
    [findPersona, findTemplate, permissions],
  )

  const updateScenario = useCallback(
    async (scenarioId, input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.scenario }
      const existing = findScenario(scenarioId)
      if (!existing) return { ok: false, error: 'Cenário não encontrado.' }

      const normalized = normalizeScenarioInput(
        {
          ...existing,
          ...input,
          scriptHintsText:
            input.scriptHintsText != null ? input.scriptHintsText : (existing.scriptHints || []).join('\n'),
          focusText: input.focusText != null ? input.focusText : (existing.focus || []).join('\n'),
        },
        { templateLookup: findTemplate },
      )
      if (!normalized.ok) return { ok: false, errors: normalized.errors }
      if (!findPersona(normalized.scenario.personaId)) return { ok: false, errors: ['Agente vinculado não encontrado.'] }
      try {
        const payload = await trainingApi.updateScenario(scenarioId, normalized.scenario)
        setScenarios((prev) => prev.map((item) => (item.id === scenarioId ? payload.data : item)))
        return { ok: true, scenario: payload.data }
      } catch (error) {
        return failure(error, 'Não foi possível salvar o cenário.')
      }
    },
    [findPersona, findScenario, findTemplate, permissions],
  )

  const deleteScenario = useCallback(
    async (scenarioId) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.scenario }
      try {
        await trainingApi.deleteScenario(scenarioId)
        setScenarios((prev) => prev.filter((item) => item.id !== scenarioId))
        return { ok: true }
      } catch (error) {
        return failure(error, 'Não foi possível excluir o cenário.')
      }
    },
    [permissions],
  )

  const createTemplate = useCallback(
    async (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.template }
      const normalized = normalizeTemplateInput(input)
      if (!normalized.ok) return { ok: false, errors: normalized.errors }
      try {
        const payload = await trainingApi.createTemplate(normalized.template)
        setEvaluationTemplates((prev) => [payload.data, ...prev])
        return { ok: true, template: payload.data }
      } catch (error) {
        return failure(error, 'Não foi possível salvar o playbook.')
      }
    },
    [permissions],
  )

  const updateTemplate = useCallback(
    async (templateId, input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.template }
      if (!findTemplate(templateId)) return { ok: false, error: 'Template não encontrado.' }
      const normalized = normalizeTemplateInput(input)
      if (!normalized.ok) return { ok: false, errors: normalized.errors }
      try {
        const payload = await trainingApi.updateTemplate(templateId, normalized.template)
        setEvaluationTemplates((prev) => prev.map((item) => (item.id === templateId ? payload.data : item)))
        return { ok: true, template: payload.data }
      } catch (error) {
        return failure(error, 'Não foi possível salvar o playbook.')
      }
    },
    [findTemplate, permissions],
  )

  const deleteTemplate = useCallback(
    async (templateId) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) return { ok: false, error: NO_PERMISSION.template }
      try {
        await trainingApi.deleteTemplate(templateId)
        setEvaluationTemplates((prev) => prev.filter((item) => item.id !== templateId))
        return { ok: true }
      } catch (error) {
        return failure(error, 'Não foi possível excluir o playbook.')
      }
    },
    [permissions],
  )

  const installStarterCatalog = useCallback(async () => {
    if (!hasTrainingPermission(permissions, 'training.manage')) {
      return { ok: false, error: 'Somente o administrador do cliente instala o catálogo inicial.' }
    }
    try {
      const payload = await trainingApi.installStarterCatalog()
      await reloadCatalog()
      return { ok: true, installed: payload?.data }
    } catch (error) {
      return failure(error, 'Não foi possível instalar o catálogo inicial.')
    }
  }, [permissions, reloadCatalog])

  // ------------------------------------------------------------------------- practice session

  /** Sync: picks the scenario and opens the setup/briefing steps. The server session starts in `beginConversation`. */
  const startSimulation = useCallback(
    (scenarioId, options = {}) => {
      if (!hasTrainingPermission(permissions, 'training.simulate')) return null
      const scenario = findScenario(scenarioId)
      if (!scenario) return null

      const chosen = options.personaId ? findPersona(options.personaId) : null
      if (options.personaId && !chosen) return null
      const persona = chosen || findPersona(scenario.personaId)

      setSession({
        id: null,
        scenarioId: scenario.id,
        personaId: persona?.id || scenario.personaId,
        mediaMode: mediaModeFor(persona),
      })
      setMessages([])
      setEvaluation(null)
      setShowConversation(true)
      setDraftPersonaId(persona?.id || scenario.personaId || null)
      setPhase(chosen ? 'briefing' : 'setup')
      return scenario
    },
    [findPersona, findScenario, permissions],
  )

  const startPersonaSimulation = useCallback(
    (personaId, mediaMode) => {
      if (!hasTrainingPermission(permissions, 'training.simulate')) return null
      const persona = findPersona(personaId)
      if (!persona) return null
      const chosen = mediaMode === 'text' || mediaMode === 'voice' ? mediaMode : mediaModeFor(persona)
      setSession({
        id: null,
        scenarioId: null,
        personaId: persona.id,
        mediaMode: chosen,
        startedAt: null,
      })
      setMessages([])
      setEvaluation(null)
      setShowConversation(true)
      setDraftPersonaId(persona.id)
      setPhase('briefing')
      return persona
    },
    [findPersona, permissions],
  )

  const selectPersonaForSession = useCallback(
    (personaId) => {
      if (phase !== 'setup' || !session) return false
      const persona = findPersona(personaId)
      if (!persona) return false
      setDraftPersonaId(personaId)
      setSession((prev) => (prev ? { ...prev, personaId: persona.id, mediaMode: mediaModeFor(persona) } : prev))
      return true
    },
    [findPersona, phase, session],
  )

  const confirmPersonaSetup = useCallback(() => {
    if (phase !== 'setup' || !session) return false
    const persona = findPersona(draftPersonaId || session.personaId)
    if (!persona) return false
    setSession((prev) => (prev ? { ...prev, personaId: persona.id, mediaMode: mediaModeFor(persona) } : prev))
    setPhase('briefing')
    return true
  }, [draftPersonaId, findPersona, phase, session])

  const setPracticeMediaMode = useCallback((mediaMode) => {
    const next = mediaMode === 'voice' ? 'voice' : 'text'
    setSession((prev) => (prev ? { ...prev, mediaMode: next } : prev))
  }, [])

  /** Creates the session on the server and gets the persona's opening line. */
  const beginConversation = useCallback(async () => {
    if (phase !== 'briefing' || !session || busyRef.current) return { ok: false }
    busyRef.current = true
    setIsStarting(true)
    try {
      const started = await trainingApi.startSession({
        ...(session.scenarioId ? { scenarioId: session.scenarioId } : {}),
        personaId: session.personaId,
        mediaMode: session.mediaMode,
      })
      setSession((prev) => (prev ? { ...prev, id: started.id, startedAt: Date.now() } : prev))
      setMessages(started.messages || [])
      setPhase('running')
      return { ok: true }
    } catch (error) {
      return failure(error, 'Não foi possível iniciar a conversa.')
    } finally {
      busyRef.current = false
      setIsStarting(false)
    }
  }, [phase, session])

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim()
      if (phase !== 'running' || !session?.id || !text || busyRef.current) return { ok: false }
      busyRef.current = true

      // Shown at once; replaced by the stored messages when the server answers, dropped if it fails.
      const pendingId = `pending_${Date.now()}`
      setMessages((prev) => [
        ...prev,
        { id: pendingId, role: 'user', speaker: 'Você', text, timestamp: new Date().toISOString() },
      ])
      setIsGeneratingReply(true)
      try {
        const offsetMs = session.startedAt ? Math.max(0, Date.now() - session.startedAt) : undefined
        const turn = await trainingApi.sendMessage(session.id, text, offsetMs == null ? {} : { offsetMs })
        setMessages((prev) => [...prev.filter((item) => item.id !== pendingId), turn.userMessage, turn.aiMessage])
        return { ok: true, turnsLeft: turn.turnsLeft }
      } catch (error) {
        setMessages((prev) => prev.filter((item) => item.id !== pendingId))
        return failure(error, 'Não foi possível gerar a resposta do agente.')
      } finally {
        busyRef.current = false
        setIsGeneratingReply(false)
      }
    },
    [phase, session],
  )

  const finishSession = useCallback(async (audioBlob) => {
    if (phase !== 'running' || !session?.id || busyRef.current) return { ok: false }
    if (!messages.some((item) => item.role === 'user')) {
      return { ok: false, error: 'Envie ao menos uma resposta antes de encerrar o treino.' }
    }
    busyRef.current = true
    setIsJudging(true)
    try {
      if (audioBlob) {
        try {
          await trainingApi.uploadSessionAudio(session.id, audioBlob)
        } catch {
          // The score still stands when the recording cannot be stored.
        }
      }
      const finished = await trainingApi.finishSession(session.id)
      setEvaluation(finished.report)
      setMessages(finished.messages || messages)
      setShowConversation(true)
      setPhase('finished')
      refreshProgress()
      return { ok: true }
    } catch (error) {
      return failure(error, 'Não foi possível encerrar o treino.')
    } finally {
      busyRef.current = false
      setIsJudging(false)
    }
  }, [messages, phase, refreshProgress, session])

  /** Report of a stored session, with its transcript. */
  const loadReport = useCallback(async (sessionId) => {
    try {
      const stored = await trainingApi.getSession(sessionId)
      if (!stored.report) return { ok: false, error: 'Esta sessão ainda não foi concluída.' }
      return {
        ok: true,
        report: {
          ...stored.report,
          durationMs: stored.durationMs,
          hasAudio: stored.hasAudio,
          completedAt: stored.report.completedAt || stored.completedAt,
        },
      }
    } catch (error) {
      return failure(error, 'Não foi possível carregar a análise.')
    }
  }, [])

  const resetSimulation = useCallback(() => {
    setSession(null)
    setMessages([])
    setPhase('idle')
    setEvaluation(null)
    setShowConversation(false)
    setDraftPersonaId(null)
    setIsStarting(false)
    setIsGeneratingReply(false)
    setIsJudging(false)
  }, [])

  const value = {
    permissions,
    catalogReady,
    catalogError,
    reloadCatalog,
    aiStatus,
    aiReady: aiStatus ? aiStatus.ai.ready : true,
    aiUnavailableReason: aiStatus && !aiStatus.ai.ready ? aiStatus.ai.reason : null,
    metrics,
    scenarios,
    personas,
    evaluationTemplates,
    getPersona: findPersona,
    ensurePersona,
    getScenario: findScenario,
    getEvaluationTemplate: findTemplate,
    getScenariosForPersona,
    getScenariosForTemplate,
    createEmptyPersonaDraft,
    createEmptyScenarioDraft,
    createEmptyTemplateDraft,
    createEmptyCriterionDraft,
    templateToFormState,
    createPersona,
    updatePersona,
    deletePersona,
    createScenario,
    updateScenario,
    deleteScenario,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    installStarterCatalog,
    session,
    selectedScenario,
    selectedPersona,
    draftPersonaId,
    messages,
    userMessageCount: messages.filter((item) => item.role === 'user' && !String(item.id).startsWith('pending_')).length,
    phase,
    evaluation,
    history,
    isStarting,
    isGeneratingReply,
    isJudging,
    showConversation,
    setShowConversation,
    startSimulation,
    startPersonaSimulation,
    selectPersonaForSession,
    confirmPersonaSetup,
    beginConversation,
    setPracticeMediaMode,
    practiceMediaMode: session?.mediaMode === 'voice' ? 'voice' : 'text',
    sendMessage,
    finishSession,
    loadReport,
    resetSimulation,
    canView: hasTrainingPermission(permissions, 'training.view'),
    canSimulate: hasTrainingPermission(permissions, 'training.simulate'),
    canReport: hasTrainingPermission(permissions, 'training.report'),
    canManage: hasTrainingPermission(permissions, 'training.manage'),
  }

  return <TrainingAiContext.Provider value={value}>{children}</TrainingAiContext.Provider>
}

export function useTrainingAi() {
  const ctx = useContext(TrainingAiContext)
  if (!ctx) {
    throw new Error('useTrainingAi must be used within TrainingAiProvider')
  }
  return ctx
}
