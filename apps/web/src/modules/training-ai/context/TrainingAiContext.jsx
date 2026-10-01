import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import {
  createEmptyPersonaDraft,
  normalizePersonaInput,
  seedPersonas,
} from '../data/personas.js'
import {
  createEmptyScenarioDraft,
  normalizeScenarioInput,
  seedScenarios,
  scenariosForPersona,
} from '../data/scenarios.js'
import {
  createEmptyTemplateDraft,
  createEmptyCriterionDraft,
  normalizeTemplateInput,
  seedEvaluationTemplates,
  scenariosUsingTemplate,
  templateToFormState,
} from '../data/evaluationTemplates.js'
import {
  createTrainingSession,
  resolveScenarioBundle,
  trainingMetricsSeed,
} from '../data/seeds.js'
import { getConversationEngine } from '../services/ai/index.js'
import { buildSessionEvaluationAsync } from '../services/scoring.js'
import {
  getTrainingPermissionsForUser,
  hasTrainingPermission,
} from '../services/trainingPermissions.js'
import { trainingApi, trainingDataMode } from '../services/api/client.js'

const TrainingAiContext = createContext(null)

function computeMetrics(history, scenarios) {
  if (!history.length) {
    return {
      ...trainingMetricsSeed,
      pending: scenarios.length,
    }
  }
  const avg = Math.round(
    history.reduce((sum, item) => sum + (item.score || 0), 0) / history.length,
  )
  return {
    completed: history.length,
    avgScore: avg,
    streakDays: Math.min(history.length, 7),
    pending: Math.max(
      0,
      scenarios.length - new Set(history.map((h) => h.scenarioId)).size,
    ),
  }
}

async function completeSessionState({
  session,
  scenario,
  persona,
  messages,
  answers = [],
  mode = 'free',
  templateLookup,
}) {
  const report = await buildSessionEvaluationAsync({
    session,
    scenario,
    persona,
    templateId: scenario.evaluationTemplateId,
    templateLookup,
    answers,
    messages,
    mode,
  })
  return {
    report,
    completedSession: {
      ...session,
      messages,
      answers: report.answers,
      evaluation: report,
      completedAt: report.completedAt,
      status: 'completed',
      mode,
    },
  }
}

