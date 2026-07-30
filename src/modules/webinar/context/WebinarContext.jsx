import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { useWorkspace } from '../../../workspace/WorkspaceContext'
import { participantsByWebinar, webinarMetrics, webinars as seedWebinars } from '../data/seeds.js'
import {
  getWebinarPermissionsForUser,
  hasWebinarPermission,
} from '../services/webinarPermissions.js'

const WebinarContext = createContext(null)

export function WebinarProvider({ children }) {
  const { user } = useAuth()
  const { hasModuleAccess } = useWorkspace()
  const permissions = useMemo(
    () => getWebinarPermissionsForUser(user, hasModuleAccess('webinar')),
    [user, hasModuleAccess],
  )

  const [events, setEvents] = useState(seedWebinars)
  const [participantsMap, setParticipantsMap] = useState(participantsByWebinar)

  const getEvent = useCallback(
    (eventId) => events.find((item) => item.id === eventId) ?? null,
    [events],
  )

  const getParticipants = useCallback(
    (eventId) => participantsMap[eventId] || [],
    [participantsMap],
  )

  const publishDraft = useCallback(
    (eventId) => {
      if (!hasWebinarPermission(permissions, 'webinar.manage')) return false
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId && event.status === 'draft'
            ? { ...event, status: 'scheduled' }
            : event,
        ),
      )
      return true
    },
    [permissions],
  )

  const markAttendance = useCallback(
    (eventId, participantId, status) => {
      if (!hasWebinarPermission(permissions, 'webinar.participants')) return false
      setParticipantsMap((prev) => {
        const list = prev[eventId] || []
        return {
          ...prev,
          [eventId]: list.map((person) =>
            person.id === participantId
              ? {
                  ...person,
                  status,
                  watchMin: status === 'attended' ? Math.max(person.watchMin, 15) : 0,
                }
              : person,
          ),
        }
      })
      return true
    },
    [permissions],
  )

  const value = {
    permissions,
    metrics: webinarMetrics,
    events,
    getEvent,
    getParticipants,
    publishDraft,
    markAttendance,
    canManage: hasWebinarPermission(permissions, 'webinar.manage'),
    canParticipants: hasWebinarPermission(permissions, 'webinar.participants'),
    canMetrics: hasWebinarPermission(permissions, 'webinar.metrics'),
  }

  return <WebinarContext.Provider value={value}>{children}</WebinarContext.Provider>
}

export function useWebinar() {
  const ctx = useContext(WebinarContext)
  if (!ctx) throw new Error('useWebinar must be used within WebinarProvider')
  return ctx
}
