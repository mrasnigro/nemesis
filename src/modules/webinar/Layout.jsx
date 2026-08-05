import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { WebinarProvider } from './context/WebinarContext.jsx'
import { IconCalendar } from './components/WebinarIcons.jsx'
import './styles/webinar.css'

const NAV = [
  {
    id: 'events',
    label: 'Eventos',
    to: '/modules/webinar',
    end: true,
    icon: <IconCalendar />,
  },
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
