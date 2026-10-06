import { Link } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { PLATFORM_BASE } from '../PlatformLayout.jsx'

const LAPSED = {
  expired: 'A assinatura do Webinar venceu.',
  suspended: 'A assinatura do Webinar está suspensa.',
  cancelled: 'A assinatura do Webinar foi cancelada.',
}

/**
 * Says so when the subscription cannot schedule or start webinars, or is about to end.
 * Shows nothing while it is healthy (or while it is still loading).
 */
export default function SubscriptionBanner() {
  const { data } = useLoad(() => webinarApi.subscription(), [])
  if (!data) return null

  if (data.state !== 'active') {
    return (
      <p className="webinar-note webinar-note--error">
        {LAPSED[data.state]} Você ainda vê seus webinars, mas não pode agendar nem iniciar novos.{' '}
        <Link to={`${PLATFORM_BASE}/assinatura`} className="webinar-link">
          Ver assinatura
        </Link>
      </p>
    )
  }
  if (data.daysLeft !== null && data.daysLeft <= 7) {
    return (
      <p className="webinar-note webinar-note--info">
        O plano {data.plan.name} termina {data.daysLeft === 0 ? 'hoje' : `em ${data.daysLeft} ${data.daysLeft === 1 ? 'dia' : 'dias'}`}.{' '}
        <Link to={`${PLATFORM_BASE}/assinatura`} className="webinar-link">
          Ver assinatura
        </Link>
      </p>
    )
  }
  return null
}
