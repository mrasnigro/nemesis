import { Link } from 'react-router-dom'
import ModuleIcon from './ModuleIcon'
import Panel from './Panel'
import './ModulePage.css'

const STATUS_LABELS = {
  available: 'Ativo',
  'coming-soon': 'Em breve',
}

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] ?? status

  return (
    <span className={`module-page__status module-page__status--${status}`}>
      <span className="module-page__status-dot" aria-hidden="true" />
      {label}
    </span>
  )
}

export default function ModulePage({
  module,
  title,
  description,
  status = 'coming-soon',
  accent = 'cyan',
  badge,
  icon = 'sparkles',
  features = [],
  info = {},
  actionLabel = 'Abrir módulo',
  onAction,
  backTo = '/dashboard',
  backLabel = 'Voltar aos módulos',
}) {
  const data = {
    title: module?.title ?? title,
    description: module?.description ?? description,
    status: module?.status ?? status,
    accent: module?.accent ?? accent,
    badge: module?.badge ?? badge,
    icon: module?.icon ?? icon,
    features: module?.features ?? features,
    info: module?.info ?? info,
    actionLabel: module?.actionLabel ?? actionLabel,
  }

  const isAvailable = data.status === 'available'
  const statusLabel = STATUS_LABELS[data.status] ?? data.status
  const featureItems = data.features.length
    ? data.features
    : ['Em breve: funcionalidades deste módulo serão liberadas aqui.']

  const infoItems = [
    { label: 'Status', value: statusLabel },
    { label: 'Categoria', value: data.info.category ?? 'IMP Module' },
    { label: 'Versão', value: data.info.version ?? '1.0.0' },
    { label: 'Acesso', value: data.info.access ?? 'Usuário IMP' },
  ]

  function handleAction() {
    if (onAction) {
      onAction()
      return
    }

    if (!isAvailable) {
      return
    }
  }

  return (
    <section className={`module-page module-page--${data.accent}`}>
      <div className="module-page__nav">
        <Link to={backTo} className="module-page__back">
          ← {backLabel}
        </Link>
      </div>

      <div className="module-page__layout">
        <Panel className="module-page__hero-panel">
          <div className="module-page__hero">
            <div className="module-page__hero-top">
              <div className="module-page__icon-wrap" aria-hidden="true">
                <ModuleIcon name={data.icon} className="module-page__icon" />
              </div>
              <StatusBadge status={data.status} />
            </div>

            <div className="module-page__eyebrow">{data.badge || 'IMP Module'}</div>
            <h2 className="module-page__title">{data.title}</h2>
            <p className="module-page__description">{data.description}</p>

            <div className="module-page__features-block">
              <h3 className="module-page__section-title">Recursos do módulo</h3>
              <ul className="module-page__features">
                {featureItems.map((feature) => (
                  <li key={feature}>
                    <span className="module-page__feature-check" aria-hidden="true">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              className="module-page__action"
              disabled={!isAvailable}
              onClick={handleAction}
            >
              {isAvailable ? data.actionLabel : 'Em desenvolvimento'}
            </button>
          </div>
        </Panel>

        <aside className="module-page__aside">
          <article className="module-page__info-card">
            <div className="module-page__info-card-header">
              <h3>Informações do módulo</h3>
              <p>Detalhes operacionais e de acesso deste produto.</p>
            </div>

            <dl className="module-page__info-list">
              {infoItems.map((item) => (
                <div key={item.label} className="module-page__info-row">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>

            {data.info.owner ? (
              <div className="module-page__info-note">
                <span>Responsável</span>
                <strong>{data.info.owner}</strong>
              </div>
            ) : null}
          </article>
        </aside>
      </div>
    </section>
  )
}
