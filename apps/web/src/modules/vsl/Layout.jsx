import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { VslProvider } from './context/VslContext.jsx'

const NAV = [
  { id: 'campaigns', label: 'Campanhas', to: '/modules/vsl', end: true },
]

export default function VslLayout() {
  return (
    <VslProvider>
      <ModuleWorkspaceLayout title="VSL" badge="VSL" basePath="/modules/vsl" nav={NAV} />
    </VslProvider>
  )
}
