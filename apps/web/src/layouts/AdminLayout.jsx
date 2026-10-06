import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { loadAdminData, resetAdminStore } from '../data/admin/store'

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true, icon: 'admin' },
  { to: '/admin/customers', label: 'Clientes', icon: 'customers' },
  { to: '/admin/users', label: 'Usuários', icon: 'users' },
  { to: '/admin/modules', label: 'Módulos', icon: 'modules' },
  { to: '/admin/permissions', label: 'Permissões', icon: 'permissions' },
  { to: '/admin/webinar', label: 'Webinar · Planos', icon: 'modules' },
  { to: '/admin/logs', label: 'Logs', icon: 'logs' },
]

const ROUTE_META = {
  '/admin': {
    title: 'Administração',
    subtitle: 'Visão geral do controle da plataforma',
  },
  '/admin/customers': {
    title: 'Clientes',
    subtitle: 'Gestão de contas multi-cliente',
  },
  '/admin/users': {
    title: 'Usuários',
    subtitle: 'Usuários, papéis e acesso',
  },
  '/admin/modules': {
    title: 'Módulos',
    subtitle: 'Atribuição de módulos por cliente',
  },
  '/admin/permissions': {
    title: 'Permissões',
    subtitle: 'Catálogo RBAC e mapa de papéis',
  },
  '/admin/webinar': {
    title: 'Webinar · Planos',
    subtitle: 'Planos, assinaturas e pagamentos do módulo Webinar',
  },
  '/admin/logs': {
    title: 'Activity logs',
    subtitle: 'Auditoria e eventos da plataforma',
  },
}

export default function AdminLayout() {
  const { pathname } = useLocation()
  const meta = ROUTE_META[pathname] ?? ROUTE_META['/admin']

  useEffect(() => {
    loadAdminData()
    return () => resetAdminStore()
  }, [])

  return (
    <Layout
      navItems={NAV_ITEMS}
      title={meta.title}
      subtitle={meta.subtitle}
    />
  )
}
