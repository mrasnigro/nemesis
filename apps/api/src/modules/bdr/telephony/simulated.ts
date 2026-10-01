import type { DialOutcome, DialTarget, LiveStatus, TelephonyProvider } from './types.js'

/** Development-only stand-in for a PABX; never selectable in production. */
type Plan = { outcome: DialOutcome; ringMs: number; hungUp: boolean; answeredAt: number | null }

const OUTCOME_WEIGHTS: [DialOutcome, number][] = [
  ['answered', 40],
  ['no_answer', 30],
  ['busy', 20],
  ['failed', 10],
]

const plans = new Map<string, Plan>()

function pickOutcome(): DialOutcome {
  const total = OUTCOME_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = Math.random() * total
  for (const [outcome, weight] of OUTCOME_WEIGHTS) {
    roll -= weight
    if (roll <= 0) return outcome
  }
  return 'no_answer'
}

function planFor(target: DialTarget): Plan {
  let plan = plans.get(target.attemptId)
  if (!plan) {
    const outcome = pickOutcome()
    plan = { outcome, ringMs: outcome === 'busy' ? 2_000 : 3_000 + Math.random() * 5_000, hungUp: false, answeredAt: null }
    plans.set(target.attemptId, plan)
  }
  return plan
}

export const simulatedProvider: TelephonyProvider = {
  name: 'simulated',
  supportsRecording: false,

  async originate(target) {
    planFor(target)
  },

  async liveState(target): Promise<LiveStatus> {
    const plan = planFor(target)
    if (plan.hungUp) return { state: 'gone' }
    const elapsed = Date.now() - target.startedAt.getTime()
    if (elapsed < plan.ringMs) return { state: 'ringing', providerCallId: `sim-${target.attemptId}` }
    if (plan.outcome !== 'answered') return { state: 'gone' }
    plan.answeredAt ??= Date.now()
    return { state: 'talking', providerCallId: `sim-${target.attemptId}` }
  },

  async hangup(target) {
    planFor(target).hungUp = true
  },

  async finalOutcome(target) {
    const plan = planFor(target)
    plans.delete(target.attemptId)
    if (plan.hungUp && plan.answeredAt == null) return 'cancelled'
    return plan.outcome
  },

  async fetchRecording() {
    return null
  },
}
