export class BdrApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Errors that stop the automatic loop until the operator acts. */
export const BLOCKING_DIAL_ERRORS = new Set([
  'QUEUE_EMPTY',
  'TELEPHONY_NOT_CONFIGURED',
  'NO_EXTENSION',
  'CAMPAIGN_PAUSED',
  'NO_CAMPAIGN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
])
