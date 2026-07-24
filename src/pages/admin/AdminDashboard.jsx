import { Link } from 'react-router-dom'
import {
  DataTable,
  StatGrid,
  StatusPill,
} from '../../components/admin'
import MetricCard from '../../components/MetricCard'
import Panel from '../../components/Panel'
import {
  getAdminOverviewMetrics,
  getCustomerById,
  getRecentActivity,
} from '../../data/admin'
import './admin-shared.css'

const QUICK_LINKS = [
  { to: '/admin/customers', label: 'Clientes', description: 'Contas multi-cliente' },
  { to: '/admin/users', label: 'Usuários', description: 'Acessos e papéis' },
  { to: '/admin/modules', label: 'Módulos', description: 'Atribuição por cliente' },
  { to: '/admin/permissions', label: 'Permissões', description: 'Catálogo RBAC' },
  { to: '/admin/integrations', label: 'Integrações', description: 'Conexões externas' },
  { to: '/admin/logs', label: 'Logs', description: 'Auditoria da plataforma' },
]

export default function AdminDashboard() {
  const metrics = getAdminOverviewMetrics()
  const recent = getRecentActivity(5)

  return (
    <section className="admin-page">
      <StatGrid>
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            accent={metric.accent}
            trend={metric.trend}
          />
        ))}
      </StatGrid>

      <div className="admin-page__grid">
        <Panel title="Gestão da plataforma" description="Acesse as áreas administrativas do IMP Platform.">
          <div className="admin-quick-links">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="admin-quick-link">
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Atividade recente" description="Últimos eventos do mock de auditoria.">
          <DataTable
            columns={[
              {
                key: 'summary',
                label: 'Evento',
                render: (row) => (
                  <>
                    <span className="data-table__primary">{row.summary}</span>
                    <span className="data-table__secondary">{row.actor}</span>
                  </>
                ),
              },
              {
                key: 'level',
                label: 'Nível',
                render: (row) => <StatusPill value={row.level} />,
              },
              {
                key: 'customer',
                label: 'Cliente',
                render: (row) => getCustomerById(row.customerId)?.name ?? '—',
              },
            ]}
            rows={recent}
          />
        </Panel>
      </div>
    </section>
  )
}
