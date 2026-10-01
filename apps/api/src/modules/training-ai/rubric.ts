/**
 * Playbook rubric: which criteria a trainee passed and the score that follows.
 * The server owns this. The browser never sends a score.
 */

export type PassRule = { type: 'keywords' | 'avoid_keywords'; keywords: string[] }

export type Criterion = {
  id: string
  name: string
  weight: number
  yesNoQuestion: string
  passRule: PassRule
  active?: boolean
}

export type Section = { id: string; name: string; description?: string; criteria: Criterion[] }

export type Template = {
  id: string
  title: string
  description?: string
  contactType?: string
  status?: string
  sections: Section[]
}

export type FlatCriterion = Criterion & { sectionId: string; sectionName: string }

export type CriterionVerdict = { criterionId: string; passed: boolean; rationale: string }

export type Judgment = { provider: string; criteria: CriterionVerdict[] }

export type ChatMessage = { id: string; role: 'ai' | 'user'; speaker: string; text: string; timestamp: string }

export const SCORE_BANDS = [
  { min: 90, label: 'Excelente', tone: 'green' },
  { min: 75, label: 'Bom', tone: 'blue' },
  { min: 60, label: 'Em desenvolvimento', tone: 'amber' },
  { min: 0, label: 'Precisa reforço', tone: 'rose' },
] as const

export function scoreBand(score: number) {
  const band = SCORE_BANDS.find((item) => score >= item.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]
  return { label: band.label, tone: band.tone }
}

export function normalizeText(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function flattenCriteria(template: Template): FlatCriterion[] {
  return template.sections.flatMap((section) =>
    section.criteria.map((criterion) => ({ ...criterion, sectionId: section.id, sectionName: section.name })),
  )
}

export function totalWeight(template: Template): number {
  return flattenCriteria(template).reduce((sum, criterion) => sum + criterion.weight, 0)
}

function keywordPattern(keyword: string): RegExp | null {
  const escaped = normalizeText(keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped ? new RegExp(escaped, 'i') : null
}

/** `corpus` is normalizeText() of everything the trainee said. */
export function passesRule(criterion: Criterion, corpus: string): boolean {
  const patterns = criterion.passRule.keywords.map(keywordPattern).filter((item): item is RegExp => item !== null)
  if (patterns.length === 0) return false
  const hit = patterns.some((pattern) => pattern.test(corpus))
  return criterion.passRule.type === 'avoid_keywords' ? !hit : hit
}

/** Deterministic judge: the playbook's own keyword rules. Used by the built-in provider and as the fallback. */
export function judgeByRules(template: Template, traineeTexts: string[], provider = 'rules'): Judgment {
  const corpus = normalizeText(traineeTexts.join(' \n '))
  return {
    provider,
    criteria: flattenCriteria(template).map((criterion) => {
      const passed = passesRule(criterion, corpus)
      return {
        criterionId: criterion.id,
        passed,
        rationale: passed
          ? `Evidência no diálogo alinhada a: “${criterion.yesNoQuestion}”.`
          : `Sem evidência clara no diálogo para: “${criterion.yesNoQuestion}”.`,
      }
    }),
  }
}

export function evaluateRubric(template: Template, judgment: Judgment) {
  const verdicts = new Map(judgment.criteria.map((item) => [item.criterionId, item]))
  const criteria = flattenCriteria(template).map((criterion) => {
    const verdict = verdicts.get(criterion.id)
    return {
      id: criterion.id,
      name: criterion.name,
      sectionId: criterion.sectionId,
      sectionName: criterion.sectionName,
      weight: criterion.weight,
      yesNoQuestion: criterion.yesNoQuestion,
      passed: verdict?.passed === true,
      rationale: verdict?.rationale || null,
    }
  })

  const score = criteria.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0)

  const sections: {
    id: string
    name: string
    criteria: typeof criteria
    passedCount: number
    totalCount: number
    earnedWeight: number
    totalWeight: number
  }[] = []
  for (const item of criteria) {
    let section = sections.find((entry) => entry.id === item.sectionId)
    if (!section) {
      section = {
        id: item.sectionId,
        name: item.sectionName,
        criteria: [],
        passedCount: 0,
        totalCount: 0,
        earnedWeight: 0,
        totalWeight: 0,
      }
      sections.push(section)
    }
    section.criteria.push(item)
    section.totalCount += 1
    section.totalWeight += item.weight
    if (item.passed) {
      section.passedCount += 1
      section.earnedWeight += item.weight
    }
  }

  return { score, band: scoreBand(score), sections, criteria }
}

export function coachNotes(score: number): string {
  if (score >= 90) return 'Excelente domínio da rubrica. Pronto para cenários avançados.'
  if (score >= 75) return 'Bom desempenho. Refine os critérios em falha e refaça o cenário.'
  if (score >= 60) return 'Em desenvolvimento. Foque em valor concreto e próximo passo agendável.'
  return 'Precisa de reforço. Revise a conversa e pratique a abertura e a agenda.'
}

export type SessionReport = ReturnType<typeof buildReport>

export function buildReport(input: {
  sessionId: string
  scenario: { id: string; title: string }
  persona: { id: string; name: string }
  template: Template
  mediaMode: 'text' | 'voice'
  judgeSource: string
  judgment: Judgment
  messages: ChatMessage[]
  completedAt: Date
}) {
  const rubric = evaluateRubric(input.template, input.judgment)
  const passed = rubric.criteria.filter((item) => item.passed)
  const failed = rubric.criteria.filter((item) => !item.passed)

  const strengths = passed.length ? passed.map((item) => item.name) : ['Manteve a simulação até o final']
  const improvements = failed.length
    ? failed.map((item) => item.yesNoQuestion || item.name)
    : ['Aprofundar perguntas de diagnóstico na próxima rodada']

  // Each failed criterion points at a trainee message so the report can link back to the transcript.
  const traineeMessages = input.messages.filter((message) => message.role === 'user')
  const coachFeedback = failed.slice(0, 6).map((criterion, index) => {
    const message = traineeMessages[Math.min(index, Math.max(0, traineeMessages.length - 1))] ?? null
    return {
      id: `fb_${criterion.id}`,
      criterionId: criterion.id,
      title: criterion.name,
      detail: criterion.rationale || criterion.yesNoQuestion,
      messageId: message?.id ?? null,
      messageText: message?.text ?? null,
      timestamp: message?.timestamp ?? null,
      passed: false,
    }
  })

  const nextSteps = improvements.length && failed.length
    ? [
        `Refazer o cenário focando em: ${improvements[0]}`,
        'Revisar o playbook e as perguntas sim/não que falharam.',
        'Praticar abertura e próximo passo com o mesmo agente.',
      ]
    : ['Manter a prática com um agente de dificuldade maior.']

  return {
    id: `eval_${input.sessionId}`,
    sessionId: input.sessionId,
    scenarioId: input.scenario.id,
    scenarioTitle: input.scenario.title,
    personaId: input.persona.id,
    personaName: input.persona.name,
    templateId: input.template.id,
    templateTitle: input.template.title,
    mode: 'free' as const,
    mediaMode: input.mediaMode,
    judgeSource: input.judgeSource,
    score: rubric.score,
    band: rubric.band,
    sections: rubric.sections,
    criteria: rubric.criteria,
    strengths,
    improvements,
    coachNotes: coachNotes(rubric.score),
    coachFeedback,
    nextSteps,
    completedAt: input.completedAt.toISOString(),
  }
}
