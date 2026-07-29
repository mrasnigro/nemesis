import { Link } from 'react-router-dom'
import ModuleIcon from '../../components/ModuleIcon'
import Panel from '../../components/Panel'
import { StatusPill } from '../../components/admin'
import { getModuleById } from '../../modules'
import { useWorkspace } from '../../workspace/WorkspaceContext'
import './Bdr.css'

export default function BdrPage() {
  const module = getModuleById('bdr')
  const { currentCustomer, currentUser } = useWorkspace()

  function openBdrSystem() {
    if (!module?.externalUrl) return
    window.open(module.externalUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="bdr-page">
      <div className="bdr-page__nav">
        <Link to="/dashboard" className="bdr-page__back">
          ← Voltar aos módulos
        </Link>
      </div>

      <div className="bdr-page__layout">
        <Panel className="bdr-page__hero-panel">
          <div className="bdr-page__hero">
            <div className="bdr-page__hero-top">
              <div className="bdr-page__icon" aria-hidden="true">
                <ModuleIcon name="phone" />
              </div>
              <div className="bdr-page__status-group">
                <StatusPill value="connected" />
                <StatusPill value="available" />
              </div>
            </div>

            <p className="bdr-page__eyebrow">IMP · Discagem Automática</p>
            <h2>{module.title}</h2>
            <p className="bdr-page__description">{module.description}</p>

            <div className="bdr-page__connection">
              <span className="bdr-page__connection-dot" aria-hidden="true" />
              <div>
                <strong>Sistema BDR conectado</strong>
                <p>
                  Integração ativa com {module.externalUrl?.replace(/\/$/, '')}
                  {currentCustomer ? ` · Workspace ${currentCustomer.name}` : ''}
                </p>
              </div>
            </div>

            <div className="bdr-page__features">
              <h3>Recursos do módulo</h3>
              <ul>
                {module.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button type="button" className="bdr-page__cta" onClick={openBdrSystem}>
              <span>Acessar Sistema BDR</span>
              <small>Abre em nova aba com sessão segura</small>
            </button>
          </div>
        </Panel>

        <aside className="bdr-page__aside">
          <article className="bdr-page__info-card">
            <h3>Informações de acesso</h3>
            <dl>
              <div>
                <dt>Status da conexão</dt>
                <dd>Conectado</dd>
              </div>
              <div>
                <dt>Usuário</dt>
                <dd>{currentUser?.name ?? 'IMP User'}</dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>{currentCustomer?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Categoria</dt>
                <dd>{module.info.category}</dd>
              </div>
              <div>
                <dt>Versão</dt>
                <dd>{module.info.version}</dd>
              </div>
            </dl>
          </article>
        </aside>
      </div>
    </section>
  )
}
