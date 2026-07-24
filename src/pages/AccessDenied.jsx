import { Link } from 'react-router-dom'
import Panel from '../components/Panel'
import './AccessDenied.css'

export default function AccessDenied({ moduleName }) {
  return (
    <section className="access-denied">
      <Panel>
        <div className="access-denied__content">
          <span className="access-denied__badge">403</span>
          <h2>Acesso negado</h2>
          <p>
            {moduleName
              ? `Você não tem permissão para acessar o módulo "${moduleName}".`
              : 'Você não tem permissão para acessar este módulo.'}
          </p>
          <p className="access-denied__hint">
            Solicite ao administrador a atribuição do módulo para seu usuário ou cliente.
          </p>
          <Link to="/dashboard" className="access-denied__action">
            Voltar ao dashboard
          </Link>
        </div>
      </Panel>
    </section>
  )
}
