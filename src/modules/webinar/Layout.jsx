import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { WebinarProvider } from './context/WebinarContext.jsx'

const NAV = [
  { id: 'events', label: 'Eventos', to: '/modules/webinar', end: true },
]

export default function WebinarLayout() {
  return (
    <WebinarProvider>
      <ModuleWorkspaceLayout
        title="Webinar"
        badge="Live"
        basePath="/modules/webinar"
        nav={NAV}
      />
    </WebinarProvider>
  )
}
