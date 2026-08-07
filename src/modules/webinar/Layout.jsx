import { useMemo } from 'react'
import ModuleWorkspaceLayout from '../../layouts/ModuleWorkspaceLayout.jsx'
import { useAuth } from '../../auth/AuthContext'
import { useWebinarSession } from './context/WebinarSessionContext.jsx'
import './styles/webinar.css'
import './live/webinar-live.css'

const CLIENT_NAV = [
  { id: 'dashboard', label: 'Início', to: '/modules/webinar/dashboard', end: true },
  { id: 'webinars', label: 'Meus Webinars', to: '/modules/webinar/dashboard/webinars' },
  { id: 'leads', label: 'Leads', to: '/modules/webinar/dashboard/leads' },
  { id: 'subscription', label: 'Assinatura', to: '/modules/webinar/dashboard/subscription' },
  { id: 'profile', label: 'Perfil', to: '/modules/webinar/dashboard/profile' },
]

const ADMIN_NAV = [
  { id: 'admin-dash', label: 'Admin', to: '/modules/webinar/admin/dashboard' },
  { id: 'admin-users', label: 'Usuários', to: '/modules/webinar/admin/users' },
  { id: 'admin-plans', label: 'Planos', to: '/modules/webinar/admin/plans' },
  { id: 'admin-webinars', label: 'Webinars (admin)', to: '/modules/webinar/admin/webinars' },
]

export default function WebinarLayout() {
  const { user: impUser } = useAuth()
  const { session } = useWebinarSession()

  const nav = useMemo(() => {
    const isAdmin = session?.user?.role === 'admin' || impUser?.role === 'admin'
    return isAdmin ? [...CLIENT_NAV, ...ADMIN_NAV] : CLIENT_NAV
  }, [impUser?.role, session?.user?.role])

  return (
    <ModuleWorkspaceLayout
      title="Webinar"
      badge="Live"
      basePath="/modules/webinar"
      nav={nav}
    />
  )
}
