import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  canAccessModule as checkModuleAccess,
  fetchWorkspaceAccess,
} from '../data/access'
import { getCustomerMetrics } from '../data/admin/customers'
import { subscribeAdminStore } from '../data/admin/store'

const WorkspaceContext = createContext(null)

const EMPTY_ACCESS = {
  customer: null,
  user: null,
  moduleIds: [],
  modules: [],
}

export function WorkspaceProvider({ children }) {
  const { user: authUser, isAuthenticated } = useAuth()
  const [access, setAccess] = useState(EMPTY_ACCESS)
  const [isLoading, setIsLoading] = useState(false)
  const [storeVersion, setStoreVersion] = useState(0)

  useEffect(() => {
    return subscribeAdminStore(() => setStoreVersion((value) => value + 1))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAccess() {
      if (!isAuthenticated || !authUser || authUser.role !== 'imp') {
        setAccess(EMPTY_ACCESS)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const nextAccess = await fetchWorkspaceAccess(authUser.username)
        if (!cancelled) {
          setAccess(nextAccess)
        }
      } catch {
        if (!cancelled) {
          setAccess(EMPTY_ACCESS)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadAccess()

    return () => {
      cancelled = true
    }
  }, [authUser, isAuthenticated, storeVersion])

  const value = useMemo(() => {
    const customerMetrics = access.customer
      ? getCustomerMetrics(access.customer.id)
      : null

    function hasModuleAccess(moduleId) {
      if (!access.customer || !access.user) return false
      return checkModuleAccess(access.customer.id, access.user.id, moduleId)
    }

    async function refreshAccess() {
      if (!authUser || authUser.role !== 'imp') {
        setAccess(EMPTY_ACCESS)
        return EMPTY_ACCESS
      }

      const nextAccess = await fetchWorkspaceAccess(authUser.username)
      setAccess(nextAccess)
      return nextAccess
    }

    return {
      currentCustomer: access.customer,
      currentUser: access.user,
      availableModules: access.modules,
      availableModuleIds: access.moduleIds,
      customerMetrics,
      isLoading,
      hasModuleAccess,
      refreshAccess,
    }
  }, [access, authUser, isLoading])

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }

  return context
}
