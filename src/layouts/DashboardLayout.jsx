import { useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { getModuleByPath } from '../modules'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', end: true, icon: 'dashboard' },
]

const DEFAULT_META = {
  title: 'Dashboard',
  subtitle: 'Visão geral do workspace IMP',
}

const ROUTE_META = {
  '/dashboard': DEFAULT_META,
}

function getRouteMeta(pathname) {
  if (ROUTE_META[pathname]) {
    return ROUTE_META[pathname]
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

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const routeMeta = getRouteMeta(pathname)

  return (
    <Layout
      navItems={NAV_ITEMS}
      title={routeMeta.title}
      subtitle={routeMeta.subtitle}
    />
  )
}
