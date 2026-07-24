import './Panel.css'

export default function Panel({ title, description, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || description || actions) && (
        <div className="panel__header">
          <div>
            {title ? <h2 className="panel__title">{title}</h2> : null}
            {description ? <p className="panel__description">{description}</p> : null}
          </div>
          {actions ? <div className="panel__actions">{actions}</div> : null}
        </div>
      )}
      <div className="panel__body">{children}</div>
    </section>
  )
}
