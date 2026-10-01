import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { TrainingAiProvider, useTrainingAi } from './context/TrainingAiContext.jsx'
import './styles/training-ai.css'

const NAV = [
  { id: 'catalog', label: 'Catálogo', to: '/modules/training-ai', end: true },
  { id: 'scenarios', label: 'Cenários', to: '/modules/training-ai/cenarios' },
  { id: 'personas', label: 'Agentes', to: '/modules/training-ai/personas' },
  { id: 'templates', label: 'Playbooks', to: '/modules/training-ai/templates' },
  { id: 'history', label: 'Insights', to: '/modules/training-ai/historico' },
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
