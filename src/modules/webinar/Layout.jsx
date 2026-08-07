import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { WebinarSessionProvider } from './context/WebinarSessionContext.jsx'
import './styles/webinar.css'

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
    label: 'Status bridge',
    to: '/modules/webinar/overview',
  },
  {
    id: 'legacy',
    label: 'Sidecar (legado)',
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
