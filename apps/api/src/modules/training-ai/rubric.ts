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

/** Feedback the AI judge writes for this one conversation. Absent when the playbook rules judged it. */
export type JudgeFeedback = { summary: string; strengths: string[]; improvements: string[] }

export type Judgment = { provider: string; criteria: CriterionVerdict[]; feedback?: JudgeFeedback | null }

export type ChatMessage = {
  id: string
  role: 'ai' | 'user'
  speaker: string
  text: string
  timestamp: string
  offsetMs?: number | null
  durationMs?: number | null
}

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
  // Nothing to look for: a "say this" rule cannot be met, an "avoid this" rule cannot be broken.
  if (patterns.length === 0) return criterion.passRule.type === 'avoid_keywords'
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

const FILLER =
  /\b(n[eé]|tipo|ent[aã]o|ah+|hum+|eh+|assim|basicamente|literalmente|sabe|t[aá])\b/gi

function speakSeconds(message: ChatMessage): number {
  if (message.durationMs && message.durationMs > 0) return message.durationMs / 1000
  const words = message.text.trim().split(/\s+/).filter(Boolean).length
  return words / 2.3
}

function bandStatus(value: number, low: number, high: number, near = 0): string {
  if (value >= low && value <= high) return 'Ideal'
  if (near > 0 && value >= low - near && value <= high + near) return 'Atenção'
  return 'Precisa Melhorar'
}

/** Talk time, pace, monologue and fillers. Durations come from the call; otherwise they are estimated from the words. */
export function communicationMetrics(messages: ChatMessage[]) {
  const user = messages.filter((message) => message.role === 'user')
  const ai = messages.filter((message) => message.role === 'ai')
  const userSec = user.reduce((sum, message) => sum + speakSeconds(message), 0)
  const aiSec = ai.reduce((sum, message) => sum + speakSeconds(message), 0)
  const total = userSec + aiSec
  const talkListenPct = total > 0 ? Math.round((userSec / total) * 100) : 0
  const words = user.reduce((sum, message) => sum + message.text.trim().split(/\s+/).filter(Boolean).length, 0)
  const minutes = Math.max(userSec / 60, 1 / 60)
  const wordsPerMinute = Math.round(words / minutes)
  const longestMonologueSec = Math.round(Math.max(0, ...user.map(speakSeconds), 0))
  const fillerCount = user.reduce((sum, message) => sum + (message.text.match(FILLER)?.length ?? 0), 0)
  const fillersPerMinute = Math.round((fillerCount / minutes) * 10) / 10
  return {
    talkListenPct,
    talkListenIdeal: '40–50%',
    talkListenStatus: bandStatus(talkListenPct, 40, 50),
    wordsPerMinute,
    wordsPerMinuteIdeal: '110–150',
    wordsPerMinuteStatus: bandStatus(wordsPerMinute, 110, 150, 20),
    longestMonologueSec,
    longestMonologueIdeal: '60–150s',
    longestMonologueStatus: bandStatus(longestMonologueSec, 60, 150),
    fillersPerMinute,
    fillersIdeal: 'menos de 2 por minuto',
    fillersStatus: fillersPerMinute < 2 ? 'Bom' : 'Precisa Melhorar',
    durationSec: Math.round(total),
  }
}

/** The trainee message that contains one of the criterion's keywords, if any. */
function matchingMessage(criterion: Criterion | undefined, traineeMessages: ChatMessage[]): ChatMessage | null {
  const patterns = (criterion?.passRule.keywords ?? []).map(keywordPattern).filter((item): item is RegExp => item !== null)
  if (!patterns.length) return null
  return traineeMessages.find((message) => patterns.some((pattern) => pattern.test(normalizeText(message.text)))) ?? null
}

