import { z } from 'zod'
import { pageQuery } from '../../core/list.js'

export const WEBINAR_STATUSES = ['draft', 'scheduled', 'live', 'completed', 'cancelled'] as const
export const LEAD_STATUSES = ['registered', 'attended', 'no_show'] as const

const status = z.enum(WEBINAR_STATUSES)
const leadStatus = z.enum(LEAD_STATUSES)

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null))

const dateTime = z.string().datetime({ offset: true }).transform((value) => new Date(value))

const webinarFields = {
  title: z.string().trim().min(1).max(255),
  description: optionalText(5000),
  scheduledAt: dateTime,
  durationMinutes: z.number().int().min(1).max(24 * 60),
  timezone: z.string().trim().min(1).max(100).default('America/Sao_Paulo'),
  isRecurring: z.boolean().default(false),
  recurrencePattern: optionalText(100),
  recurrenceEndAt: dateTime.nullish().transform((value) => value ?? null),
  presenterName: optionalText(255),
  presenterBio: optionalText(5000),
  presenterImageUrl: optionalText(500),
  registrationColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB')
    .default('#007bff'),
  maxParticipants: z.number().int().min(1).max(100000).nullish().transform((value) => value ?? null),
}

export const webinarCreate = z.object({ ...webinarFields, status: status.default('draft') })

/** PATCH: every field optional, nothing is defaulted so an omitted field is left alone. */
export const webinarPatch = z
  .object({
    title: webinarFields.title,
    description: z.string().trim().max(5000).nullable(),
    scheduledAt: dateTime,
    durationMinutes: webinarFields.durationMinutes,
    timezone: z.string().trim().min(1).max(100),
    isRecurring: z.boolean(),
    recurrencePattern: z.string().trim().max(100).nullable(),
    recurrenceEndAt: dateTime.nullable(),
    presenterName: z.string().trim().max(255).nullable(),
    presenterBio: z.string().trim().max(5000).nullable(),
    presenterImageUrl: z.string().trim().max(500).nullable(),
    registrationColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB'),
    maxParticipants: z.number().int().min(1).max(100000).nullable(),
    status,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo')

export const webinarStatusWrite = z.object({ status })

export const webinarListQuery = pageQuery.extend({
  status: status.optional(),
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export const leadListQuery = pageQuery.extend({ status: leadStatus.optional() })

export const leadPatch = z.object({ status: leadStatus })

export const accessCodeCreate = z
  .object({
    code: z
      .string()
      .trim()
      .min(4)
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, 'Use apenas letras, números, - e _')
      .optional(),
    scheduledAt: dateTime,
    expiresAt: dateTime,
    maxLeads: z.number().int().min(1).max(100000).nullish().transform((value) => value ?? null),
  })
  .refine((value) => value.expiresAt > value.scheduledAt, {
    path: ['expiresAt'],
    message: 'A expiração deve ser depois do início',
  })

export const chatWrite = z.object({ message: z.string().trim().min(1).max(1000) })

export const chatQuery = z.object({
  after: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
})

// ------------------------------------------------------------------- public

export const publicAccessBody = z.object({ code: z.string().trim().min(1).max(50) })

export const publicRegisterBody = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: optionalText(30),
})
