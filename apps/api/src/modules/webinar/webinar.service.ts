import { randomBytes } from 'node:crypto'
import type { z } from 'zod'
import { isDuplicateKeyError, withTransaction } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { recordAudit } from '../audit/audit.repository.js'
import { assertFitsPlan, assertSubscriptionActive, entitlementFor, smallest } from '../webinar-plans/plans.service.js'
import { streamHub } from './stream.hub.js'
import {
  countLeads,
  deactivateAccessCode,
  dashboardStats,
  findAccessByCode,
  findLeadByEmail,
  findPublicLead,
  getLead,
  getWebinar,
  insertAccessCode,
  insertChat,
  insertLead,
  insertWebinar,
  leadStats,
  listAccessCodes,
  listAllLeads,
  listChat,
  listLeads,
  listWebinars,
  markAttended,
  softDeleteLead,
  softDeleteWebinar,
  updateLeadStatus,
  updateWebinar,
  type WebinarDto,
} from './webinar.repository.js'
import type {
  accessCodeCreate,
  chatQuery,
  leadListQuery,
  publicRegisterBody,
  webinarCreate,
  webinarListQuery,
  webinarPatch,
} from './webinar.schemas.js'

/** The signed-in user as the module sees them. */
export type Actor = { customerId: string | null; userId: string; name: string; isManager: boolean; ip?: string }

function customerOf(actor: Actor): string {
  if (!actor.customerId) throw new AppError(403, 'MODULE_FORBIDDEN', 'User is not bound to a customer')
  return actor.customerId
}

function audit(actor: Actor, action: string, entityType: string, entityId: string, summary: string) {
  return recordAudit({
    actor: { id: actor.userId, name: actor.name },
    customerId: actor.customerId,
    action,
    entityType,
    entityId,
    summary,
    ip: actor.ip,
  })
}

/** Everyone with the module reads the customer's webinars; changing one belongs to its owner or a customer administrator. */
export async function loadForWrite(actor: Actor, id: string): Promise<WebinarDto> {
  const webinar = await getWebinar(customerOf(actor), id)
  if (!webinar) throw new AppError(404, 'NOT_FOUND', 'Webinar não encontrado')
  if (!actor.isManager && webinar.ownerUserId !== actor.userId) {
    throw new AppError(403, 'FORBIDDEN', 'Apenas o responsável ou o administrador do cliente pode alterar este webinar.')
  }
  return webinar
}

export async function loadForRead(actor: Actor, id: string): Promise<WebinarDto> {
  const webinar = await getWebinar(customerOf(actor), id)
  if (!webinar) throw new AppError(404, 'NOT_FOUND', 'Webinar não encontrado')
  return webinar
}

// ------------------------------------------------------------------ webinars

export const listWebinarPage = (actor: Actor, query: z.infer<typeof webinarListQuery>) =>
  listWebinars(customerOf(actor), query, actor.userId)

export const getWebinarFor = loadForRead

export const statsFor = (actor: Actor, mine: boolean) => dashboardStats(customerOf(actor), actor.userId, mine)

/** A webinar that is scheduled or live needs a subscription in force; drafts and endings never do. */
const NEEDS_SUBSCRIPTION = new Set(['scheduled', 'live'])

export async function createWebinarFor(actor: Actor, input: z.infer<typeof webinarCreate>) {
  const customerId = customerOf(actor)
  await assertFitsPlan(customerId, { durationMinutes: input.durationMinutes, maxParticipants: input.maxParticipants })
  if (NEEDS_SUBSCRIPTION.has(input.status)) await assertSubscriptionActive(customerId)
  const webinar = await insertWebinar(customerId, actor.userId, input)
  await audit(actor, 'webinar.created', 'webinar', webinar.id, `Webinar "${webinar.title}" criado`)
  return webinar
}

export async function updateWebinarFor(actor: Actor, id: string, patch: z.infer<typeof webinarPatch>) {
  await loadForWrite(actor, id)
  const customerId = customerOf(actor)
  await assertFitsPlan(customerId, { durationMinutes: patch.durationMinutes, maxParticipants: patch.maxParticipants })
  if (patch.status && NEEDS_SUBSCRIPTION.has(patch.status)) await assertSubscriptionActive(customerId)
  const webinar = await updateWebinar(customerId, id, patch)
  if (!webinar) throw new AppError(404, 'NOT_FOUND', 'Webinar não encontrado')
  await audit(actor, 'webinar.updated', 'webinar', id, `Webinar "${webinar.title}" atualizado`)
  return webinar
}

