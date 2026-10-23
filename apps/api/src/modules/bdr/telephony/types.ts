export type DialOutcome =
  | 'answered'
  | 'busy'
  | 'no_answer'
  | 'voicemail'
  | 'invalid'
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
  wasAnswered?: boolean
  /** When set, the second leg is this external number instead of an operator extension. */
  connectPhone?: string | null
}

export type LiveStatus = {
  state: LiveState
  providerCallId?: string | null
  /**
   * When the current ringing leg started. Absent means the attempt start.
   * The operator leg reports its own start so its ring timeout is not eaten by the lead's ring.
   */
  ringingSince?: string
}

export type CallRecording = {
  audio: Buffer
  format: 'mp3' | 'wav'
}

export interface TelephonyProvider {
  readonly name: string
  readonly supportsRecording: boolean
  /** Rings the lead first; the operator extension rings only after the lead answers. */
  originate(target: DialTarget): Promise<void>
  liveState(target: DialTarget): Promise<LiveStatus>
  hangup(target: DialTarget): Promise<void>
  /** Move a connected call from the current operator endpoint to another extension. */
  transfer?(target: DialTarget, extension: string): Promise<void>
  /** Keep the ARI event socket open so inbound trunk calls are accepted. */
  listen?(): Promise<void>
  /** Provider classification of a call that ended without being seen as talking. */
  finalOutcome(target: DialTarget): Promise<DialOutcome | null>
  fetchRecording(target: DialTarget): Promise<CallRecording | null>
  recoverActive?(): Promise<void>
}
