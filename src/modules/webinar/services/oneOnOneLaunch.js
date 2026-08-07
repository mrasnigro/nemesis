/**
 * M4 — map a BDR meeting into a Webinar create payload (1:1).
 */

export function meetingToWebinarDraft(meeting) {
  const lead = meeting?.leadName || 'Cliente'
  const company = meeting?.company || ''
  const title = company
    ? `Reunião 1:1 · ${lead} (${company})`
    : `Reunião 1:1 · ${lead}`

  let scheduledDate = new Date().toISOString()
  if (meeting?.date && meeting?.time) {
    const isoLocal = `${meeting.date}T${meeting.time}:00`
    const parsed = new Date(isoLocal)
    if (!Number.isNaN(parsed.getTime())) {
      scheduledDate = parsed.toISOString()
    }
  }

  let durationMinutes = 30
  if (meeting?.time && meeting?.endTime) {
    const [sh, sm] = String(meeting.time).split(':').map(Number)
    const [eh, em] = String(meeting.endTime).split(':').map(Number)
    if ([sh, sm, eh, em].every((n) => Number.isFinite(n))) {
      durationMinutes = Math.max(15, eh * 60 + em - (sh * 60 + sm))
    }
  }

  const description = [
    meeting?.notes?.trim(),
    meeting?.phone ? `Telefone: ${meeting.phone}` : '',
    meeting?.email ? `E-mail: ${meeting.email}` : '',
    meeting?.protocol ? `Protocolo BDR: ${meeting.protocol}` : '',
    meeting?.id ? `externalRef=bdr:${meeting.id}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    title: title.slice(0, 200),
    description: description.slice(0, 2000),
    scheduledDate,
    durationMinutes,
    presenterName: lead.slice(0, 120),
    status: 'scheduled',
    maxParticipants: 2,
  }
}

/**
 * Create webinar for a 1:1 (or reuse linked id).
 * @param {{ apiRequest: Function, meeting: object }}
 */
export async function launchOneOnOneFromMeeting({ apiRequest, meeting }) {
  if (!meeting?.id) throw new Error('Agendamento BDR inválido')

  if (meeting.webinarId) {
    return {
      webinarId: String(meeting.webinarId),
      created: false,
      path: `/modules/webinar/dashboard/webinars/${meeting.webinarId}`,
    }
  }

  const body = meetingToWebinarDraft(meeting)
  const created = await apiRequest('/client/webinars', {
    method: 'POST',
    body: {
      ...body,
      // Soft external ref for later reconciliation
      description: `${body.description}\nimpJourney=bdr_1on1`,
    },
  })

  const webinarId = String(created?.id || created?.webinar?.id || '')
  if (!webinarId) {
    throw new Error('API não retornou id do webinar')
  }

  return {
    webinarId,
    created: true,
    path: `/modules/webinar/dashboard/webinars/${webinarId}`,
    raw: created,
  }
}
