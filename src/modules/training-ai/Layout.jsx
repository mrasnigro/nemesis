import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { TrainingAiProvider } from './context/TrainingAiContext.jsx'
import './styles/training-ai.css'

const NAV = [
  { id: 'catalog', label: 'Catálogo', to: '/modules/training-ai', end: true },
  { id: 'scenarios', label: 'Cenários', to: '/modules/training-ai/cenarios' },
  { id: 'personas', label: 'Personas', to: '/modules/training-ai/personas' },
  { id: 'history', label: 'Histórico', to: '/modules/training-ai/historico' },
]

export default function TrainingAiLayout() {
  return (
    <TrainingAiProvider>
      <ModuleWorkspaceLayout
        title="Treinamento IA"
        badge="IA"
        basePath="/modules/training-ai"
        nav={NAV}
      />
    </TrainingAiProvider>
  )
}
