import MetricCard from '../components/MetricCard'
import ModuleCard from '../components/ModuleCard'
import Panel from '../components/Panel'
import { useWorkspace } from '../workspace/WorkspaceContext'
import './Dashboard.css'

export default function Dashboard() {
  const { availableModules, currentCustomer, currentUser, isLoading } = useWorkspace()

  const metrics = [
    {
      id: 'modules',
      label: 'Módulos',
      value: String(availableModules.length),
      hint: 'Liberados para você',
      accent: 'cyan',
    },
    {
      id: 'customer',
      label: 'Cliente',
      value: currentCustomer?.name?.split(' ')[0] ?? '—',
      hint: currentCustomer?.plan ?? 'Sem conta vinculada',
      accent: 'blue',
    },
    {
      id: 'user',
      label: 'Usuário',
      value: currentUser?.name?.split(' ')[0] ?? '—',
      hint: currentUser?.role ?? 'Workspace',
      accent: 'violet',
    },
    {
      id: 'access',
      label: 'Acesso',
      value: availableModules.length ? 'OK' : 'Restrito',
      hint: 'Baseado em atribuições',
      accent: 'emerald',
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
          />
        ))}
      </div>

      <Panel
        title="Módulos disponíveis"
        description={
          currentCustomer
            ? `Exibindo módulos atribuídos a ${currentUser?.name} (${currentCustomer.name}).`
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
