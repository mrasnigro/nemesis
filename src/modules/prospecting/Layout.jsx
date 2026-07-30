import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { ProspectingProvider } from './context/ProspectingContext.jsx'

const NAV = [
  { id: 'search', label: 'Busca', to: '/modules/prospecting', end: true },
  { id: 'send', label: 'Enviar ao BDR', to: '/modules/prospecting/enviar-bdr' },
]

export default function ProspectingLayout() {
  return (
    <ProspectingProvider>
      <ModuleWorkspaceLayout
        title="Prospecção"
        badge="PRO"
        basePath="/modules/prospecting"
        nav={NAV}
      />
    </ProspectingProvider>
  )
}
