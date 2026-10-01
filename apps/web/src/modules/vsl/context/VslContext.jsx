import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import { campaigns as seedCampaigns, vslMetrics } from '../data/seeds.js'
import { getVslPermissionsForUser, hasVslPermission } from '../services/vslPermissions.js'

const VslContext = createContext(null)

export function VslProvider({ children }) {
  const { user } = useAuth()
  const { hasModuleAccess } = useWorkspace()
  const permissions = useMemo(
    () => getVslPermissionsForUser(user, hasModuleAccess('vsl')),
    [user, hasModuleAccess],
  )

  const [campaigns, setCampaigns] = useState(seedCampaigns)
  const [saveMessage, setSaveMessage] = useState(null)

  const getCampaign = useCallback(
    (campaignId) => campaigns.find((item) => item.id === campaignId) ?? null,
    [campaigns],
  )

  const updateLanding = useCallback(
    (campaignId, patch) => {
      if (!hasVslPermission(permissions, 'vsl.configure')) return false
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, ...patch } : campaign,
        ),
      )
      setSaveMessage({
        campaignId,
        at: new Date().toISOString(),
        text: 'Landing page atualizada (mock).',
      })
      return true
    },
    [permissions],
  )

  const publishCampaign = useCallback(
    (campaignId) => {
      if (!hasVslPermission(permissions, 'vsl.configure')) return false
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, status: 'live' } : campaign,
        ),
      )
      setSaveMessage({
        campaignId,
        at: new Date().toISOString(),
        text: 'Campanha publicada.',
      })
      return true
    },
    [permissions],
  )

  const value = {
    permissions,
    metrics: vslMetrics,
    campaigns,
    getCampaign,
    updateLanding,
    publishCampaign,
    saveMessage,
    canCampaigns: hasVslPermission(permissions, 'vsl.campaigns'),
    canConfigure: hasVslPermission(permissions, 'vsl.configure'),
    canMetrics: hasVslPermission(permissions, 'vsl.metrics'),
  }

  return <VslContext.Provider value={value}>{children}</VslContext.Provider>
}

export function useVsl() {
  const ctx = useContext(VslContext)
  if (!ctx) throw new Error('useVsl must be used within VslProvider')
  return ctx
}
