import type { z } from 'zod'
import { withTransaction } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { recordAudit } from '../audit/audit.repository.js'
import {
  clearStarterExcept,
  getCustomerName,
  getPlan,
  getStarterPlan,
  getSubscription,
  insertPayment,
  insertPlan,
  insertSubscriptionIfMissing,
  listCustomerSubscriptions,
  listPayments,
  listPlans,
  planNameTaken,
  softDeletePlan,
  updatePlan,
  updateSubscription,
  voidPayment,
  type PlanDto,
  type SubscriptionRow,
} from './plans.repository.js'
import type { paymentCreate, planCreate, planPatch, subscriptionListQuery, subscriptionWrite } from './plans.schemas.js'

const DAY_MS = 24 * 3600 * 1000

/** An IMP administrator acting on a customer's plan. */
export type PlanActor = { userId: string; name: string; ip?: string }

// -------------------------------------------------------------- entitlement

/** What a customer's subscription lets it do right now. */
export type SubscriptionState = 'active' | 'expired' | 'suspended' | 'cancelled'

export type Entitlement = {
  state: SubscriptionState
  status: SubscriptionRow['status']
  startedAt: string
  expiresAt: string | null
  /** Whole days left, null when it does not expire; 0 once it has. */
  daysLeft: number | null
  plan: PlanDto
}