/** Where a webinar may go next. A finished webinar stays finished; a live one can only be ended. */
const NEXT_STATUS: Record<string, string[]> = {
  draft: ['scheduled', 'live', 'cancelled'],
  scheduled: ['draft', 'live', 'cancelled'],
  live: ['completed'],
  completed: [],
  cancelled: ['draft'],
}

export async function setStatusFor(actor: Actor, id: string, status: string) {
  const before = await loadForWrite(actor, id)
  if (before.status === status) return before // already there (a second click, a reloaded studio)
  if (!NEXT_STATUS[before.status]?.includes(status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Não é possível mudar de "${before.status}" para "${status}".`)
  }
  if (NEEDS_SUBSCRIPTION.has(status)) {
    // The plan may have changed since the webinar was written, so its length is checked again.
    await assertSubscriptionActive(customerOf(actor))
    await assertFitsPlan(customerOf(actor), { durationMinutes: before.durationMinutes, maxParticipants: before.maxParticipants })
  }
  const webinar = (await updateWebinar(customerOf(actor), id, { status }))!
  await audit(actor, `webinar.${status}`, 'webinar', id, `Webinar "${before.title}": ${before.status} → ${status}`)
  // The relay follows the status: going live starts a fresh broadcast, anything else closes it.
  if (status === 'live') {
    if (before.status !== 'live') streamHub.start(id)
  } else {
    streamHub.end(id)
  }
  return webinar
}

export async function deleteWebinarFor(actor: Actor, id: string) {
  const webinar = await loadForWrite(actor, id)
  if (webinar.status === 'live') {
    throw new AppError(409, 'WEBINAR_LIVE', 'Encerre a transmissão antes de excluir o webinar.')
  }
  await softDeleteWebinar(customerOf(actor), id)
  streamHub.end(id)
  await audit(actor, 'webinar.deleted', 'webinar', id, `Webinar "${webinar.title}" excluído`)
}

// -------------------------------------------------------------- access codes

export async function listAccessCodesFor(actor: Actor, webinarId: string) {
  await loadForRead(actor, webinarId)
  return listAccessCodes(customerOf(actor), webinarId)
}

function generateCode(): string {
  // No 0/O/1/I: codes are read aloud and typed by hand.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export async function createAccessCodeFor(actor: Actor, webinarId: string, input: z.infer<typeof accessCodeCreate>) {
  await loadForWrite(actor, webinarId)
  const customerId = customerOf(actor)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await insertAccessCode(customerId, webinarId, {
        code: input.code ?? generateCode(),
        scheduledAt: input.scheduledAt,
        expiresAt: input.expiresAt,
        maxLeads: input.maxLeads,
      })
      await audit(actor, 'webinar.code_created', 'webinar', webinarId, `Código ${created.code} criado`)
      return created
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error
      if (input.code) throw new AppError(409, 'CODE_TAKEN', 'Este código já está em uso.')
    }
  }
  throw new AppError(500, 'INTERNAL', 'Não foi possível gerar um código único')
}

export async function deactivateAccessCodeFor(actor: Actor, webinarId: string, codeId: string) {
  await loadForWrite(actor, webinarId)
  if (!(await deactivateAccessCode(customerOf(actor), webinarId, codeId))) {
    throw new AppError(404, 'NOT_FOUND', 'Código não encontrado')
  }
}

// --------------------------------------------------------------------- leads

export async function listLeadPage(actor: Actor, webinarId: string, query: z.infer<typeof leadListQuery>) {
  await loadForRead(actor, webinarId)
  return listLeads(customerOf(actor), webinarId, query)
}

export async function getLeadFor(actor: Actor, webinarId: string, leadId: string) {
  const lead = await getLead(customerOf(actor), webinarId, leadId)
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead não encontrado')
  return lead
}

export async function leadStatsFor(actor: Actor, webinarId: string) {
  await loadForRead(actor, webinarId)
  return leadStats(customerOf(actor), webinarId)
}

export async function updateLeadFor(actor: Actor, webinarId: string, leadId: string, status: string) {
  await loadForWrite(actor, webinarId)
  if (!(await updateLeadStatus(customerOf(actor), webinarId, leadId, status))) {
    throw new AppError(404, 'NOT_FOUND', 'Lead não encontrado')
  }
  return getLeadFor(actor, webinarId, leadId)
}

export async function deleteLeadFor(actor: Actor, webinarId: string, leadId: string) {
  await loadForWrite(actor, webinarId)
  if (!(await softDeleteLead(customerOf(actor), webinarId, leadId))) {
    throw new AppError(404, 'NOT_FOUND', 'Lead não encontrado')
  }
  await audit(actor, 'webinar.lead_deleted', 'webinar', webinarId, `Lead ${leadId} removido`)
}

/** A spreadsheet runs any cell that starts with these as a formula. */
function csvCell(value: string | null | undefined): string {
  const text = value ?? ''
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

export async function exportLeadsCsv(actor: Actor, webinarId: string) {
  const webinar = await loadForRead(actor, webinarId)
  const leads = await listAllLeads(customerOf(actor), webinarId)
  const fmt = (value: string | null) =>
    value ? new Date(value).toLocaleString('pt-BR', { timeZone: webinar.timezone }) : ''
  const lines = [
    ['Nome', 'Email', 'Telefone', 'Status', 'Data de Registro', 'Data de Participação'].map(csvCell).join(','),
    ...leads.map((lead) =>
      [lead.name, lead.email, lead.phone, lead.status, fmt(lead.registeredAt), fmt(lead.attendedAt)].map(csvCell).join(','),
    ),
  ]
  return { filename: `leads-webinar-${webinarId}.csv`, body: `\uFEFF${lines.join('\r\n')}\r\n` }
}

// ---------------------------------------------------------------------- chat

export async function listChatFor(actor: Actor, webinarId: string, query: z.infer<typeof chatQuery>) {
  await loadForRead(actor, webinarId)
  return listChat(customerOf(actor), webinarId, {
    after: query.after ? new Date(query.after) : undefined,
    limit: query.limit,
  })
}

export async function postChatFor(actor: Actor, webinarId: string, message: string) {
  await loadForRead(actor, webinarId)
  return insertChat(customerOf(actor), webinarId, { leadId: null, userId: actor.userId, name: actor.name, role: 'presenter' }, message)
}

// -------------------------------------------------------------------- public

export async function publicAccess(code: string) {
  const access = await findAccessByCode(code)
  if (!access) throw new AppError(404, 'CODE_INVALID', 'Código de acesso inválido')
  if (!access.usable) throw new AppError(410, 'CODE_UNAVAILABLE', 'Este código expirou ou não está mais disponível')
  return { accessCode: access.accessCode, webinar: access.webinar }
}

export async function publicRegister(input: z.infer<typeof publicRegisterBody>) {
  return withTransaction(async (conn) => {
    // The code row is locked so two people cannot take the last seat together.
    const access = await findAccessByCode(input.code, conn, true)
    if (!access) throw new AppError(404, 'CODE_INVALID', 'Código de acesso inválido')
    if (!access.usable) throw new AppError(410, 'CODE_UNAVAILABLE', 'Este código expirou ou não está mais disponível')

    const existing = await findLeadByEmail(access.customerId, access.webinar.id, input.email, conn)
    if (existing) return { leadId: existing.id, webinar: access.webinar, alreadyRegistered: true }

    const webinar = await getWebinar(access.customerId, access.webinar.id, conn)
    // Seats are the smaller of what the host set and what the plan allows.
    const { plan } = await entitlementFor(access.customerId)
    const seats = smallest(webinar?.maxParticipants, plan.maxParticipants)
    if (seats != null && (await countLeads(access.customerId, access.webinar.id, conn)) >= seats) {
      throw new AppError(409, 'WEBINAR_FULL', 'As vagas deste webinar acabaram')
    }

    const leadId = await insertLead(access.customerId, access.webinar.id, access.accessCode.id, input, conn)
    return { leadId, webinar: access.webinar, alreadyRegistered: false }
  })
}

export async function publicLeadOr404(leadId: string) {
  const lead = await findPublicLead(leadId)
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Inscrição não encontrada')
  return lead
}

export async function publicSession(leadId: string) {
  const lead = await publicLeadOr404(leadId)
  return { lead: { id: lead.id, name: lead.name }, webinar: lead.webinar }
}

export async function publicAttend(leadId: string) {
  const lead = await publicLeadOr404(leadId)
  if (lead.webinar.status === 'cancelled') throw new AppError(409, 'WEBINAR_CLOSED', 'Este webinar foi cancelado')
  await markAttended(lead.id)
}

export async function publicChatList(leadId: string, query: z.infer<typeof chatQuery>) {
  const lead = await publicLeadOr404(leadId)
  return listChat(lead.customerId, lead.webinarId, {
    after: query.after ? new Date(query.after) : undefined,
    limit: query.limit,
  })
}

export async function publicChatPost(leadId: string, message: string) {
  const lead = await publicLeadOr404(leadId)
  if (lead.webinar.status === 'cancelled' || lead.webinar.status === 'completed') {
    throw new AppError(409, 'CHAT_CLOSED', 'O chat deste webinar está encerrado')
  }
  return insertChat(lead.customerId, lead.webinarId, { leadId: lead.id, userId: null, name: lead.name, role: 'participant' }, message)
}
