import ModuleCard from '../components/ModuleCard'
import { useWorkspace } from '../workspace/WorkspaceContext'
import './Dashboard.css'

export default function Dashboard() {
  const { availableModules, isLoading } = useWorkspace()

  return (
    <section className="module-launcher">
      <header className="module-launcher__intro">
        <h2>Módulos</h2>
        <p>Selecione um módulo para continuar dentro do CRM IMP.</p>
      </header>

      {isLoading ? (
        <p className="module-launcher__empty">Carregando módulos...</p>
      ) : availableModules.length ? (
        <div className="module-launcher__grid">
          {availableModules.map((module) => (
            <ModuleCard
              key={module.id}
              title={module.title}
              description={module.description}
              status={module.status}
              icon={module.icon}
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
