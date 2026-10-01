import { z } from 'zod'
import { pageQuery } from '../../core/list.js'

export const campaignListQuery = pageQuery.extend({
  status: z.enum(['active', 'paused']).optional(),
})

export const campaignWrite = z
  .object({
    name: z.string().trim().min(1).max(200),
    status: z.enum(['active', 'paused']).optional(),
  })
  .passthrough()

export const callListQuery = pageQuery.extend({
  campaignId: z.string().optional(),
  mode: z.enum(['automatic', 'manual']).optional(),
  callStatus: z.string().trim().max(64).optional(),
})

export const callWrite = z
  .object({
    phone: z.string().trim().min(1).max(40),
    mode: z.enum(['automatic', 'manual']).default('automatic'),
    callStatus: z.string().trim().min(1).max(64),
    campaignId: z.string().nullable().optional(),
    leadName: z.string().optional(),
    company: z.string().optional(),
    duration: z.number().int().nonnegative().optional(),
    durationSeconds: z.number().int().nonnegative().optional(),
  })
  .passthrough()

export const meetingListQuery = pageQuery

export const meetingWrite = z
  .object({
    leadName: z.string().trim().min(1).max(200),
    company: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    startsAt: z.string().optional(),
    notes: z.string().optional(),
    callId: z.string().nullable().optional(),
  })
  .passthrough()

export const meetingPatch = meetingWrite.partial()
