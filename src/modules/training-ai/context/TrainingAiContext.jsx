import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import {
  buildEvaluation,
  simulationTurnsByScenario,
  trainingMetrics,
  trainingScenarios,
} from '../data/seeds.js'
import {
  getTrainingPermissionsForUser,
  hasTrainingPermission,
} from '../services/trainingPermissions.js'

const TrainingAiContext = createContext(null)

export function TrainingAiProvider({ children }) {
  const { user } = useAuth()
  const { hasModuleAccess } = useWorkspace()
  const permissions = useMemo(
    () => getTrainingPermissionsForUser(user, hasModuleAccess('training-ai')),
    [user, hasModuleAccess],
  )

  const [selectedScenarioId, setSelectedScenarioId] = useState(null)
  const [messages, setMessages] = useState([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('idle') // idle | running | finished
  const [evaluation, setEvaluation] = useState(null)
  const [history, setHistory] = useState([])

  const selectedScenario = useMemo(
    () => trainingScenarios.find((item) => item.id === selectedScenarioId) ?? null,
    [selectedScenarioId],
  )

  const startSimulation = useCallback(
    (scenarioId) => {
      if (!hasTrainingPermission(permissions, 'training.simulate')) return null
      const scenario = trainingScenarios.find((item) => item.id === scenarioId)
      if (!scenario) return null
      const turns = simulationTurnsByScenario[scenarioId] || []
      setSelectedScenarioId(scenarioId)
      setAnswers([])
      setTurnIndex(0)
      setEvaluation(null)
      setPhase('running')
      setMessages([
        {
          id: 'm0',
          role: 'ai',
          text: turns[0]?.ai || 'Iniciando simulação…',
        },
      ])
      return scenario
    },
    [permissions],
  )

  const chooseOption = useCallback(
    (option) => {
      if (phase !== 'running' || !selectedScenario) return
      const turns = simulationTurnsByScenario[selectedScenario.id] || []
      const currentTurn = turns[turnIndex]
      if (!currentTurn) return

      const nextAnswers = [...answers, { ...option, turnId: currentTurn.id }]
      const nextMessages = [
        ...messages,
        { id: `u-${currentTurn.id}`, role: 'user', text: option.label },
      ]

      const nextIndex = turnIndex + 1
      if (nextIndex >= turns.length) {
        const report = buildEvaluation(selectedScenario, nextAnswers)
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
    [answers, messages, phase, selectedScenario, turnIndex],
  )

  const resetSimulation = useCallback(() => {
    setSelectedScenarioId(null)
    setMessages([])
    setTurnIndex(0)
    setAnswers([])
    setPhase('idle')
    setEvaluation(null)
  }, [])

  const value = {
    permissions,
    metrics: trainingMetrics,
    scenarios: trainingScenarios,
    selectedScenario,
    messages,
    turnIndex,
    currentTurn:
      selectedScenario && phase === 'running'
        ? (simulationTurnsByScenario[selectedScenario.id] || [])[turnIndex]
        : null,
    phase,
    evaluation,
    history,
    startSimulation,
    chooseOption,
    resetSimulation,
    canView: hasTrainingPermission(permissions, 'training.view'),
    canSimulate: hasTrainingPermission(permissions, 'training.simulate'),
    canReport: hasTrainingPermission(permissions, 'training.report'),
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
