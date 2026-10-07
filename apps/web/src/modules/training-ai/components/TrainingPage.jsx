import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

/** Shared page shell for Treinamento IA — keeps margin/padding/gap consistent. */

function TrainingPolicyBanner() {
  const { user } = useAuth()
  const { canManage } = useTrainingAi()
  if (!user?.trainingAi?.require2fa) return null

  return (
    <div className="training-ai__policy-banner" role="status">
      <p>
        A empresa exige autenticação em dois fatores. O cadastro individual no login será aplicado
        quando a autenticação estiver disponível na plataforma.
      </p>
      {canManage ? (
        <Link to="/modules/training-ai/configuracoes/dois-fatores" className="imp-btn imp-btn--primary">
          Ver política
        </Link>
      ) : null}
    </div>
  )
}

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
      <TrainingPolicyBanner />
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
