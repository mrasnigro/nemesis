import MetricCard from '../components/MetricCard'
import ModuleCard from '../components/ModuleCard'
import Panel from '../components/Panel'
import { useWorkspace } from '../workspace/WorkspaceContext'
import './Dashboard.css'

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0)
}

export default function Dashboard() {
  const {
    availableModules,
    currentCustomer,
    currentUser,
    customerMetrics,
    isLoading,
  } = useWorkspace()

  const metrics = [
    {
      id: 'leads',
      label: 'Leads',
      value: formatNumber(customerMetrics?.leads),
      hint: currentCustomer ? `${currentCustomer.name}` : 'Sem cliente',
      accent: 'violet',
      trend: { direction: 'up', value: '8%' },
    },
    {
      id: 'campaigns',
      label: 'Campanhas',
      value: formatNumber(customerMetrics?.campaigns),
      hint: 'Ativas neste mês',
      accent: 'blue',
      trend: { direction: 'up', value: '12%' },
    },
    {
      id: 'conversion',
      label: 'Conversão',
      value: `${customerMetrics?.conversionRate ?? 0}%`,
      hint: 'Taxa média do cliente',
      accent: 'emerald',
    },
    {
      id: 'modules',
      label: 'Módulos',
      value: String(availableModules.length),
      hint: `${customerMetrics?.activeUsers ?? 0} usuários ativos`,
      accent: 'cyan',
    },
  ]

  return (
    <section className="dashboard">
      <div className="dashboard__metrics">
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
      </div>

      <Panel
        title="Módulos disponíveis"
        description={
          currentCustomer
            ? `Workspace de ${currentUser?.name} · ${currentCustomer.name} (${currentCustomer.plan})`
            : 'Nenhum workspace vinculado a este login.'
        }
      >
        {isLoading ? (
          <p className="dashboard__empty">Carregando módulos do workspace...</p>
        ) : availableModules.length ? (
          <div className="dashboard__grid">
            {availableModules.map((module) => (
              <ModuleCard
                key={module.id}
                title={module.title}
                description={module.description}
                status={module.status}
                accent={module.accent}
                badge={module.badge}
                to={module.path}
              />
            ))}
          </div>
        ) : (
          <p className="dashboard__empty">
            Nenhum módulo atribuído ao seu usuário. Solicite acesso ao administrador.
          </p>
        )}
      </Panel>
    </section>
  )
}
