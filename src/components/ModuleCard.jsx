import { useNavigate } from 'react-router-dom'
import './ModuleCard.css'

const ACCENT_LABELS = {
  cyan: 'IA',
  blue: 'Call',
  violet: 'PRO',
  emerald: 'Radar',
  amber: 'Live',
  rose: 'VSL',
}

export default function ModuleCard({
  title,
  description,
  status = 'coming-soon',
  accent = 'cyan',
  badge,
  to,
  onOpen,
}) {
  const navigate = useNavigate()
  const isAvailable = status === 'available'

  function openModule(event) {
    event?.stopPropagation?.()

    if (onOpen) {
      onOpen()
      return
    }

    if (to) {
      navigate(to)
    }
  }

  return (
    <article
      className={`module-card module-card--${accent}${to ? ' module-card--clickable' : ''}`}
      role={to ? 'link' : undefined}
      tabIndex={to ? 0 : undefined}
      onClick={to ? openModule : undefined}
      onKeyDown={
        to
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openModule(event)
              }
            }
          : undefined
      }
    >
      <div className="module-card__glow" aria-hidden="true" />

      <div className="module-card__top">
        <div className={`module-card__icon module-card__icon--${accent}`}>
          {badge || ACCENT_LABELS[accent] || 'IMP'}
        </div>
        <span className={`module-card__status module-card__status--${status}`}>
          {isAvailable ? 'Ativo' : 'Em breve'}
        </span>
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      <div className="module-card__footer">
        <button type="button" className="module-card__action" onClick={openModule}>
          {isAvailable ? 'Acessar' : 'Em breve'}
        </button>
        <span className="module-card__meta">Enterprise</span>
      </div>
    </article>
  )
}