function stateOf(subscription: SubscriptionRow, now: Date): SubscriptionState {
  if (subscription.status !== 'active') return subscription.status
  if (subscription.expiresAt && new Date(subscription.expiresAt) <= now) return 'expired'
  return 'active'
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

function entitlementOf(subscription: SubscriptionRow, plan: PlanDto, now = new Date()): Entitlement {
  const expires = subscription.expiresAt ? new Date(subscription.expiresAt).getTime() : null
  return {
    state: stateOf(subscription, now),
    status: subscription.status,
    startedAt: subscription.startedAt,
    expiresAt: subscription.expiresAt,
    daysLeft: expires === null ? null : Math.max(0, Math.ceil((expires - now.getTime()) / DAY_MS)),
    plan,
  }
}

/**
 * The customer's subscription. A customer that has none yet is put on the starter plan now, so the
 * trial clock starts the first time the module is actually used.
 */
export async function entitlementFor(customerId: string): Promise<Entitlement> {
  let subscription = await getSubscription(customerId)
  if (!subscription) {
    const starter = await getStarterPlan()
    if (!starter) throw new AppError(503, 'NO_STARTER_PLAN', 'Nenhum plano inicial está configurado. Fale com o suporte.')
    const now = new Date()
    await insertSubscriptionIfMissing({
      customerId,
      planId: starter.id,
      status: 'active',
      startedAt: now,
      expiresAt: starter.trialDays ? new Date(now.getTime() + starter.trialDays * DAY_MS) : null,
    })
    subscription = await getSubscription(customerId)
  }
  const plan = subscription ? await getPlan(subscription.planId) : null
  if (!subscription || !plan) throw new AppError(500, 'INTERNAL', 'Assinatura sem plano')
  return entitlementOf(subscription, plan)
}

const INACTIVE_MESSAGE: Record<Exclude<SubscriptionState, 'active'>, string> = {
  expired: 'A assinatura do Webinar venceu. Fale com o suporte para renovar.',
  suspended: 'A assinatura do Webinar está suspensa. Fale com o suporte.',
  cancelled: 'A assinatura do Webinar foi cancelada. Fale com o suporte.',
}

/** Scheduling or going live needs a subscription in force. Reading and ending a webinar never does. */
export async function assertSubscriptionActive(customerId: string): Promise<Entitlement> {
  const entitlement = await entitlementFor(customerId)
  if (entitlement.state !== 'active') {
    throw new AppError(403, 'SUBSCRIPTION_INACTIVE', INACTIVE_MESSAGE[entitlement.state])
  }
  return entitlement
}

/** A webinar's length and seats may not exceed what the plan allows. Fields left out are not checked. */
export async function assertFitsPlan(
  customerId: string,
  webinar: { durationMinutes?: number; maxParticipants?: number | null },
): Promise<Entitlement> {
  const entitlement = await entitlementFor(customerId)
  const { plan } = entitlement
  if (
    webinar.durationMinutes !== undefined &&
    plan.maxDurationMinutes !== null &&
    webinar.durationMinutes > plan.maxDurationMinutes
  ) {
    throw new AppError(
      403,
      'PLAN_LIMIT',
      `O plano ${plan.name} permite webinars de até ${plan.maxDurationMinutes} minutos.`,
    )
  }
  if (
    webinar.maxParticipants != null &&
    plan.maxParticipants !== null &&
    webinar.maxParticipants > plan.maxParticipants
  ) {
    throw new AppError(
      403,
      'PLAN_LIMIT',
      `O plano ${plan.name} permite até ${plan.maxParticipants} participantes por webinar.`,
    )
  }
  return entitlement
}

/** The smaller of the limits that apply; null when none does. */
export function smallest(...limits: (number | null | undefined)[]): number | null {
  const set = limits.filter((value): value is number => typeof value === 'number')
  return set.length > 0 ? Math.min(...set) : null
}

// ------------------------------------------------------- customer's own view

export async function subscriptionFor(customerId: string, includePayments: boolean) {
  const entitlement = await entitlementFor(customerId)
  return { ...entitlement, payments: includePayments ? await listPayments(customerId) : undefined }
}

export const publicPlans = () => listPlans({ activeOnly: true })

// ------------------------------------------------------------ plan catalog

function audit(actor: PlanActor, customerId: string | null, action: string, entityType: string, entityId: string, summary: string) {
  return recordAudit({
    actor: { id: actor.userId, name: actor.name },
    customerId,
    action,
    entityType,
    entityId,
    summary,
    ip: actor.ip,
  })
}

export const listPlansFor = () => listPlans()

async function planOr404(id: string): Promise<PlanDto> {
  const plan = await getPlan(id)
  if (!plan) throw new AppError(404, 'NOT_FOUND', 'Plano não encontrado')
  return plan
}

export async function createPlanFor(actor: PlanActor, input: z.infer<typeof planCreate>) {
  if (await planNameTaken(input.name, null)) throw new AppError(409, 'PLAN_NAME_TAKEN', 'Já existe um plano com este nome.')
  if (input.isStarter && !input.isActive) {
    throw new AppError(409, 'STARTER_MUST_BE_ACTIVE', 'O plano inicial precisa estar ativo.')
  }
  const id = await withTransaction(async (conn) => {
    const created = await insertPlan(input, conn)
    if (input.isStarter) await clearStarterExcept(created, conn)
    return created
  })
  await audit(actor, null, 'webinar.plan_created', 'webinar_plan', id, `Plano "${input.name}" criado`)
  return planOr404(id)
}

export async function updatePlanFor(actor: PlanActor, id: string, patch: z.infer<typeof planPatch>) {
  const before = await planOr404(id)
  if (patch.name !== undefined && (await planNameTaken(patch.name, id))) {
    throw new AppError(409, 'PLAN_NAME_TAKEN', 'Já existe um plano com este nome.')
  }
  const willBeStarter = patch.isStarter ?? before.isStarter
  const willBeActive = patch.isActive ?? before.isActive
  if (before.isStarter && patch.isStarter === false) {
    throw new AppError(409, 'STARTER_REQUIRED', 'Escolha outro plano como inicial antes de remover este.')
  }
  if (willBeStarter && !willBeActive) {
    throw new AppError(409, 'STARTER_MUST_BE_ACTIVE', 'O plano inicial precisa estar ativo.')
  }
  await withTransaction(async (conn) => {
    await updatePlan(id, patch, conn)
    if (patch.isStarter) await clearStarterExcept(id, conn)
  })
  await audit(actor, null, 'webinar.plan_updated', 'webinar_plan', id, `Plano "${patch.name ?? before.name}" atualizado`)
  return planOr404(id)
}

export async function deletePlanFor(actor: PlanActor, id: string) {
  const plan = await planOr404(id)
  if (plan.isStarter) throw new AppError(409, 'STARTER_REQUIRED', 'Escolha outro plano como inicial antes de excluir este.')
  if ((plan.subscribers ?? 0) > 0) {
    throw new AppError(409, 'PLAN_IN_USE', 'Há clientes neste plano. Mude o plano deles ou desative este.')
  }
  await softDeletePlan(id)
  await audit(actor, null, 'webinar.plan_deleted', 'webinar_plan', id, `Plano "${plan.name}" excluído`)
}

// ---------------------------------------------------- customer subscriptions

export const listSubscriptionsFor = (query: z.infer<typeof subscriptionListQuery>) => listCustomerSubscriptions(query)

async function customerOr404(customerId: string): Promise<string> {
  const name = await getCustomerName(customerId)
  if (!name) throw new AppError(404, 'NOT_FOUND', 'Cliente não encontrado')
  return name
}

/** One customer as an administrator sees it. A customer that never used the module has no subscription yet. */
export async function subscriptionDetailFor(customerId: string) {
  const customerName = await customerOr404(customerId)
  const subscription = await getSubscription(customerId)
  const plan = subscription ? await getPlan(subscription.planId) : null
  return {
    customerId,
    customerName,
    subscription: subscription && plan ? entitlementOf(subscription, plan) : null,
    payments: await listPayments(customerId),
  }
}

export async function setSubscriptionFor(actor: PlanActor, customerId: string, input: z.infer<typeof subscriptionWrite>) {
  const customerName = await customerOr404(customerId)
  const current = await getSubscription(customerId)

  let newPlan: PlanDto | null = null
  if (input.planId !== undefined) {
    newPlan = await planOr404(input.planId)
    if (!newPlan.isActive && newPlan.id !== current?.planId) {
      throw new AppError(409, 'PLAN_INACTIVE', 'Este plano está desativado e não pode ser atribuído.')
    }
  }

  if (!current) {
    if (!newPlan) throw new AppError(400, 'VALIDATION_ERROR', 'Escolha o plano da assinatura.')
    await insertSubscriptionIfMissing({
      customerId,
      planId: newPlan.id,
      status: input.status ?? 'active',
      startedAt: new Date(),
      expiresAt: input.expiresAt ?? null,
    })
  } else {
    await updateSubscription(customerId, {
      planId: input.planId,
      status: input.status,
      expiresAt: input.expiresAt,
    })
  }

  const parts = [
    newPlan && newPlan.id !== current?.planId ? `plano ${newPlan.name}` : null,
    input.status ? `status ${input.status}` : null,
    input.expiresAt !== undefined ? `vencimento ${input.expiresAt ? input.expiresAt.toISOString().slice(0, 10) : 'sem vencimento'}` : null,
  ].filter(Boolean)
  await audit(
    actor,
    customerId,
    'webinar.subscription_updated',
    'webinar_subscription',
    customerId,
    `Assinatura do Webinar de "${customerName}": ${parts.join(', ') || 'sem mudanças'}`,
  )
  return subscriptionDetailFor(customerId)
}

/**
 * Registers a payment received outside the platform and renews the subscription: the expiry moves to
 * the end of the paid period when that is later. A subscription that never expires stays that way.
 */
export async function recordPaymentFor(actor: PlanActor, customerId: string, input: z.infer<typeof paymentCreate>) {
  const customerName = await customerOr404(customerId)
  const subscription = await getSubscription(customerId)
  const plan = subscription ? await getPlan(subscription.planId) : null
  if (!subscription || !plan) {
    throw new AppError(409, 'NO_SUBSCRIPTION', 'Este cliente ainda não tem assinatura. Atribua um plano primeiro.')
  }

  const now = new Date()
  const currentEnd = subscription.expiresAt ? new Date(subscription.expiresAt) : null
  const periodStart = input.periodStart ?? (currentEnd && currentEnd > now ? currentEnd : now)
  const periodEnd = input.periodEnd ?? addMonths(periodStart, 1)
  if (periodEnd <= periodStart) {
    throw new AppError(400, 'VALIDATION_ERROR', 'O fim do período deve ser depois do início', [
      { path: 'periodEnd', message: 'O fim do período deve ser depois do início' },
    ])
  }
  const amountCents = input.amountCents ?? plan.priceCents

  await withTransaction(async (conn) => {
    await insertPayment(
      {
        customerId,
        planId: plan.id,
        amountCents,
        method: input.method,
        note: input.note,
        paidAt: input.paidAt ?? now,
        periodStart,
        periodEnd,
        recordedBy: actor.userId,
      },
      conn,
    )
    if (currentEnd && periodEnd > currentEnd) await updateSubscription(customerId, { expiresAt: periodEnd }, conn)
  })

  await audit(
    actor,
    customerId,
    'webinar.payment_recorded',
    'webinar_subscription',
    customerId,
    `Pagamento de ${(amountCents / 100).toFixed(2)} registrado para "${customerName}" (plano ${plan.name}) até ${periodEnd.toISOString().slice(0, 10)}`,
  )
  return subscriptionDetailFor(customerId)
}

/** Marks a payment as void. The expiry is left as it is: change it on the subscription if it was wrong. */
export async function voidPaymentFor(actor: PlanActor, customerId: string, paymentId: string) {
  const customerName = await customerOr404(customerId)
  if (!(await voidPayment(customerId, paymentId))) throw new AppError(404, 'NOT_FOUND', 'Pagamento não encontrado')
  await audit(
    actor,
    customerId,
    'webinar.payment_voided',
    'webinar_subscription',
    customerId,
    `Pagamento ${paymentId} anulado para "${customerName}"`,
  )
  return subscriptionDetailFor(customerId)
}
