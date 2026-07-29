import ModuleCard from '../components/ModuleCard'
import { useWorkspace } from '../workspace/WorkspaceContext'
import './Dashboard.css'

export default function Dashboard() {
  const { availableModules, currentCustomer, currentUser, isLoading } = useWorkspace()

  return (
    <section className="module-launcher">
      <header className="module-launcher__intro">
        <p className="module-launcher__eyebrow">IMP Platform</p>
        <h2>Selecione um módulo</h2>
        <p className="module-launcher__hint">
          {currentCustomer
            ? `${currentUser?.name} · ${currentCustomer.name} (${currentCustomer.plan})`
            : 'Nenhum workspace vinculado a este login.'}
        </p>
      </header>

      {isLoading ? (
        <p className="module-launcher__empty">Carregando módulos do workspace...</p>
      ) : availableModules.length ? (
        <div className="module-launcher__grid">
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
        <p className="module-launcher__empty">
          Nenhum módulo atribuído ao seu usuário. Solicite acesso ao administrador.
        </p>
      )}
    </section>
  )
}
