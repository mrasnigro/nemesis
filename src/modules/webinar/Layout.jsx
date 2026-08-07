import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { WebinarSessionProvider } from './context/WebinarSessionContext.jsx'
import './styles/webinar.css'

/** Primary IA — sidecar FE is no longer a top-nav destination (M5). */
const NAV = [
  {
    id: 'app',
    label: 'Painel',
    to: '/modules/webinar',
    end: true,
  },
  {
    id: 'list',
    label: 'Meus webinars',
    to: '/modules/webinar/webinars',
  },
  {
    id: 'overview',
    label: 'Integração',
    to: '/modules/webinar/overview',
  },
]

export default function WebinarLayout() {
  return (
    <WebinarSessionProvider>
      <ModuleWorkspaceLayout
        title="Webinar"
        badge="Live"
        basePath="/modules/webinar"
        nav={NAV}
      />
    </WebinarSessionProvider>
  )
}
