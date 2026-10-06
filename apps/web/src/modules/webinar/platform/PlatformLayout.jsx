import ModuleWorkspaceLayout from '../../../layouts/ModuleWorkspaceLayout.jsx'
import '../styles/webinar.css'
import './styles/webinar-platform.css'

export const PLATFORM_BASE = '/modules/webinar/plataforma'

const NAV = [
  { id: 'home', label: 'Início', to: PLATFORM_BASE, end: true },
  { id: 'webinars', label: 'Webinars', to: `${PLATFORM_BASE}/webinars` },
  { id: 'leads', label: 'Leads', to: `${PLATFORM_BASE}/leads` },
  { id: 'subscription', label: 'Assinatura', to: `${PLATFORM_BASE}/assinatura` },
  { id: 'live', label: 'Transmissão (versão atual)', to: '/modules/webinar/dashboard' },
]

export default function WebinarPlatformLayout() {
  return <ModuleWorkspaceLayout title="Webinar" badge="Plataforma" basePath={PLATFORM_BASE} nav={NAV} />
}
