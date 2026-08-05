import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import {
  createEmptyPersonaDraft,
  normalizePersonaInput,
  seedPersonas,
} from '../data/personas.js'
import {
  createTrainingSession,
  resolveScenarioBundle,
  scenariosForPersona,
  trainingMetricsSeed,
  trainingScenarios,
} from '../data/seeds.js'
import { buildSessionEvaluation } from '../services/scoring.js'
import {
  getTrainingPermissionsForUser,
  hasTrainingPermission,
} from '../services/trainingPermissions.js'

const TrainingAiContext = createContext(null)

function computeMetrics(history) {
  if (!history.length) {
    return {
      ...trainingMetricsSeed,
      pending: trainingScenarios.length,
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
      trainingScenarios.length - new Set(history.map((h) => h.scenarioId)).size,
    ),
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
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('idle') // idle | briefing | running | finished
  const [evaluation, setEvaluation] = useState(null)
  const [history, setHistory] = useState([])
  const [showConversation, setShowConversation] = useState(false)

  const findPersona = useCallback(
    (personaId) => personas.find((item) => item.id === personaId) || null,
    [personas],
  )

  const selectedScenario = useMemo(() => {
    if (!session?.scenarioId) return null
    return trainingScenarios.find((item) => item.id === session.scenarioId) ?? null
  }, [session])

  const selectedPersona = useMemo(() => {
    if (!session?.personaId) return null
    return findPersona(session.personaId)
  }, [findPersona, session])

  const getScenariosForPersona = useCallback(
    (personaId) => scenariosForPersona(personaId, trainingScenarios),
    [],
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

  const startSimulation = useCallback(
    (scenarioId, options = {}) => {
      if (!hasTrainingPermission(permissions, 'training.simulate')) return null
      const bundle = resolveScenarioBundle(scenarioId, findPersona)
      if (!bundle?.scenario || !bundle.persona) return null

      const personaOverride = options.personaId
        ? findPersona(options.personaId)
        : bundle.persona
      if (!personaOverride) return null

      const nextSession = createTrainingSession({
        scenario: bundle.scenario,
        persona: personaOverride,
      })
      const opening =
        personaOverride.openingLine || bundle.turns[0]?.ai || 'Iniciando simulação…'

      setSession(nextSession)
      setAnswers([])
      setTurnIndex(0)
      setEvaluation(null)
      setShowConversation(false)
      setPhase('briefing')
      setMessages([
        {
          id: 'm0',
          role: 'ai',
          text: opening,
        },
      ])
      return bundle.scenario
    },
    [findPersona, permissions],
  )

  const beginConversation = useCallback(() => {
    if (phase !== 'briefing' || !session) return
    setPhase('running')
  }, [phase, session])

  const chooseOption = useCallback(
    (option) => {
      if (phase !== 'running' || !session || !selectedScenario) return
      const bundle = resolveScenarioBundle(selectedScenario.id, findPersona)
      const turns = bundle?.turns || []
      const currentTurn = turns[turnIndex]
      if (!currentTurn) return

      const nextAnswers = [...answers, { ...option, turnId: currentTurn.id }]
      const nextMessages = [
        ...messages,
        { id: `u-${currentTurn.id}`, role: 'user', text: option.label },
      ]

      const nextIndex = turnIndex + 1
      if (nextIndex >= turns.length) {
        const report = buildSessionEvaluation({
          session,
          scenario: selectedScenario,
          persona: selectedPersona,
          templateId: selectedScenario.evaluationTemplateId,
          answers: nextAnswers,
          messages: nextMessages,
        })
        const completedSession = {
          ...session,
          messages: nextMessages,
          answers: nextAnswers,
          evaluation: report,
          completedAt: report.completedAt,
          status: 'completed',
        }
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
        {
          id: `a-${turns[nextIndex].id}`,
          role: 'ai',
          text: turns[nextIndex].ai,
        },
      ])
    },
    [
      answers,
      findPersona,
      messages,
      phase,
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
  }, [])

  const value = {
    permissions,
    metrics: computeMetrics(history),
    scenarios: trainingScenarios,
    personas,
    getPersona: findPersona,
    getScenariosForPersona,
    createEmptyPersonaDraft,
    createPersona,
    updatePersona,
    session,
    selectedScenario,
    selectedPersona,
    messages,
    turnIndex,
    currentTurn:
      selectedScenario && phase === 'running'
        ? (resolveScenarioBundle(selectedScenario.id, findPersona)?.turns || [])[turnIndex]
        : null,
    phase,
    evaluation,
    history,
    showConversation,
    setShowConversation,
    startSimulation,
    beginConversation,
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
