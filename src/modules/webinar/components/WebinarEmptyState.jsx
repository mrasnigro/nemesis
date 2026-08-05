import { Link } from 'react-router-dom'
import { IconCalendar } from './WebinarIcons.jsx'

export default function WebinarEmptyState({
  title,
  copy,
  actionTo,
  actionLabel,
  icon: Icon = IconCalendar,
}) {
  return (
    <div className="imp-empty webinar-empty">
      <Icon className="webinar-empty__icon" />
      {title ? <p className="webinar-empty__title">{title}</p> : null}
      {copy ? <p className="webinar-empty__copy">{copy}</p> : null}
      {actionTo && actionLabel ? (
        <Link to={actionTo} className="imp-btn imp-btn--ghost">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
