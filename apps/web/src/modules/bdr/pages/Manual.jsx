import { Navigate } from 'react-router-dom'

/** Alias route → unified discagem manual mode */
export default function BdrManualPage() {
  return <Navigate to="/modules/bdr/discagem?mode=manual" replace />
}
