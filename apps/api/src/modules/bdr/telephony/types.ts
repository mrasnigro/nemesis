export type DialOutcome =
  | 'answered'
  | 'busy'
  | 'no_answer'
  | 'voicemail'
  | 'failed'
  | 'cancelled'
  | 'abandoned'

export type LiveState = 'ringing' | 'talking' | 'gone'

export type DialTarget = {
  attemptId: string
  /** National digits, see normalizePhone. */
  phone: string
  extension: string
  startedAt: Date
  endedAt?: Date | null
  providerCallId: string | null
}

export type LiveStatus = {
  state: LiveState
  providerCallId?: string | null
}

export interface TelephonyProvider {
  readonly name: string
  readonly supportsRecording: boolean
  /** Rings the lead first; the operator extension rings only after the lead answers. */
  originate(target: DialTarget): Promise<void>
  liveState(target: DialTarget): Promise<LiveStatus>
  hangup(target: DialTarget): Promise<void>
  /** Provider classification of a call that ended without being seen as talking. */
  finalOutcome(target: DialTarget): Promise<DialOutcome | null>
  fetchRecording(target: DialTarget): Promise<Buffer | null>
}
