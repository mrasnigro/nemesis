import { hasBdrPermission } from '../services/bdrPermissions.js'
import { useBdrSession } from './useBdrSession.js'

export function useBdrPermissions() {
  const { permissions } = useBdrSession()

  return {
    permissions,
    canOperate: hasBdrPermission(permissions, 'bdr.operate'),
    canSelectCampaign: hasBdrPermission(permissions, 'bdr.campaigns.select'),
    canViewHistory: hasBdrPermission(permissions, 'bdr.history.self'),
    canSchedule: hasBdrPermission(permissions, 'bdr.schedule'),
    canViewScripts: hasBdrPermission(permissions, 'bdr.scripts.view'),
    has: (key) => hasBdrPermission(permissions, key),
  }
}
