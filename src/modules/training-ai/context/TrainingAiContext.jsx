import { createContext, useCallback, useContext, useMemo, useState } from 'react'
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
  createTrainingSession,
  resolveScenarioBundle,
  trainingMetricsSeed,
} from '../data/seeds.js'
import {
  createConversationMessage,
  generateMockReply,
} from '../services/conversation.js'
import { buildSessionEvaluation } from '../services/scoring.js'
import {
  getTrainingPermissionsForUser,
  hasTrainingPermission,
} from '../services/trainingPermissions.js'

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

function completeSessionState({
  session,
  scenario,
  persona,
  messages,
  answers = [],
  mode = 'free',
}) {
  const report = buildSessionEvaluation({
    session,
    scenario,
    persona,
    templateId: scenario.evaluationTemplateId,
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

  const [personas, setPersonas] = useState(() => structuredClone(seedPersonas))
  const [scenarios, setScenarios] = useState(() => structuredClone(seedScenarios))
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('idle') // idle | setup | briefing | running | finished
  const [evaluation, setEvaluation] = useState(null)
  const [history, setHistory] = useState([])
  const [showConversation, setShowConversation] = useState(false)
  const [draftPersonaId, setDraftPersonaId] = useState(null)

  const findPersona = useCallback(
    (personaId) => personas.find((item) => item.id === personaId) || null,
    [personas],
  )

  const findScenario = useCallback(
    (scenarioId) => scenarios.find((item) => item.id === scenarioId) || null,
    [scenarios],
  )

  const resolveBundle = useCallback(
    (scenarioId, personaIdOverride) => {
      const bundle = resolveScenarioBundle(scenarioId, findPersona, findScenario)
      if (!bundle?.scenario) return null
      if (personaIdOverride) {
        const persona = findPersona(personaIdOverride)
        return persona ? { ...bundle, persona } : bundle
      }
      return bundle
    },
    [findPersona, findScenario],
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
    (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar personas.' }
      }
      const normalized = normalizePersonaInput(input)
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      const persona = {
        id: `per_${Date.now()}`,
        ...normalized.persona,
      }
      setPersonas((prev) => [persona, ...prev])
      return { ok: true, persona }
    },
    [permissions],
  )

  const updatePersona = useCallback(
    (personaId, input) => {
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
      const persona = { ...existing, ...normalized.persona, id: personaId }
      setPersonas((prev) => prev.map((item) => (item.id === personaId ? persona : item)))
      return { ok: true, persona }
    },
    [findPersona, permissions],
  )

  const createScenario = useCallback(
    (input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar cenários.' }
      }
      const normalized = normalizeScenarioInput(input)
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (!findPersona(normalized.scenario.personaId)) {
        return { ok: false, errors: ['Persona vinculada não encontrada.'] }
      }
      const scenario = {
        id: `scn_${Date.now()}`,
        ...normalized.scenario,
      }
      setScenarios((prev) => [scenario, ...prev])
      return { ok: true, scenario }
    },
    [findPersona, permissions],
  )

  const updateScenario = useCallback(
    (scenarioId, input) => {
      if (!hasTrainingPermission(permissions, 'training.manage')) {
        return { ok: false, error: 'Sem permissão para gerenciar cenários.' }
      }
      const existing = findScenario(scenarioId)
      if (!existing) return { ok: false, error: 'Cenário não encontrado.' }

      const normalized = normalizeScenarioInput({
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
      })
      if (!normalized.ok) {
        return { ok: false, errors: normalized.errors }
      }
      if (!findPersona(normalized.scenario.personaId)) {
        return { ok: false, errors: ['Persona vinculada não encontrada.'] }
      }
      const scenario = { ...existing, ...normalized.scenario, id: scenarioId }
      setScenarios((prev) => prev.map((item) => (item.id === scenarioId ? scenario : item)))
      return { ok: true, scenario }
    },
    [findPersona, findScenario, permissions],
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

      const nextSession = createTrainingSession({
        scenario: bundle.scenario,
        persona: personaForSession || { id: bundle.scenario.personaId },
        mode: 'free',
      })

      const openingSource = personaForSession || bundle.persona
      const opening =
        openingSource?.openingLine ||
        bundle.turns[0]?.ai ||
        'Iniciando simulação…'

      setSession(nextSession)
      setAnswers([])
      setTurnIndex(0)
      setEvaluation(null)
      setShowConversation(false)
      setDraftPersonaId(
        personaOverride?.id || bundle.scenario.personaId || personas[0]?.id || null,
      )
      setPhase(skipSetup ? 'briefing' : 'setup')
      setMessages([
        createConversationMessage({
          role: 'ai',
          speaker: openingSource?.name || 'Persona',
          text: opening,
        }),
      ])
      return bundle.scenario
    },
    [findPersona, permissions, personas, resolveBundle],
  )

  const selectPersonaForSession = useCallback(
    (personaId) => {
      if (phase !== 'setup' || !session) return false
      const persona = findPersona(personaId)
      if (!persona) return false

      const bundle = resolveBundle(session.scenarioId)
      const opening =
        persona.openingLine || bundle?.turns?.[0]?.ai || 'Iniciando simulação…'

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
        createConversationMessage({
          role: 'ai',
          speaker: persona.name,
          text: opening,
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
    const opening =
      persona.openingLine || bundle?.turns?.[0]?.ai || 'Iniciando simulação…'

    setSession((prev) =>
      prev
        ? {
            ...prev,
            personaId: persona.id,
          }
        : prev,
    )
    setMessages([
      createConversationMessage({
        role: 'ai',
        speaker: persona.name,
        text: opening,
      }),
    ])
    setPhase('briefing')
    return true
  }, [draftPersonaId, findPersona, phase, resolveBundle, session])

  const beginConversation = useCallback(() => {
    if (phase !== 'briefing' || !session) return
    setPhase('running')
  }, [phase, session])

  const sendMessage = useCallback(
    (rawText) => {
      if (phase !== 'running' || !session || !selectedScenario) return false
      const text = String(rawText || '').trim()
      if (!text) return false

      const bundle = resolveBundle(selectedScenario.id)
      const userCount = messages.filter((m) => m.role === 'user').length
      const userMessage = createConversationMessage({
        role: 'user',
        speaker: 'Você',
        text,
      })

      const replyText = generateMockReply({
        persona: selectedPersona,
        scenario: selectedScenario,
        scriptTurns: bundle?.turns || [],
        exchangeIndex: userCount,
        userText: text,
      })

      const aiMessage = createConversationMessage({
        role: 'ai',
        speaker: selectedPersona?.name || 'Persona',
        text: replyText,
      })

      const nextMessages = [...messages, userMessage, aiMessage]
      setMessages(nextMessages)
      setTurnIndex(userCount + 1)
      setSession((prev) => (prev ? { ...prev, messages: nextMessages } : prev))
      return true
    },
    [
      messages,
      phase,
      resolveBundle,
      selectedPersona,
      selectedScenario,
      session,
    ],
  )

  const finishSession = useCallback(() => {
    if (phase !== 'running' || !session || !selectedScenario) return false
    const userMessages = messages.filter((m) => m.role === 'user')
    if (!userMessages.length) return false

    const { report, completedSession } = completeSessionState({
      session,
      scenario: selectedScenario,
      persona: selectedPersona,
      messages,
      answers: [],
      mode: 'free',
    })

    setSession(completedSession)
    setAnswers(report.answers)
    setEvaluation(report)
    setHistory((prev) => [report, ...prev])
    setPhase('finished')
    return true
  }, [messages, phase, selectedPersona, selectedScenario, session])

  /** Legacy MCQ path kept for smoke / optional demos. */
  const chooseOption = useCallback(
    (option) => {
      if (phase !== 'running' || !session || !selectedScenario) return
      const bundle = resolveBundle(selectedScenario.id)
      const turns = bundle?.turns || []
      const currentTurn = turns[turnIndex]
      if (!currentTurn) return

      const nextAnswers = [...answers, { ...option, turnId: currentTurn.id }]
      const userMessage = createConversationMessage({
        role: 'user',
        speaker: 'Você',
        text: option.label,
      })
      const nextMessages = [...messages, userMessage]

      const nextIndex = turnIndex + 1
      if (nextIndex >= turns.length) {
        const { report, completedSession } = completeSessionState({
          session,
          scenario: selectedScenario,
          persona: selectedPersona,
          messages: nextMessages,
          answers: nextAnswers,
          mode: 'mcq',
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
        createConversationMessage({
          role: 'ai',
          speaker: selectedPersona?.name || 'Persona',
          text: turns[nextIndex].ai,
        }),
      ])
    },
    [
      answers,
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
  }, [])

  const value = {
    permissions,
    metrics: computeMetrics(history, scenarios),
    scenarios,
    personas,
    getPersona: findPersona,
    getScenario: findScenario,
    getScenariosForPersona,
    createEmptyPersonaDraft,
    createEmptyScenarioDraft,
    createPersona,
    updatePersona,
    createScenario,
    updateScenario,
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
    showConversation,
    setShowConversation,
    startSimulation,
    selectPersonaForSession,
    confirmPersonaSetup,
    beginConversation,
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
