import { PLATFORM_ROLES, USER_PROFILES, USER_STATUSES } from '@imp/shared'
import { z } from 'zod'
import { pageQuery } from '../../core/list.js'
import { moduleIdList } from '../customers/customers.schemas.js'

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore')

const password = z.string().min(8).max(200)

const email = z.string().trim().toLowerCase().email().max(254)

export const userListQuery = pageQuery.extend({
  customerId: z.string().length(26).optional(),
  status: z.enum(USER_STATUSES).optional(),
  role: z.enum(PLATFORM_ROLES).optional(),
})

export const userCreate = z
  .object({
    customerId: z.string().length(26).nullable().default(null),
    username,
    name: z.string().trim().min(2).max(200),
    email: email.nullable().default(null),
    password,
    role: z.enum(PLATFORM_ROLES).default('imp'),
    profile: z.enum(USER_PROFILES).nullable().default('sdr_bdr'),
    status: z.enum(USER_STATUSES).default('active'),
    moduleIds: moduleIdList.default([]),
  })
  .superRefine((value, ctx) => {
    if (value.role === 'imp' && !value.profile) {
      ctx.addIssue({ code: 'custom', path: ['profile'], message: 'Customer users need a profile' })
    }
  })

export const userUpdate = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: email.nullable(),
    profile: z.enum(USER_PROFILES),
    status: z.enum(USER_STATUSES),
    password,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })

export type UserCreate = z.infer<typeof userCreate>
export type UserUpdate = z.infer<typeof userUpdate>
export type UserListQuery = z.infer<typeof userListQuery>
