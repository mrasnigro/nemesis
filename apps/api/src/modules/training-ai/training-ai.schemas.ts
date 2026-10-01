import { z } from 'zod'
import { pageQuery } from '../../core/list.js'

const difficulty = z.enum(['beginner', 'intermediate', 'advanced'])
const personaStatus = z.enum(['active', 'paused', 'inactive', 'draft'])

export const personaListQuery = pageQuery.extend({
  status: personaStatus.optional(),
  difficulty: difficulty.optional(),
})

export const personaWrite = z
  .object({
    name: z.string().trim().min(1).max(200),
    status: personaStatus.optional(),
    industry: z.string().trim().max(120).optional(),
    difficulty: difficulty.optional(),
  })
  .passthrough()

export const scenarioListQuery = pageQuery.extend({
  difficulty: difficulty.optional(),
  funnelStage: z.string().trim().max(120).optional(),
})

export const scenarioWrite = z
  .object({
    title: z.string().trim().min(1).max(200),
    difficulty: difficulty,
    funnelStage: z.string().trim().max(120).optional(),
    personaId: z.string().min(1),
    evaluationTemplateId: z.string().min(1),
  })
  .passthrough()

export const templateListQuery = pageQuery

export const templateWrite = z
  .object({
    title: z.string().trim().min(1).max(200),
    contactType: z.string().trim().max(120).optional(),
  })
  .passthrough()

export const sessionListQuery = pageQuery.extend({
  scenarioId: z.string().optional(),
})

export const sessionWrite = z.object({
  scenarioId: z.string().min(1),
  personaId: z.string().optional(),
  status: z.enum(['in_progress', 'completed']).default('completed'),
  score: z.number().nullable().optional(),
  report: z.record(z.unknown()).optional(),
})
