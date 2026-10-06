import { config } from '../../core/config.js'
import { AppError } from '../../core/errors.js'
import { entitlementFor, smallest } from '../webinar-plans/plans.service.js'
import { streamHub, type StreamStats, type StreamViewer } from './stream.hub.js'
import { loadForRead, loadForWrite, publicLeadOr404, type Actor } from './webinar.service.js'

/** One second of the presenter's recording is well under this; it only stops abuse. */
export const MAX_CHUNK_BYTES = 1024 * 1024

/** The presenter (owner or customer administrator) sends the next piece of the recording. */
export async function receiveChunk(actor: Actor, webinarId: string, data: unknown, header: boolean): Promise<void> {
  const webinar = await loadForWrite(actor, webinarId)
  if (webinar.status !== 'live') {
    throw new AppError(409, 'NOT_LIVE', 'A transmissão não está ao vivo. Inicie a transmissão antes de enviar vídeo.')
  }
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Envie o vídeo como application/octet-stream.')
  }
  if (!streamHub.push(webinarId, data, header)) {
    throw new AppError(409, 'STREAM_NEEDS_HEADER', 'Reinicie a gravação: o servidor não tem o início da transmissão.')
  }
}

export type StreamState = StreamStats & { status: string }

/** What the studio shows: is the signal arriving, and how many people are watching. */
export async function streamStateFor(actor: Actor, webinarId: string): Promise<StreamState> {
  const webinar = await loadForRead(actor, webinarId)
  return { ...streamHub.stats(webinarId), status: webinar.status }
}

/** A registered visitor starts watching. Returns what the controller needs to feed the response. */
export async function openViewer(leadId: string, viewer: StreamViewer) {
  const lead = await publicLeadOr404(leadId)
  if (lead.webinar.status !== 'live') {
    throw new AppError(409, 'NOT_LIVE', 'A transmissão não está ao vivo')
  }
  // Someone reconnecting replaces their own connection, so only a new person can hit the cap.
  // The cap is the smaller of the server's own and what the customer's plan allows.
  const { plan } = await entitlementFor(lead.customerId)
  const cap = smallest(config.WEBINAR_STREAM_MAX_VIEWERS, plan.maxParticipants)!
  if (!streamHub.hasViewer(lead.webinarId, lead.id) && streamHub.viewerCount(lead.webinarId) >= cap) {
    throw new AppError(503, 'STREAM_FULL', 'A transmissão atingiu o limite de espectadores. Tente novamente em instantes.')
  }
  return streamHub.join(lead.webinarId, lead.id, viewer)
}