export function TrainingAiProvider({ children }) {
  const { user } = useAuth()
  const { hasModuleAccess } = useWorkspace()
  const permissions = useMemo(
    () => getTrainingPermissionsForUser(user, hasModuleAccess('training-ai')),
    [user, hasModuleAccess],
  )

  const useApi = trainingDataMode === 'api'
  const [personas, setPersonas] = useState(() => (useApi ? [] : structuredClone(seedPersonas)))
  const [scenarios, setScenarios] = useState(() => (useApi ? [] : structuredClone(seedScenarios)))
  const [evaluationTemplates, setEvaluationTemplates] = useState(() =>
    useApi ? [] : structuredClone(seedEvaluationTemplates),
  )
  const [catalogReady, setCatalogReady] = useState(!useApi)
  const [catalogError, setCatalogError] = useState(null)
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('idle') // idle | setup | briefing | running | finished
  const [evaluation, setEvaluation] = useState(null)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [isJudging, setIsJudging] = useState(false)
  const [history, setHistory] = useState([])
  const [showConversation, setShowConversation] = useState(true)
  const [draftPersonaId, setDraftPersonaId] = useState(null)

  useEffect(() => {
    if (!useApi) return undefined
    let cancelled = false

    async function loadCatalog() {
      try {
        const [nextPersonas, nextScenarios, nextTemplates, sessions] = await Promise.all([
          trainingApi.listPersonas(),
          trainingApi.listScenarios(),
          trainingApi.listTemplates(),
          trainingApi.listSessions(),
        ])
        if (cancelled) return
        setPersonas(nextPersonas)
        setScenarios(nextScenarios)
        setEvaluationTemplates(nextTemplates)
        setHistory(
          sessions
            .filter((item) => item.report)
            .map((item) => ({
              ...item.report,
              sessionId: item.id,
              scenarioId: item.scenarioId,
              score: item.score ?? item.report.score,
            })),
        )
        setCatalogReady(true)
      } catch (error) {
        if (cancelled) return
        setCatalogError(error.message || 'Não foi possível carregar o treinamento.')
        setCatalogReady(true)
      }
    }

    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [useApi])

  const findPersona = useCallback(
    (personaId) => personas.find((item) => item.id === personaId) || null,
    [personas],
  )

  const findScenario = useCallback(
    (scenarioId) => scenarios.find((item) => item.id === scenarioId) || null,
    [scenarios],
  )

  const findTemplate = useCallback(
    (templateId) =>
      evaluationTemplates.find((item) => item.id === templateId) || null,
    [evaluationTemplates],
  )

  const resolveBundle = useCallback(
    (scenarioId, personaIdOverride) => {
      const bundle = resolveScenarioBundle(
        scenarioId,
        findPersona,
        findScenario,
        findTemplate,
      )
      if (!bundle?.scenario) return null
      if (personaIdOverride) {
        const persona = findPersona(personaIdOverride)
        return persona ? { ...bundle, persona } : bundle
      }
      return bundle
    },
    [findPersona, findScenario, findTemplate],
  )

  const selectedScenario = useMemo(() => {
    if (!session?.scenarioId) return null
    return findScenario(session.scenarioId)
  }, [findScenario, session])

  const selectedPersona = useMemo(() => {
    if (!session?.personaId) return null
    return findPersona(session.personaId)
  }, [findPersona, session])

  const getScenariosForPersona = useCallback(
    (personaId) => scenariosForPersona(personaId, scenarios),
    [scenarios],
  )

  const createPersona = useCallback(
    async (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar personas.' }
      }
      const normalized = normalizePersonaInput(input)
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (useApi) {
        try {
          const payload = await trainingApi.createPersona(normalized.persona)
          const persona = payload.data
          setPersonas((prev) => [persona, ...prev])
          return { ok: true, persona }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }
      const persona = {
        id: `per_${Date.now()}`,
        ...normalized.persona,
      }
      setPersonas((prev) => [persona, ...prev])
      return { ok: true, persona }
    },
    [permissions, useApi],
  )

  const updatePersona = useCallback(
    async (personaId, input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar personas.' }
      }
      const existing = findPersona(personaId)
      if (!existing) return { ok: false, error: 'Persona não encontrada.' }

      const normalized = normalizePersonaInput({
        ...existing,
        ...input,
        objectionsText:
          input.objectionsText != null
            ? input.objectionsText
            : (existing.objections || []).join('\n'),
        prioritiesText:
          input.prioritiesText != null
            ? input.prioritiesText
            : (existing.priorities || []).join('\n'),
      })
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (useApi) {
        try {
          const payload = await trainingApi.updatePersona(personaId, {
            ...normalized.persona,
            id: personaId,
          })
          const persona = payload.data
          setPersonas((prev) => prev.map((item) => (item.id === personaId ? persona : item)))
          return { ok: true, persona }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }
      const persona = { ...existing, ...normalized.persona, id: personaId }
      setPersonas((prev) => prev.map((item) => (item.id === personaId ? persona : item)))
      return { ok: true, persona }
    },
    [findPersona, permissions, useApi],
  )

  const createScenario = useCallback(
    async (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar cenários.' }
      }
      const normalized = normalizeScenarioInput(input, { templateLookup: findTemplate })
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (!findPersona(normalized.scenario.personaId)) {
        return { ok: false, errors: ['Persona vinculada não encontrada.'] }
      }
      if (useApi) {
        try {
          const payload = await trainingApi.createScenario(normalized.scenario)
          const scenario = payload.data
          setScenarios((prev) => [scenario, ...prev])
          return { ok: true, scenario }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }
      const scenario = {
        id: `scn_${Date.now()}`,
        ...normalized.scenario,
      }
      setScenarios((prev) => [scenario, ...prev])
      return { ok: true, scenario }
    },
    [findPersona, findTemplate, permissions, useApi],
  )

  const updateScenario = useCallback(
    async (scenarioId, input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar cenários.' }
      }
      const existing = findScenario(scenarioId)
      if (!existing) return { ok: false, error: 'Cenário não encontrado.' }

      const normalized = normalizeScenarioInput(
        {
          ...existing,
          ...input,
          scriptHintsText:
            input.scriptHintsText != null
              ? input.scriptHintsText
              : (existing.scriptHints || []).join('\n'),
          focusText:
            input.focusText != null
              ? input.focusText
              : (existing.focus || []).join('\n'),
        },
        { templateLookup: findTemplate },
      )
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (!findPersona(normalized.scenario.personaId)) {
        return { ok: false, errors: ['Persona vinculada não encontrada.'] }
      }
      if (useApi) {
        try {
          const payload = await trainingApi.updateScenario(scenarioId, {
            ...normalized.scenario,
            id: scenarioId,
          })
          const scenario = payload.data
          setScenarios((prev) => prev.map((item) => (item.id === scenarioId ? scenario : item)))
          return { ok: true, scenario }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }
      const scenario = { ...existing, ...normalized.scenario, id: scenarioId }
      setScenarios((prev) => prev.map((item) => (item.id === scenarioId ? scenario : item)))
      return { ok: true, scenario }
    },
    [findPersona, findScenario, findTemplate, permissions, useApi],
  )

  const createTemplate = useCallback(
    async (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar templates.' }
      }
      const normalized = normalizeTemplateInput(input)
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (useApi) {
        try {
          const payload = await trainingApi.createTemplate(normalized.template)
          const template = payload.data
          setEvaluationTemplates((prev) => [template, ...prev])
          return { ok: true, template }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }
      const template = {
        id: `tpl_${Date.now()}`,
        ...normalized.template,
      }
      setEvaluationTemplates((prev) => [template, ...prev])
      return { ok: true, template }
    },
    [permissions, useApi],
  )

  const updateTemplate = useCallback(
    async (templateId, input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar templates.' }
      }
      const existing = findTemplate(templateId)
      if (!existing) return { ok: false, error: 'Template não encontrado.' }

      const normalized = normalizeTemplateInput(input)
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (useApi) {
        try {
          const payload = await trainingApi.updateTemplate(templateId, {
            ...normalized.template,
            id: templateId,
          })
          const template = payload.data
          setEvaluationTemplates((prev) =>
            prev.map((item) => (item.id === templateId ? template : item)),
          )
          return { ok: true, template }
        } catch (error) {
          return { ok: false, error: error.message }
        }
      }
      const template = { ...existing, ...normalized.template, id: templateId }
      setEvaluationTemplates((prev) =>
        prev.map((item) => (item.id === templateId ? template : item)),
      )
      return { ok: true, template }
    },
    [findTemplate, permissions, useApi],
  )

  const getScenariosForTemplate = useCallback(
    (templateId) => scenariosUsingTemplate(templateId, scenarios),
    [scenarios],
  )

  const startSimulation = useCallback(
    (scenarioId, options = {}) => {
      if (!hasTrainingPermission(permissions, 'training.simulate')) return null
      const bundle = resolveBundle(scenarioId)
      if (!bundle?.scenario) return null

      const personaOverride = options.personaId
        ? findPersona(options.personaId)
        : null
      const skipSetup = Boolean(personaOverride)

      const personaForSession = personaOverride || bundle.persona
      if (!personaForSession && skipSetup) return null

      try {
        const nextSession = createTrainingSession({
          scenario: bundle.scenario,
          persona: personaForSession || { id: bundle.scenario.personaId },
          mode: 'free',
        })

        const openingSource = personaForSession || bundle.persona
        const engine = getConversationEngine()

        setSession(nextSession)
        setAnswers([])
        setTurnIndex(0)
        setEvaluation(null)
        setShowConversation(true)
        setDraftPersonaId(
          personaOverride?.id || bundle.scenario.personaId || personas[0]?.id || null,
        )
        setPhase(skipSetup ? 'briefing' : 'setup')
        setMessages([
          engine.createOpeningMessage({
            persona: openingSource,
            scriptTurns: bundle.turns || [],
          }),
        ])
        return bundle.scenario
      } catch (error) {
        console.error('[training-ai] startSimulation error', error)
        return null
      }
    },
    [findPersona, permissions, personas, resolveBundle],
  )

  const selectPersonaForSession = useCallback(
    (personaId) => {
      if (phase !== 'setup' || !session) return false
      const persona = findPersona(personaId)
      if (!persona) return false

      const bundle = resolveBundle(session.scenarioId)
      const engine = getConversationEngine()

      setDraftPersonaId(personaId)
      setSession((prev) =>
        prev
          ? {
              ...prev,
              personaId: persona.id,
            }
          : prev,
      )
      setMessages([
        engine.createOpeningMessage({
          persona,
          scriptTurns: bundle?.turns || [],
        }),
      ])
      return true
    },
    [findPersona, phase, resolveBundle, session],
  )

  const confirmPersonaSetup = useCallback(() => {
    if (phase !== 'setup' || !session) return false
    const personaId = draftPersonaId || session.personaId
    const persona = findPersona(personaId)
    if (!persona) return false

    const bundle = resolveBundle(session.scenarioId)
    const engine = getConversationEngine()

    setSession((prev) =>
      prev
        ? {
            ...prev,
            personaId: persona.id,
            mediaMode:
              persona.interactionMode === 'voice' || persona.interactionMode === 'both'
                ? 'voice'
                : 'text',
          }
        : prev,
    )
    setMessages([
      engine.createOpeningMessage({
        persona,
        scriptTurns: bundle?.turns || [],
      }),
    ])
    setPhase('briefing')
    return true
  }, [draftPersonaId, findPersona, phase, resolveBundle, session])

  const setPracticeMediaMode = useCallback(
    (mediaMode) => {
      const next = mediaMode === 'voice' ? 'voice' : 'text'
      setSession((prev) => (prev ? { ...prev, mediaMode: next } : prev))
    },
    [],
  )

  const beginConversation = useCallback(() => {
    if (phase !== 'briefing' || !session) return
    setSession((prev) =>
      prev
        ? {
            ...prev,
            mediaMode: prev.mediaMode === 'voice' ? 'voice' : 'text',
          }
        : prev,
    )
    setPhase('running')
  }, [phase, session])

  const sendMessage = useCallback(
    async (rawText) => {
      if (phase !== 'running' || !session || !selectedScenario || isGeneratingReply) {
        return false
      }
      const text = String(rawText || '').trim()
      if (!text) return false

      const bundle = resolveBundle(selectedScenario.id)
      const userCount = messages.filter((m) => m.role === 'user').length
      const engine = getConversationEngine()
      const userMessage = engine.createUserMessage(text)
      const pendingMessages = [...messages, userMessage]
      setMessages(pendingMessages)
      setIsGeneratingReply(true)

      try {
        const aiMessage = await engine.generateReplyMessageAsync({
          persona: selectedPersona,
          scenario: selectedScenario,
          template: bundle?.template || null,
          scriptTurns: bundle?.turns || [],
          messages: pendingMessages,
          exchangeIndex: userCount,
          userText: text,
          session,
        })

        const nextMessages = [...pendingMessages, aiMessage]
        setMessages(nextMessages)
        setTurnIndex(userCount + 1)
        setSession((prev) => (prev ? { ...prev, messages: nextMessages } : prev))
        return true
      } catch {
        setMessages(messages)
        return false
      } finally {
        setIsGeneratingReply(false)
      }
    },
    [
      isGeneratingReply,
      messages,
      phase,
      resolveBundle,
      selectedPersona,
      selectedScenario,
      session,
    ],
  )

  const finishSession = useCallback(async () => {
    if (phase !== 'running' || !session || !selectedScenario || isJudging) return false
    const userMessages = messages.filter((m) => m.role === 'user')
    if (!userMessages.length) return false

    setIsJudging(true)
    try {
      const { report, completedSession } = await completeSessionState({
        session,
        scenario: selectedScenario,
        persona: selectedPersona,
        messages,
        answers: [],
        mode: 'free',
        templateLookup: findTemplate,
      })

      let storedReport = report
      if (useApi) {
        const saved = await trainingApi.createSession({
          scenarioId: selectedScenario.id,
          personaId: selectedPersona?.id,
          status: 'completed',
          score: report.score ?? null,
          report,
        })
        storedReport = { ...report, sessionId: saved.data.id }
      }

      setSession(completedSession)
      setAnswers(report.answers)
      setEvaluation(storedReport)
      setHistory((prev) => [storedReport, ...prev])
      setShowConversation(true)
      setPhase('finished')
      return true
    } catch {
      return false
    } finally {
      setIsJudging(false)
    }
  }, [
    findTemplate,
    isJudging,
    useApi,
    messages,
    phase,
    selectedPersona,
    selectedScenario,
    session,
  ])

  /** Legacy MCQ path kept for smoke / optional demos. */
  const chooseOption = useCallback(
    async (option) => {
      if (phase !== 'running' || !session || !selectedScenario) return
      const bundle = resolveBundle(selectedScenario.id)
      const turns = bundle?.turns || []
      const currentTurn = turns[turnIndex]
      if (!currentTurn) return

      const engine = getConversationEngine()
      const nextAnswers = [...answers, { ...option, turnId: currentTurn.id }]
      const userMessage = engine.createUserMessage(option.label)
      const nextMessages = [...messages, userMessage]

      const nextIndex = turnIndex + 1
      if (nextIndex >= turns.length) {
        const { report, completedSession } = await completeSessionState({
          session,
          scenario: selectedScenario,
          persona: selectedPersona,
          messages: nextMessages,
          answers: nextAnswers,
          mode: 'mcq',
          templateLookup: findTemplate,
        })
        setSession(completedSession)
        setAnswers(nextAnswers)
        setMessages(nextMessages)
        setTurnIndex(nextIndex)
        setEvaluation(report)
        setHistory((prev) => [report, ...prev])
        setPhase('finished')
        return
      }

      setAnswers(nextAnswers)
      setTurnIndex(nextIndex)
      setMessages([
        ...nextMessages,
        engine.createAiMessage(turns[nextIndex].ai, {
          speaker: selectedPersona?.name || 'Persona',
        }),
      ])
    },
    [
      answers,
      findTemplate,
      messages,
      phase,
      resolveBundle,
      selectedPersona,
      selectedScenario,
      session,
      turnIndex,
    ],
  )

  const resetSimulation = useCallback(() => {
    setSession(null)
    setMessages([])
    setTurnIndex(0)
    setAnswers([])
    setPhase('idle')
    setEvaluation(null)
    setShowConversation(false)
    setDraftPersonaId(null)
    setIsGeneratingReply(false)
    setIsJudging(false)
  }, [])

  const value = {
    permissions,
    catalogReady,
    catalogError,
    metrics: computeMetrics(history, scenarios),
    scenarios,
    personas,
    evaluationTemplates,
    getPersona: findPersona,
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
    createScenario,
    updateScenario,
    createTemplate,
    updateTemplate,
    session,
    selectedScenario,
    selectedPersona,
    draftPersonaId,
    messages,
    turnIndex,
    userMessageCount: messages.filter((m) => m.role === 'user').length,
    currentTurn:
      selectedScenario && phase === 'running' && session?.mode === 'mcq'
        ? (resolveBundle(selectedScenario.id)?.turns || [])[turnIndex]
        : null,
    phase,
    evaluation,
    history,
    isGeneratingReply,
    isJudging,
    showConversation,
    setShowConversation,
    startSimulation,
    selectPersonaForSession,
    confirmPersonaSetup,
    beginConversation,
    setPracticeMediaMode,
    practiceMediaMode: session?.mediaMode === 'voice' ? 'voice' : 'text',
    sendMessage,
    finishSession,
    chooseOption,
    resetSimulation,
    canView: hasTrainingPermission(permissions, 'training.view'),
    canSimulate: hasTrainingPermission(permissions, 'training.simulate'),
    canReport: hasTrainingPermission(permissions, 'training.report'),
    canManage: hasTrainingPermission(permissions, 'training.manage'),
  }

  return (
    <TrainingAiContext.Provider value={value}>{children}</TrainingAiContext.Provider>
  )
}

export function useTrainingAi() {
  const ctx = useContext(TrainingAiContext)
  if (!ctx) {
    throw new Error('useTrainingAi must be used within TrainingAiProvider')
  }
  return ctx
}
