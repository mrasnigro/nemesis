import { useAuth } from '../../../../auth/AuthContext'

/**
 * Mirrors the API: everyone with the module reads the customer's webinars; changing one belongs to its
 * owner or a customer administrator. The server enforces the same rule.
 */
export function useCanEdit() {
  const { user } = useAuth()
  const isManager = user?.profile === 'customer_admin'
  return (webinar) => Boolean(webinar) && (isManager || webinar.ownerUserId === user?.id)
}
