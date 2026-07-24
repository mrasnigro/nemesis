import { useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { getModuleByPath } from '../modules'
import { useWorkspace } from '../workspace/WorkspaceContext'

const DEFAULT_META = {
  title: 'Dashboard',
  subtitle: 'Visão geral do workspace IMP',
}

function getRouteMeta(pathname) {
  if (pathname === '/dashboard') {
    return DEFAULT_META
  }

  const module = getModuleByPath(pathname)

  if (module) {
    return {
      title: module.title,
      subtitle: module.description,
    }
  }

  return DEFAULT_META
}

function moduleIcon(moduleId) {
  const icons = {
    'training-ai': 'modules',
    bdr: 'phone',
    prospecting: 'users',
    radar: 'modules',
    webinar: 'modules',
    vsl: 'modules',
  }
  return icons[moduleId] ?? 'modules'
}

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { availableModules } = useWorkspace()
  const routeMeta = getRouteMeta(pathname)
  const activeModule = getModuleByPath(pathname)

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', end: true, icon: 'dashboard' },
    ...availableModules.map((module) => ({
      to: module.path,
      label: module.title,
      icon: moduleIcon(module.id),
      section: 'Módulos',
    })),
  ]

  const featureItems =
    activeModule?.features?.map((feature, index) => ({
      id: `${activeModule.id}-feature-${index}`,
      label: feature,
    })) ?? []

  return (
    <Layout
      navItems={navItems}
      featureItems={featureItems}
      featureTitle={activeModule ? `Funcionalidades · ${activeModule.badge}` : null}
      title={routeMeta.title}
      subtitle={routeMeta.subtitle}
    />
  )
}
