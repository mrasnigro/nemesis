import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { TrainingAiProvider } from './context/TrainingAiContext.jsx'

const NAV = [
  { id: 'catalog', label: 'Catálogo', to: '/modules/training-ai', end: true },
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
