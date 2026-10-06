import { z } from 'zod'
import { pageQuery } from '../../core/list.js'

export const SUBSCRIPTION_STATUSES = ['active', 'suspended', 'cancelled'] as const

/** null = no limit. */
const limit = z.number().int().min(1).max(10_000_000).nullable()

const planFields = {
  name: z.string().trim().min(1).max(100),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => (value ? value : null)),
  priceCents: z.number().int().min(0).max(100_000_000),
  maxDurationMinutes: limit,
  maxParticipants: limit,
  replayStorageDays: limit,
  features: z
    .array(z.string().trim().min(1).max(120))
    .max(30)
    .transform((items) => [...new Set(items)]),
  isStarter: z.boolean(),
  trialDays: z.number().int().min(1).max(3650).nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(-1000).max(1000),
}

export const planCreate = z.object({
  name: planFields.name,
  description: planFields.description,
  priceCents: planFields.priceCents,
  maxDurationMinutes: planFields.maxDurationMinutes.default(null),
  maxParticipants: planFields.maxParticipants.default(null),
  replayStorageDays: planFields.replayStorageDays.default(null),
  features: planFields.features.default([]),
  isStarter: planFields.isStarter.default(false),
  trialDays: planFields.trialDays.default(null),
  isActive: planFields.isActive.default(true),
  sortOrder: planFields.sortOrder.default(0),
})

export const planPatch = z
  .object({ ...planFields, description: z.string().trim().max(2000).nullable() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo')

const dateTime = z.string().datetime({ offset: true }).transform((value) => new Date(value))

/** Puts a customer on a plan, or changes its status or expiry. `expiresAt: null` = never expires. */
export const subscriptionWrite = z
  .object({
    planId: z.string().length(26),
    status: z.enum(SUBSCRIPTION_STATUSES),
    expiresAt: dateTime.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo')

export const subscriptionListQuery = pageQuery.extend({ planId: z.string().length(26).optional() })

/** Without `periodStart`/`periodEnd` the payment renews one month from the later of now and the current expiry. */
export const paymentCreate = z
  .object({
    amountCents: z.number().int().min(0).max(100_000_000).optional(),
    method: z
      .string()
      .trim()
      .max(50)
      .nullish()
      .transform((value) => (value ? value : null)),
    note: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((value) => (value ? value : null)),
    paidAt: dateTime.optional(),
    periodStart: dateTime.optional(),
    periodEnd: dateTime.optional(),
  })
  .refine((value) => !value.periodStart || !value.periodEnd || value.periodEnd > value.periodStart, {
    path: ['periodEnd'],
    message: 'O fim do período deve ser depois do início',
  })
