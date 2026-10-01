import { Navigate, useParams } from 'react-router-dom'

/** Old stub URL `/modules/webinar/webinars/:id` → live detail. */
export default function WebinarLegacyDetailRedirect() {
  const { webinarId } = useParams()
  return <Navigate to={`/modules/webinar/dashboard/webinars/${webinarId}`} replace />
}
