import Layout from '../components/Layout'

const NAV_ITEMS = [
  { to: '/admin', label: 'Administração', end: true, icon: 'admin' },
]

export default function AdminLayout() {
  return (
    <Layout
      navItems={NAV_ITEMS}
      title="Administração"
      subtitle="Controle e configuração da plataforma"
    />
  )
}
