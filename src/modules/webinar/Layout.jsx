import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import './styles/webinar.css'

const NAV = [
  {
    id: 'home',
    label: 'Webinar',
    to: '/modules/webinar',
    end: true,
  },
]

export default function WebinarLayout() {
  return (
    <ModuleWorkspaceLayout
      title="Webinar"
      badge="Live"
      basePath="/modules/webinar"
      nav={NAV}
    />
  )
}
