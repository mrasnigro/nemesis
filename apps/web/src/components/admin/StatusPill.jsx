import './StatusPill.css'

const LABELS = {
  active: 'Ativo',
  inactive: 'Inativo',
  invited: 'Convidado',
  trial: 'Trial',
  suspended: 'Suspenso',
  connected: 'Conectado',
  pending: 'Pendente',
  error: 'Erro',
  available: 'Ativo',
  'coming-soon': 'Em breve',
  info: 'Info',
  warning: 'Alerta',
  admin: 'Admin IMP',
  imp: 'IMP',
  Enterprise: 'Enterprise',
  Growth: 'Growth',
  Starter: 'Starter',
}

export default function StatusPill({ value, tone }) {
  const resolvedTone = tone || value || 'default'
  const label = LABELS[value] ?? value

  return (
    <span className={`status-pill status-pill--${resolvedTone}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {label}
    </span>
  )
}
