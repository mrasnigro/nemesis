import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import { CAMPAIGN_STORAGE_KEY } from '../../bdr/data/catalogs.js'
import { bdrRepository } from '../../bdr/services/bdrRepository.js'
import { companyDirectory, prospectingMetrics } from '../data/seeds.js'
import {
  getProspectingPermissionsForUser,
  hasProspectingPermission,
} from '../services/prospectingPermissions.js'

const ProspectingContext = createContext(null)

function loadDialerCampaignId() {
  try {
    return sessionStorage.getItem(CAMPAIGN_STORAGE_KEY)
  } catch {
    return null
  }
}

const emptyQualification = {
  fit: 'Alto',
  timing: 'Agora',
  authority: 'Decisor',
  budget: 'Provável',
  notes: '',
}

export function ProspectingProvider({ children }) {
  const { user } = useAuth()
  const { hasModuleAccess } = useWorkspace()
  const permissions = useMemo(
    () => getProspectingPermissionsForUser(user, hasModuleAccess('prospecting')),
    [user, hasModuleAccess],
  )

  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState('all')
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [qualification, setQualification] = useState(emptyQualification)
  const [qualifiedIds, setQualifiedIds] = useState([])
  const [sentQueue, setSentQueue] = useState([])
  const [lastSend, setLastSend] = useState(null)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return companyDirectory.filter((company) => {
      const matchesSegment = segment === 'all' || company.segment === segment
      const matchesQuery =
        !normalized ||
        company.name.toLowerCase().includes(normalized) ||
        company.city.toLowerCase().includes(normalized) ||
        company.contact.name.toLowerCase().includes(normalized)
      return matchesSegment && matchesQuery
    })
  }, [query, segment])

  const selectedCompany = useMemo(
    () => companyDirectory.find((item) => item.id === selectedCompanyId) ?? null,
    [selectedCompanyId],
  )

  const selectCompany = useCallback((companyId) => {
    setSelectedCompanyId(companyId)
    setQualification(emptyQualification)
  }, [])

  const updateQualification = useCallback((field, value) => {
    setQualification((prev) => ({ ...prev, [field]: value }))
  }, [])

  const saveQualification = useCallback(() => {
    if (!selectedCompanyId) return false
    if (!hasProspectingPermission(permissions, 'prospecting.qualify')) return false
    setQualifiedIds((prev) =>
      prev.includes(selectedCompanyId) ? prev : [...prev, selectedCompanyId],
    )
    return true
  }, [permissions, selectedCompanyId])

  const sendToBdr = useCallback(
    (companyIds = []) => {
      if (!hasProspectingPermission(permissions, 'prospecting.send_bdr')) return null
      const ids = companyIds.length ? companyIds : qualifiedIds
      if (!ids.length) return null

      const companies = ids
        .map((id) => companyDirectory.find((c) => c.id === id))
        .filter(Boolean)
      const campaignId = loadDialerCampaignId()
      const payload = {
        id: `bdr_batch_${Date.now()}`,
        sentAt: new Date().toISOString(),
        campaignHint: 'campanha selecionada no discador',
        importStatus: campaignId ? 'sending' : 'no_campaign',
        companies: companies.map((company) => ({
          companyId: company.id,
          companyName: company.name,
          contact: company.contact,
          phone: company.contact.phone,
        })),
      }

      setSentQueue((prev) => [payload, ...prev])
      setLastSend(payload)
      setQualifiedIds((prev) => prev.filter((id) => !ids.includes(id)))

      if (campaignId) {
        const leads = companies.map((company) => ({
          phone: company.contact.phone,
          company: company.name,
          name: company.contact.name,
          role: company.contact.role,
          city: company.city,
          segment: company.segment,
          signals: company.signals,
          score: company.score,
        }))
        bdrRepository
          .importLeads(campaignId, leads, 'prospecting')
          .then((result) => ({ importStatus: 'sent', importResult: result }))
          .catch((error) => ({ importStatus: 'failed', importError: error?.message }))
          .then((patch) => {
            const next = { ...payload, ...patch }
            setSentQueue((prev) => prev.map((batch) => (batch.id === payload.id ? next : batch)))
            setLastSend((prev) => (prev?.id === payload.id ? next : prev))
          })
      }
      return payload
    },
    [permissions, qualifiedIds],
  )

  const value = {
    permissions,
    metrics: {
      ...prospectingMetrics,
      qualified: qualifiedIds.length || prospectingMetrics.qualified,
      sentToBdr: sentQueue.reduce((n, batch) => n + batch.companies.length, 0) ||
        prospectingMetrics.sentToBdr,
    },
    query,
    setQuery,
    segment,
    setSegment,
    results,
    selectedCompany,
    selectCompany,
    qualification,
    updateQualification,
    saveQualification,
    qualifiedIds,
    sentQueue,
    lastSend,
    sendToBdr,
    canSearch: hasProspectingPermission(permissions, 'prospecting.search'),
    canQualify: hasProspectingPermission(permissions, 'prospecting.qualify'),
    canSendBdr: hasProspectingPermission(permissions, 'prospecting.send_bdr'),
  }

  return (
    <ProspectingContext.Provider value={value}>{children}</ProspectingContext.Provider>
  )
}

export function useProspecting() {
  const ctx = useContext(ProspectingContext)
  if (!ctx) throw new Error('useProspecting must be used within ProspectingProvider')
  return ctx
}
