import ModuleIcon from '../components/ModuleIcon'
import { useNavigate } from 'react-router-dom'
import './ModuleCard.css'

export default function ModuleCard({
  title,
  description,
  status = 'coming-soon',
  icon = 'modules',
  to,
}) {
  const navigate = useNavigate()
  const isAvailable = status === 'available'

  function openModule(event) {
    event?.stopPropagation?.()
    if (!isAvailable || !to) return
    navigate(to)
  }

  return (
    <article
      className={`module-card${isAvailable && to ? ' module-card--clickable' : ' module-card--disabled'}`}
      role={isAvailable && to ? 'link' : undefined}
      tabIndex={isAvailable && to ? 0 : undefined}
      onClick={isAvailable && to ? openModule : undefined}
      onKeyDown={
        isAvailable && to
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openModule(event)
              }
            }
          : undefined
      }
    >
      <div className="module-card__icon" aria-hidden="true">
        <ModuleIcon name={icon} />
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      {!isAvailable ? <span className="module-card__soon">Em breve</span> : null}
    </article>
  )
}