function evidenceOf(message: ChatMessage | null) {
  if (!message) return null
  return { messageId: message.id, timestamp: message.timestamp, quote: message.text.slice(0, 400) }
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
  scenario: { id: string; title: string; sellerInstructions?: string }
  persona: { id: string; name: string; negotiatorType?: string }
  template: Template
  mediaMode: 'text' | 'voice'
  judgeSource: string
  judgment: Judgment
  messages: ChatMessage[]
  completedAt: Date
}) {
  const rubric = evaluateRubric(input.template, input.judgment)
  const traineeMessages = input.messages.filter((message) => message.role === 'user')
  const criteriaById = new Map(flattenCriteria(input.template).map((criterion) => [criterion.id, criterion]))
  const lastTraineeMessage = traineeMessages[traineeMessages.length - 1] ?? null
  // The trainee message that matches each criterion's keywords: the evidence shown and the coaching anchor.
  const matched = new Map(rubric.criteria.map((item) => [item.id, matchingMessage(criteriaById.get(item.id), traineeMessages)]))
  const withEvidence = <C extends { id: string }>(item: C) => ({
    ...item,
    evidence: evidenceOf(matched.get(item.id) ?? lastTraineeMessage),
  })
  const criteria = rubric.criteria.map(withEvidence)
  const sections = rubric.sections.map((section) => ({ ...section, criteria: section.criteria.map(withEvidence) }))
  const passed = criteria.filter((item) => item.passed)
  const failed = criteria.filter((item) => !item.passed)
  const communication = communicationMetrics(input.messages)
  const feedback = cleanFeedback(input.judgment.feedback)

  /** A criterion line, with the trainee's own words only when they really match the criterion. */
  function criterionLine(criterion: (typeof criteria)[number], text: string) {
    const quote = matched.get(criterion.id)?.text.trim().slice(0, 180)
    return quote ? `${text} Sua fala: “${quote}”` : text
  }

  // Without the AI's own feedback, the call's measured habits make the lists specific to this conversation.
  const habits = communicationNotes(communication)

  const positives = feedback?.strengths.length
    ? feedback.strengths
    : [
        ...passed.map((item) => criterionLine(item, item.rationale || item.name)),
        ...habits.good,
      ]
  const negatives = feedback?.improvements.length
    ? feedback.improvements
    : [
        ...failed.map((item) => criterionLine(item, item.rationale || item.yesNoQuestion || item.name)),
        ...habits.bad,
      ]

  const strengths = feedback?.strengths.length
    ? feedback.strengths
    : passed.length
      ? passed.map((item) => item.name)
      : ['Manteve a simulação até o final']
  const improvements = feedback?.improvements.length
    ? feedback.improvements
    : failed.length
      ? failed.map((item) => item.yesNoQuestion || item.name)
      : ['Aprofundar perguntas de diagnóstico na próxima rodada']

  // Each failed criterion links to the trainee message that relates to it; none when nothing relates.
  const coachFeedback = failed.slice(0, 6).map((criterion) => {
    const message = matched.get(criterion.id) ?? null
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

  const nextSteps = failed.length
    ? [
        `Refazer o cenário focando em: ${failed[0].yesNoQuestion || failed[0].name}`,
        'Revisar o playbook e as perguntas sim/não que falharam.',
        `Praticar abertura e próximo passo com ${input.persona.name}.`,
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
    sections,
    criteria,
    communication,
    summary: feedback?.summary ?? '',
    positives: positives.length ? positives : ['Manteve a simulação até o final'],
    negatives,
    suggestions: failed.map((item) => item.yesNoQuestion || item.name),
    sellerInstructions:
      typeof input.scenario.sellerInstructions === 'string' ? input.scenario.sellerInstructions : '',
    negotiatorType: typeof input.persona.negotiatorType === 'string' ? input.persona.negotiatorType : '',
    strengths,
    improvements,
    coachNotes: feedback?.summary || coachNotes(rubric.score),
    coachFeedback,
    nextSteps,
    completedAt: input.completedAt.toISOString(),
  }
}

const FEEDBACK_ITEMS = 4
const FEEDBACK_CHARS = 300

/** The AI's feedback, trimmed to what the report shows. Null when it has nothing usable. */
export function cleanFeedback(raw: unknown): JudgeFeedback | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const text = (item: unknown) => (typeof item === 'string' ? item.trim().slice(0, FEEDBACK_CHARS) : '')
  const list = (items: unknown) =>
    Array.isArray(items) ? items.map(text).filter(Boolean).slice(0, FEEDBACK_ITEMS) : []
  const feedback = { summary: text(value.summary), strengths: list(value.strengths), improvements: list(value.improvements) }
  return feedback.summary || feedback.strengths.length || feedback.improvements.length ? feedback : null
}

/** Talk share, pace, monologue and filler words of this call, as report lines. */
function communicationNotes(metrics: ReturnType<typeof communicationMetrics>) {
  const good: string[] = []
  const bad: string[] = []
  if (metrics.talkListenStatus === 'Ideal') good.push(`Equilibrou fala e escuta: falou ${metrics.talkListenPct}% do tempo.`)
  else if (metrics.talkListenPct > 50) bad.push(`Falou ${metrics.talkListenPct}% do tempo; o ideal é 40–50%. Faça mais perguntas e escute.`)
  else if (metrics.talkListenPct > 0) bad.push(`Falou só ${metrics.talkListenPct}% do tempo; o ideal é 40–50%. Conduza mais a conversa.`)
  if (metrics.fillersStatus !== 'Bom') bad.push(`Usou ${metrics.fillersPerMinute} vícios de linguagem por minuto (“né”, “tipo”…); o ideal é menos de 2.`)
  return { good, bad }
}
