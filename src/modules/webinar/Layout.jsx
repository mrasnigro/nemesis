import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { WebinarSessionProvider } from './context/WebinarSessionContext.jsx'
import './styles/webinar.css'

const NAV = [
  {
    id: 'home',
    label: 'Visão geral',
    to: '/modules/webinar',
    end: true,
  },
  {
    id: 'app',
    label: 'Painel',
    to: '/modules/webinar/app',
  },
  {
    id: 'legacy',
    label: 'Abrir sidecar',
    to: '/modules/webinar/sidecar',
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
