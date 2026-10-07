/** Shared page shell for Treinamento IA — keeps margin/padding/gap consistent. */

export default function TrainingPage({
  as: Tag = 'section',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={['imp-module', 'training-ai__page', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function TrainingPageHeader({ title, description, icon = null, actions = null, className = '' }) {
  return (
    <header className={['training-ai__page-header', className].filter(Boolean).join(' ')}>
      <div className="training-ai__page-header-main">
        {icon || title ? (
          <div className="training-ai__page-title-row">
            {icon}
            {title ? <h2>{title}</h2> : null}
          </div>
        ) : null}
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="training-ai__page-header-actions">{actions}</div> : null}
    </header>
  )
}
