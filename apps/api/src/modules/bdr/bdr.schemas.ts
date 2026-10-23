import { z } from 'zod'
import { pageQuery } from '../../core/list.js'

export const campaignListQuery = pageQuery.extend({
  status: z.enum(['active', 'paused']).optional(),
})

/** Counters (leads, completed, progress) are derived from the lead queue and cannot be written. */
export const campaignWrite = z.object({
  name: z.string().trim().min(1).max(200),
  status: z.enum(['active', 'paused']).optional(),
})

export const callListQuery = pageQuery.extend({
  campaignId: z.string().optional(),
  qualificationId: z.string().trim().max(64).optional(),
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
    attemptId: z.string().max(26).nullable().optional(),
    qualificationId: z.string().max(64).nullable().optional(),
    callbackAt: z.string().datetime({ offset: true }).nullable().optional(),
    meetingIds: z.array(z.string().max(26)).max(20).optional(),
  })
  .passthrough()

const leadRow = z
  .object({
    phone: z.string().trim().min(1).max(40),
    company: z.string().trim().max(200).optional(),
    name: z.string().trim().max(200).optional(),
  })
  .passthrough()

export const leadImport = z.object({
  source: z.enum(['import', 'prospecting', 'manual']).default('import'),
  leads: z.array(leadRow).min(1).max(5000),
})

export const attemptStart = z.object({
  campaignId: z.string().min(1).max(26),
})

export const manualAttemptStart = z.object({
  phone: z.string().trim().min(1).max(40),
  campaignId: z.string().max(26).nullable().optional(),
})

export const bridgeAttemptStart = z.object({
  phone: z.string().trim().min(1).max(40),
  otherPhone: z.string().trim().min(1).max(40),
})

export const transferWrite = z.object({
  extension: z.string().trim().min(1).max(40).regex(/^[\w.@-]+$/),
})

export const leadSchedule = z.object({
  phone: z.string().trim().min(1).max(40),
  at: z.string().datetime({ offset: true }),
})

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const attemptOutcome = z.object({
  outcome: z.enum(['voicemail', 'no_answer', 'busy', 'failed']),
})

export const attemptListQuery = pageQuery.extend({
  campaignId: z.string().optional(),
  leadId: z.string().optional(),
  outcome: z.string().max(32).optional(),
})

export const extensionWrite = z.object({
  extension: z.string().trim().min(1).max(40).regex(/^[\w.@-]+$/),
  sipPassword: z.string().min(1).max(200).optional(),
})

export const telephonySettingsWrite = z.object({
  provider: z.enum(['none', 'simulated', 'falevono', 'asterisk']).optional(),
  baseUrl: z.string().url().nullable().optional(),
  ariUrl: z
    .string()
    .url()
    .max(255)
    .refine((value) => {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash
    })
    .nullable()
    .optional(),
  ariUsername: z.string().trim().min(1).max(128).nullable().optional(),
  ariPassword: z.string().min(1).max(200).optional(),
  trunkEndpoint: z.string().trim().min(1).max(80).regex(/^[\w.-]+$/).nullable().optional(),
  callerId: z.string().trim().max(40).nullable().optional(),
  maxChannels: z.number().int().min(1).max(100).optional(),
  webrtcWssUrl: z
    .string()
    .url()
    .max(255)
    .refine((value) => {
      const url = new URL(value)
      return url.protocol === 'wss:' && !url.username && !url.password && !url.search && !url.hash
    })
    .nullable()
    .optional(),
  sipDomain: z.string().trim().min(1).max(255).regex(/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/).nullable().optional(),
  amdEnabled: z.boolean().optional(),
  callingStart: clock.nullable().optional(),
  callingEnd: clock.nullable().optional(),
  callingDays: z.string().regex(/^$|^[1-7](,[1-7])*$/).optional(),
  inboundExtension: z.string().trim().max(40).regex(/^[\w.@-]*$/).nullable().optional(),
  recordCalls: z.boolean().optional(),
  apiToken: z.string().min(1).max(200).optional(),
  apiKey: z.string().min(1).max(200).optional(),
  deviceId: z.string().trim().min(1).max(40).nullable().optional(),
  dialPrefix: z.string().regex(/^\d{0,8}$/).optional(),
  ringTimeoutSeconds: z.number().int().min(10).max(120).optional(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  retryBusyMinutes: z.number().int().min(1).max(10080).optional(),
  retryNoAnswerMinutes: z.number().int().min(1).max(10080).optional(),
  retryVoicemailMinutes: z.number().int().min(1).max(10080).optional(),
})

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
