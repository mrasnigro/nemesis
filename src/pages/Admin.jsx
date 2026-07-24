import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import './Admin.css'

const ADMIN_METRICS = [
  {
    id: 'users',
    label: 'Usuários',
    value: '42',
    hint: 'Contas ativas na plataforma',
    accent: 'blue',
    trend: { direction: 'up', value: '4%' },
  },
  {
    id: 'roles',
    label: 'Papéis',
    value: '2',
    hint: 'admin · imp',
    accent: 'violet',
  },
  {
    id: 'modules',
    label: 'Módulos',
    value: '6',
    hint: 'Registrados no catálogo',
    accent: 'cyan',
  },
  {
    id: 'uptime',
    label: 'Uptime',
    value: '99.9%',
    hint: 'Últimos 30 dias',
    accent: 'emerald',
    trend: { direction: 'up', value: '0.1%' },
  },
]

export default function Admin() {
  return (
    <section className="admin">
      <div className="admin__metrics">
        {ADMIN_METRICS.map((metric) => (
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
        title="Painel administrativo"
        description="Área reservada para gestão da IMP Platform. Estrutura pronta para usuários, permissões e configuração de módulos."
      >
        <ul className="admin__list">
          <li>
            <strong>Gestão de usuários e papéis</strong>
            <span>Controle de acesso por perfil admin e imp.</span>
          </li>
          <li>
            <strong>Ativação de módulos</strong>
            <span>Habilite produtos do catálogo enterprise.</span>
          </li>
          <li>
            <strong>Monitoramento da plataforma</strong>
            <span>Acompanhe saúde, uso e disponibilidade.</span>
          </li>
        </ul>
      </Panel>
    </section>
  )
}
