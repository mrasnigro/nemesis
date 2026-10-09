import { z } from 'zod'
import { pageQuery } from '../../core/list.js'
import { totalWeight, type Template } from './rubric.js'

const difficulty = z.enum(['beginner', 'intermediate', 'advanced'])
const personaStatus = z.enum(['active', 'paused', 'inactive', 'draft'])

export const SCENARIO_TYPES = [
  'cold_first',
  'warm_first',
  'inbound',
  'discovery',
  'presentation',
  'negotiation',
  'post_sale',
] as const
export const SCENARIO_TYPE_LABELS: Record<(typeof SCENARIO_TYPES)[number], string> = {
  cold_first: 'Prospecção ativa',
  warm_first: 'Lead morno',
  inbound: 'Inbound',
  discovery: 'Diagnóstico',
  presentation: 'Apresentação',
  negotiation: 'Negociação e fechamento',
  post_sale: 'Relacionamento',
}
const scenarioType = z.enum(SCENARIO_TYPES)

const text = (max: number) => z.string().trim().max(max).default('')
const required = (max: number) => z.string().trim().min(1).max(max)
const list = (itemMax: number, maxItems: number) => z.array(z.string().trim().min(1).max(itemMax)).max(maxItems).default([])

export const personaListQuery = pageQuery.extend({
  status: personaStatus.optional(),
  difficulty: difficulty.optional(),
})

export const personaWrite = z.object({
  name: required(200),
  role: required(200),
  company: text(200),
  industry: required(120),
  location: text(200),
  language: text(16).transform((value) => value || 'pt-BR'),
  negotiatorType: text(80),
  tone: text(120),
  behavior: required(2000),
  difficulty: difficulty.default('beginner'),
  mood: text(500),
  openingLine: text(1000),
  personalDetails: list(300, 20),
  objections: list(300, 20).refine((items) => items.length > 0, 'Informe ao menos uma objeção'),
  priorities: list(300, 20),
  beliefs: list(300, 20),
  problemAwareness: text(1000),
  solutionAwareness: text(1000),
  salesModel: z.enum(['b2b', 'b2c']).default('b2b'),
  companyInfo: text(2000),
  trainingObjective: required(1000),
  status: personaStatus.default('active'),
  traits: list(60, 3),
  interactionMode: z.enum(['text', 'voice', 'both']).default('text'),
  voiceRef: text(64),
  scenarioContext: text(2000),
  scenarioType: scenarioType.optional(),
  evaluationTemplateId: z.string().trim().min(1).optional(),
  sellerInstructions: z.string().trim().max(4000).optional(),
  visibility: z.enum(['individual', 'company', 'group']).optional(),
  groupId: z.string().trim().min(1).nullable().optional(),
  tags: list(40, 20).optional(),
  avatarData: z.string().max(400_000).optional(),
  companyFacts: list(300, 30).optional(),
}).superRefine((value, context) => {
  if (value.visibility === 'group' && !value.groupId) {
    context.addIssue({ code: 'custom', path: ['groupId'], message: 'Escolha o grupo que pode ver esta persona' })
  }
})

export const scenarioListQuery = pageQuery.extend({
  difficulty: difficulty.optional(),
  funnelStage: z.string().trim().max(120).optional(),
})

export const scenarioWrite = z.object({
  title: required(200),
  description: required(2000),
  industry: required(120),
  segment: text(120),
  objective: required(1000),
  difficulty,
  durationMin: z.number().int().min(1).max(240).default(10),
  funnelStage: text(120),
  focus: list(120, 20),
  personaId: z.string().min(1),
  evaluationTemplateId: z.string().min(1),
  sellerInstructions: required(4000),
  scriptHints: list(300, 20),
})

export const templateListQuery = pageQuery

const criterionWrite = z.object({
  id: required(64),
  name: required(200),
  weight: z.number().int().min(1).max(100),
  yesNoQuestion: required(500),
  active: z.boolean().default(true),
  passRule: z.object({
    type: z.enum(['keywords', 'avoid_keywords']),
    keywords: z.array(z.string().trim().min(1).max(120)).min(1).max(40),
  }),
})

const sectionWrite = z.object({
  id: required(64),
  name: required(200),
  description: text(500),
  criteria: z.array(criterionWrite).min(1).max(30),
})

export const templateWrite = z
  .object({
    title: required(200),
    description: required(2000),
    contactType: text(120),
    status: z.enum(['published', 'draft']).default('draft'),
    scenarioTypes: z.array(scenarioType).max(7).optional(),
    sections: z.array(sectionWrite).min(1).max(20),
  })
  .superRefine((value, context) => {
    const ids = value.sections.flatMap((section) => section.criteria.map((criterion) => criterion.id))
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: 'custom', path: ['sections'], message: 'Os ids dos critérios devem ser únicos' })
    }
    const total = totalWeight(value as unknown as Template)
    if (total !== 100) {
      context.addIssue({ code: 'custom', path: ['sections'], message: `A soma dos pesos deve ser 100 (atual: ${total})` })
    }
  })

export const sessionListQuery = pageQuery.extend({
  scenarioId: z.string().optional(),
  status: z.enum(['in_progress', 'completed']).optional(),
  scope: z.enum(['mine', 'all']).optional(),
  userId: z.string().optional(),
  groupId: z.string().optional(),
})

export const sessionStart = z
  .object({
    scenarioId: z.string().min(1).optional(),
    personaId: z.string().min(1).optional(),
    mediaMode: z.enum(['text', 'voice']).default('text'),
  })
  .refine((value) => Boolean(value.scenarioId || value.personaId), 'Informe a persona ou o cenário')

export const messageWrite = z.object({
  text: z.string().trim().min(1).max(2000),
  offsetMs: z.number().int().min(0).max(3_600_000).optional(),
  durationMs: z.number().int().min(0).max(600_000).optional(),
})

export const groupWrite = z.object({
  name: required(200),
  description: text(500).optional(),
  status: z.enum(['active', 'paused']).default('active'),
  monthlyMinutes: z.number().int().min(1).max(100_000).nullable().optional(),
  userIds: z.array(z.string().trim().min(1)).max(200).default([]),
})

export const directoryUserPatch = z
  .object({
    profile: z.enum(['customer_admin', 'sdr_bdr']),
    status: z.enum(['active', 'inactive', 'invited']),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })

export const dashboardQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  groupId: z.string().optional(),
  userId: z.string().optional(),
  personaId: z.string().optional(),
  tz: z
    .string()
    .max(64)
    .optional()
    .refine((value) => {
      if (!value) return true
      try {
        new Intl.DateTimeFormat('en-CA', { timeZone: value })
        return true
      } catch {
        return false
      }
    }, 'Fuso horário inválido'),
})

export const settingsPatch = z
  .object({
    require2fa: z.boolean(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' })
