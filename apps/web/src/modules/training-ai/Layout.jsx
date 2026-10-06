import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { TrainingAiProvider, useTrainingAi } from './context/TrainingAiContext.jsx'
import './styles/training-ai.css'

const NAV = [
  { id: 'personas', label: 'Personas', to: '/modules/training-ai/personas' },
  { id: 'templates', label: 'Templates de avaliação', to: '/modules/training-ai/templates' },
  { id: 'history', label: 'Histórico', to: '/modules/training-ai/historico' },
  { id: 'engagement', label: 'Engajamento', to: '/modules/training-ai/dashboards/engajamento' },
  { id: 'ranking', label: 'Ranking', to: '/modules/training-ai/dashboards/ranking' },
  { id: 'performance', label: 'Performance', to: '/modules/training-ai/dashboards/performance' },
  { id: 'communication', label: 'Métricas de comunicação', to: '/modules/training-ai/dashboards/comunicacao' },
  { id: 'groups', label: 'Grupos', to: '/modules/training-ai/grupos' },
]

function TrainingWorkspace() {
  const { catalogReady, catalogError } = useTrainingAi()

  if (!catalogReady) {
    return (
      <section className="imp-module">
        <p>Carregando treinamento...</p>
      </section>
    )
  }

  if (catalogError) {
    return (
      <section className="imp-module">
        <h2>Treinamento IA</h2>
        <p>{catalogError}</p>
      </section>
    )
  }

  return (
    <ModuleWorkspaceLayout
      title="Treinamento IA"
      badge="IA"
      basePath="/modules/training-ai"
      nav={NAV}
    />
  )
}

export default function TrainingAiLayout() {
  return (
    <TrainingAiProvider>
      <TrainingWorkspace />
    </TrainingAiProvider>
  )
}
