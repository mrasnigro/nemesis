import type { RowDataPacket } from 'mysql2'
import { config } from '../../../core/config.js'
import { pool } from '../../../core/db.js'
import { AppError } from '../../../core/errors.js'
import { createFaleVonoProvider } from './falevono.js'
import { decryptSecret, encryptSecret } from './secrets.js'
import { simulatedProvider } from './simulated.js'
import type { TelephonyProvider } from './types.js'

export type ProviderName = 'none' | 'simulated' | 'falevono'

export type TelephonySettings = {
  provider: ProviderName
  baseUrl: string | null
  hasCredentials: boolean
  deviceId: string | null
  dialPrefix: string
  ringTimeoutSeconds: number
  maxAttempts: number
  retryBusyMinutes: number
  retryNoAnswerMinutes: number
  retryVoicemailMinutes: number
}

type StoredSettings = TelephonySettings & { apiTokenEnc: string | null; apiKeyEnc: string | null }

const DEFAULTS = {
  baseUrl: null,
  deviceId: null,
  dialPrefix: '0',
  ringTimeoutSeconds: 30,
  maxAttempts: 3,
  retryBusyMinutes: 30,
  retryNoAnswerMinutes: 120,
  retryVoicemailMinutes: 240,
}

async function loadStored(customerId: string): Promise<StoredSettings> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM bdr_telephony_settings WHERE customer_id = :customerId LIMIT 1',
    { customerId },
  )
  const row = rows[0]
  if (!row) {
    return {
      ...DEFAULTS,
      provider: config.TELEPHONY_DEFAULT_PROVIDER,
      hasCredentials: false,
      apiTokenEnc: null,
      apiKeyEnc: null,
    }
  }
  return {
    provider: String(row.provider) as ProviderName,
    baseUrl: row.base_url == null ? null : String(row.base_url),
    deviceId: row.device_id == null ? null : String(row.device_id),
    dialPrefix: String(row.dial_prefix ?? '0'),
    ringTimeoutSeconds: Number(row.ring_timeout_seconds),
    maxAttempts: Number(row.max_attempts),
    retryBusyMinutes: Number(row.retry_busy_minutes),
    retryNoAnswerMinutes: Number(row.retry_no_answer_minutes),
    retryVoicemailMinutes: Number(row.retry_voicemail_minutes),
    hasCredentials: Boolean(row.api_token_enc && row.api_key_enc),
    apiTokenEnc: row.api_token_enc == null ? null : String(row.api_token_enc),
    apiKeyEnc: row.api_key_enc == null ? null : String(row.api_key_enc),
  }
}

export async function getTelephonySettings(customerId: string): Promise<TelephonySettings> {
  const { apiTokenEnc: _token, apiKeyEnc: _key, ...settings } = await loadStored(customerId)
  return settings
}

export type TelephonySettingsInput = Partial<Omit<TelephonySettings, 'hasCredentials'>> & {
  apiToken?: string
  apiKey?: string
}

export async function saveTelephonySettings(customerId: string, input: TelephonySettingsInput) {
  const current = await loadStored(customerId)
  const next = { ...current, ...input }
  if (next.provider === 'simulated' && !config.allowSimulatedTelephony) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The simulated provider is disabled in production')
  }
  const apiTokenEnc = input.apiToken ? encryptSecret(input.apiToken) : current.apiTokenEnc
  const apiKeyEnc = input.apiKey ? encryptSecret(input.apiKey) : current.apiKeyEnc
  await pool.query(
    `INSERT INTO bdr_telephony_settings
      (customer_id, provider, base_url, api_token_enc, api_key_enc, device_id, dial_prefix,
       ring_timeout_seconds, max_attempts, retry_busy_minutes, retry_no_answer_minutes, retry_voicemail_minutes, updated_at)
     VALUES
      (:customerId, :provider, :baseUrl, :apiTokenEnc, :apiKeyEnc, :deviceId, :dialPrefix,
       :ringTimeoutSeconds, :maxAttempts, :retryBusyMinutes, :retryNoAnswerMinutes, :retryVoicemailMinutes, :now)
     ON DUPLICATE KEY UPDATE
       provider = VALUES(provider), base_url = VALUES(base_url), api_token_enc = VALUES(api_token_enc),
       api_key_enc = VALUES(api_key_enc), device_id = VALUES(device_id), dial_prefix = VALUES(dial_prefix),
       ring_timeout_seconds = VALUES(ring_timeout_seconds), max_attempts = VALUES(max_attempts),
       retry_busy_minutes = VALUES(retry_busy_minutes), retry_no_answer_minutes = VALUES(retry_no_answer_minutes),
       retry_voicemail_minutes = VALUES(retry_voicemail_minutes), updated_at = VALUES(updated_at)`,
    {
      customerId,
      provider: next.provider,
      baseUrl: next.baseUrl,
      apiTokenEnc,
      apiKeyEnc,
      deviceId: next.deviceId,
      dialPrefix: next.dialPrefix,
      ringTimeoutSeconds: next.ringTimeoutSeconds,
      maxAttempts: next.maxAttempts,
      retryBusyMinutes: next.retryBusyMinutes,
      retryNoAnswerMinutes: next.retryNoAnswerMinutes,
      retryVoicemailMinutes: next.retryVoicemailMinutes,
      now: new Date(),
    },
  )
  return getTelephonySettings(customerId)
}

/** Null when the customer has no usable telephony configuration. */
export async function resolveProvider(customerId: string): Promise<TelephonyProvider | null> {
  const stored = await loadStored(customerId)
  if (stored.provider === 'simulated') {
    return config.allowSimulatedTelephony ? simulatedProvider : null
  }
  if (stored.provider === 'falevono') {
    if (!stored.apiTokenEnc || !stored.apiKeyEnc || !stored.deviceId) return null
    return createFaleVonoProvider({
      baseUrl: stored.baseUrl || 'https://vono.me',
      apiToken: decryptSecret(stored.apiTokenEnc),
      apiKey: decryptSecret(stored.apiKeyEnc),
      deviceId: stored.deviceId,
      dialPrefix: stored.dialPrefix,
    })
  }
  return null
}

export async function getOperatorExtension(userId: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT extension FROM bdr_operator_extensions WHERE user_id = :userId LIMIT 1',
    { userId },
  )
  return rows[0] ? String(rows[0].extension) : null
}

export async function setOperatorExtension(customerId: string, userId: string, extension: string) {
  await pool.query(
    `INSERT INTO bdr_operator_extensions (user_id, customer_id, extension, updated_at)
     VALUES (:userId, :customerId, :extension, :now)
     ON DUPLICATE KEY UPDATE extension = VALUES(extension), customer_id = VALUES(customer_id), updated_at = VALUES(updated_at)`,
    { userId, customerId, extension, now: new Date() },
  )
}
