import { createContext, useContext, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { modules } from '../modules'

const WorkspaceContext = createContext(null)

/**
 * Customer workspace derived from the session. The API already resolved effective access
 * (customer contract ∩ user grant), so the shell only reads `user.modules`.
 */
export function WorkspaceProvider({ children }) {
  const { user, isLoading, refreshSession } = useAuth()

  const value = useMemo(() => {
    const isCustomerUser = user?.role === 'imp' && Boolean(user.customer)
    const moduleIds = isCustomerUser ? user.modules : []

    return {
      currentCustomer: isCustomerUser ? user.customer : null,
      currentUser: isCustomerUser
        ? { id: user.id, name: user.name, email: user.email, profile: user.profile }
        : null,
      availableModules: modules.filter((module) => moduleIds.includes(module.id)),
      availableModuleIds: moduleIds,
      isLoading,
      hasModuleAccess: (moduleId) => moduleIds.includes(moduleId),
      refreshAccess: refreshSession,
    }
  }, [user, isLoading, refreshSession])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }

  return context
}
