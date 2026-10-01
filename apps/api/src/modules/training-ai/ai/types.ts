import type { ChatMessage, Judgment, Template } from '../rubric.js'

/** Catalog documents are stored as JSON; providers read only the fields they know. */
export type PersonaProfile = Record<string, unknown> & { id: string; name: string }
export type ScenarioProfile = Record<string, unknown> & { id: string; title: string }

export type ReplyRequest = {
  persona: PersonaProfile
  scenario: ScenarioProfile
  /** Transcript so far, ending with the trainee message being answered. */
  history: ChatMessage[]
  /** Trainee messages sent before this one (0 for the first). */
  exchangeIndex: number
  mediaMode: 'text' | 'voice'
}

export type JudgeRequest = {
  template: Template
  persona: PersonaProfile
  scenario: ScenarioProfile
  messages: ChatMessage[]
}

export interface AiProvider {
  readonly id: string
  readonly label: string
  /** The persona's next line. */
  reply(request: ReplyRequest): Promise<{ text: string }>
  /** One verdict per playbook criterion, based only on what the trainee said. */
  judge(request: JudgeRequest): Promise<Judgment>
}

export type ProviderStatus = { provider: string; label: string; ready: boolean; reason: string | null }
