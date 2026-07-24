import { useSyncExternalStore } from 'react'
import { getAdminSnapshot, subscribeAdminStore } from '../data/admin/store'

export function useAdminStore() {
  return useSyncExternalStore(subscribeAdminStore, getAdminSnapshot, getAdminSnapshot)
}
