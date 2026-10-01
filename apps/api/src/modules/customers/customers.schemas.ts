import { CUSTOMER_PLANS, CUSTOMER_STATUSES, MODULE_IDS } from '@imp/shared'
import { z } from 'zod'
import { pageQuery } from '../../core/list.js'

export const moduleIdList = z
  .array(z.enum(MODULE_IDS))
  .max(MODULE_IDS.length)
  .transform((ids) => [...new Set(ids)])

export const customerListQuery = pageQuery.extend({
  status: z.enum(CUSTOMER_STATUSES).optional(),
})

export const customerCreate = z.object({
  name: z.string().trim().min(2).max(200),
  plan: z.enum(CUSTOMER_PLANS).default('Starter'),
  status: z.enum(CUSTOMER_STATUSES).default('trial'),
  moduleIds: moduleIdList.default([]),
})

export const customerUpdate = z
  .object({
    name: z.string().trim().min(2).max(200),
    plan: z.enum(CUSTOMER_PLANS),
    status: z.enum(CUSTOMER_STATUSES),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })

export const moduleAssignment = z.object({
  moduleIds: moduleIdList,
})

export type CustomerCreate = z.infer<typeof customerCreate>
export type CustomerUpdate = z.infer<typeof customerUpdate>
export type CustomerListQuery = z.infer<typeof customerListQuery>
