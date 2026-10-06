import { DEFAULT_TIMEZONE, fromLocalInput, toLocalInput } from './format.js'

/** What the webinar form and the new-webinar wizard share: field defaults and the API payload. */

export function nextDayLocal(timeZone) {
  const date = new Date(Date.now() + 24 * 3600_000)
  date.setMinutes(0, 0, 0)
  return toLocalInput(date.toISOString(), timeZone)
}

export const EMPTY_WEBINAR_FORM = {
  title: '',
  description: '',
  scheduledAt: '',
  timezone: DEFAULT_TIMEZONE,
  durationMinutes: '60',
  presenterName: '',
  presenterBio: '',
  presenterImageUrl: '',
  registrationColor: '#007bff',
  maxParticipants: '',
}

export function newWebinarForm() {
  return { ...EMPTY_WEBINAR_FORM, scheduledAt: nextDayLocal(DEFAULT_TIMEZONE) }
}

export function formFromWebinar(webinar) {
  return {
    title: webinar.title,
    description: webinar.description || '',
    scheduledAt: toLocalInput(webinar.scheduledAt, webinar.timezone),
    timezone: webinar.timezone,
    durationMinutes: String(webinar.durationMinutes),
    presenterName: webinar.presenterName || '',
    presenterBio: webinar.presenterBio || '',
    presenterImageUrl: webinar.presenterImageUrl || '',
    registrationColor: webinar.registrationColor || '#007bff',
    maxParticipants: webinar.maxParticipants == null ? '' : String(webinar.maxParticipants),
  }
}

/** The API treats an empty optional text as "not set". */
const orNull = (value) => (value.trim() ? value.trim() : null)

export function payloadFromForm(form) {
  return {
    title: form.title.trim(),
    description: orNull(form.description),
    scheduledAt: fromLocalInput(form.scheduledAt, form.timezone),
    timezone: form.timezone,
    durationMinutes: Number(form.durationMinutes),
    presenterName: orNull(form.presenterName),
    presenterBio: orNull(form.presenterBio),
    presenterImageUrl: orNull(form.presenterImageUrl),
    registrationColor: form.registrationColor,
    maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
  }
}

/** Why a plan does not allow this webinar, or '' when it does. Mirrors what the API enforces. */
export function planProblem(form, plan) {
  if (!plan) return ''
  const minutes = Number(form.durationMinutes)
  if (plan.maxDurationMinutes !== null && minutes > plan.maxDurationMinutes) {
    return `O plano ${plan.name} permite webinars de até ${plan.maxDurationMinutes} minutos.`
  }
  const seats = form.maxParticipants ? Number(form.maxParticipants) : null
  if (seats !== null && plan.maxParticipants !== null && seats > plan.maxParticipants) {
    return `O plano ${plan.name} permite até ${plan.maxParticipants} participantes por webinar.`
  }
  return ''
}
