import { Link } from 'react-router-dom'
import { IconArrowLeft } from './WebinarIcons.jsx'

export default function WebinarPageToolbar({ backTo, backLabel, children }) {
  return (
    <div className="webinar-page__toolbar">
      <Link to={backTo} className="webinar-back">
        <IconArrowLeft className="webinar-back__icon" />
        {backLabel}
      </Link>
      {children ? <div className="webinar-page__toolbar-actions">{children}</div> : null}
    </div>
  )
}
