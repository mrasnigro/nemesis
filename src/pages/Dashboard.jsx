import MetricCard from '../components/MetricCard'
import ModuleCard from '../components/ModuleCard'
import Panel from '../components/Panel'
import { dashboardMetrics, modules } from '../modules'
import './Dashboard.css'

export default function Dashboard() {
  return (
    <section className="dashboard">
      <div className="dashboard__metrics">
        {dashboardMetrics.map((metric) => (
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
        title="Módulos da plataforma"
        description="Acesse os módulos do CRM IMP. Novos produtos entram automaticamente neste painel."
      >
        <div className="dashboard__grid">
          {modules.map((module) => (
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
      </Panel>
    </section>
  )
}
