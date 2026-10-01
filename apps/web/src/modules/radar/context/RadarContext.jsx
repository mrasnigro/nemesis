import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import {
  buildMarketAnalysis,
  insights,
  marketSegments,
  radarMetrics,
  trendCards,
} from '../data/seeds.js'
import {
  getRadarPermissionsForUser,
  hasRadarPermission,
} from '../services/radarPermissions.js'

const RadarContext = createContext(null)

export function RadarProvider({ children }) {
  const { user } = useAuth()
  const { hasModuleAccess } = useWorkspace()
  const permissions = useMemo(
    () => getRadarPermissionsForUser(user, hasModuleAccess('radar')),
    [user, hasModuleAccess],
  )

  const [selectedSegment, setSelectedSegment] = useState('saas')
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const runAnalysis = useCallback(() => {
    if (!hasRadarPermission(permissions, 'radar.analyze')) return null
    setAnalyzing(true)
    const result = buildMarketAnalysis(selectedSegment)
    // Simulate brief async feel without real backend
    window.setTimeout(() => {
      setAnalysis(result)
      setAnalyzing(false)
    }, 450)
    return result
  }, [permissions, selectedSegment])

  const getInsight = useCallback(
    (insightId) => insights.find((item) => item.id === insightId) ?? null,
    [],
  )

  const value = {
    permissions,
    metrics: radarMetrics,
    trends: trendCards,
    segments: marketSegments,
    insights,
    selectedSegment,
    setSelectedSegment,
    analysis,
    analyzing,
    runAnalysis,
    getInsight,
    canDashboard: hasRadarPermission(permissions, 'radar.dashboard'),
    canAnalyze: hasRadarPermission(permissions, 'radar.analyze'),
    canInsights: hasRadarPermission(permissions, 'radar.insights'),
  }

  return <RadarContext.Provider value={value}>{children}</RadarContext.Provider>
}

export function useRadar() {
  const ctx = useContext(RadarContext)
  if (!ctx) throw new Error('useRadar must be used within RadarProvider')
  return ctx
}
