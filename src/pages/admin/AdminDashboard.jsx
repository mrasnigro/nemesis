import { Link } from 'react-router-dom'
import {
  DataTable,
  StatGrid,
  StatusPill,
} from '../../components/admin'
import MetricCard from '../../components/MetricCard'
import Panel from '../../components/Panel'
import { getAdminOverviewMetrics, getRecentActivity } from '../../data/admin'
import { useAdminStore } from '../../hooks/useAdminStore'
import './admin-shared.css'

const WORKFLOW = [
  {
    step: '1',
    title: 'Criar cliente',
    description: 'Cadastre a conta e módulos iniciais.',
    to: '/admin/customers',
  },
  {
    step: '2',
    title: 'Atribuir módulos',
    description: 'Habilite produtos por cliente e usuário.',
    to: '/admin/modules',
  },
  {
    step: '3',
    title: 'Criar usuário',
    description: 'Vincule acessos à conta do cliente.',
    to: '/admin/users',
  },
  {
    step: '4',
    title: 'Validar no IMP',
    description: 'Login bdr/bdr e conferir launcher/BDR.',
    to: '/login',
  },
]

export default function AdminDashboard() {
  const { customers } = useAdminStore()
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

      <div className="admin-page__stack">
        <Panel
          title="Fluxo de demonstração"
          description="Percurso completo para apresentar a plataforma ao cliente."
        >
          <div className="admin-workflow">
            {WORKFLOW.map((item) => (
              <Link key={item.step} to={item.to} className="admin-workflow__card">
                <span className="admin-workflow__step">{item.step}</span>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="admin-page__grid">
          <Panel title="Gestão da plataforma" description="Atalhos administrativos.">
            <div className="admin-quick-links">
              <Link to="/admin/customers" className="admin-quick-link">
                <strong>Clientes</strong>
                <span>{customers.length} contas · criar e ver módulos</span>
              </Link>
              <Link to="/admin/modules" className="admin-quick-link">
                <strong>Módulos</strong>
                <span>Atribuição por cliente e usuário</span>
              </Link>
              <Link to="/admin/users" className="admin-quick-link">
                <strong>Usuários</strong>
                <span>Criar acessos vinculados</span>
              </Link>
              <Link to="/admin/logs" className="admin-quick-link">
                <strong>Logs</strong>
                <span>Auditoria das ações do demo</span>
              </Link>
            </div>
          </Panel>

          <Panel title="Atividade recente" description="Eventos do fluxo administrativo.">
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
              ]}
              rows={recent}
            />
          </Panel>
        </div>
      </div>
    </section>
  )
}
