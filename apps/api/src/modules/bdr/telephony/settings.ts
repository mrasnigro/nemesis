import type { RowDataPacket } from 'mysql2'
import { config } from '../../../core/config.js'
import { pool } from '../../../core/db.js'
import { AppError } from '../../../core/errors.js'
import { asteriskProviderConfigured, createAsteriskProvider } from './asterisk.js'
import { createFaleVonoProvider } from './falevono.js'
import { decryptSecret, encryptSecret } from './secrets.js'
import { simulatedProvider } from './simulated.js'
import type { TelephonyProvider } from './types.js'

export type ProviderName = 'none' | 'simulated' | 'falevono' | 'asterisk'

export type TelephonySettings = {
  provider: ProviderName
  baseUrl: string | null
  hasCredentials: boolean
  deviceId: string | null
  ariUrl: string | null
  ariUsername: string | null
  trunkEndpoint: string | null
  webrtcWssUrl: string | null
  sipDomain: string | null
  amdEnabled: boolean
  callingStart: string | null
  callingEnd: string | null
  callingDays: string
  inboundExtension: string | null
  recordCalls: boolean
  callerId: string | null
  maxChannels: number
  dialPrefix: string
  ringTimeoutSeconds: number
  maxAttempts: number
  retryBusyMinutes: number
  retryNoAnswerMinutes: number
  retryVoicemailMinutes: number
}

type StoredSettings = TelephonySettings & {
  apiTokenEnc: string | null
  apiKeyEnc: string | null
  ariPasswordEnc: string | null
}

const DEFAULTS = {
  baseUrl: null,
  deviceId: null,
  ariUrl: null,
  ariUsername: null,
  trunkEndpoint: null,
  webrtcWssUrl: null,
  sipDomain: null,
  amdEnabled: false,
  callingStart: null,
  callingEnd: null,
  callingDays: '1,2,3,4,5',
  inboundExtension: null,
  recordCalls: true,
  callerId: null,
  maxChannels: 5,
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
      ariPasswordEnc: null,
    }
  }
  const apiTokenEnc = row.api_token_enc == null ? null : String(row.api_token_enc)
  const apiKeyEnc = row.api_key_enc == null ? null : String(row.api_key_enc)
  const ariPasswordEnc = row.ari_password_enc == null ? null : String(row.ari_password_enc)
  const provider = String(row.provider) as ProviderName
  return {
    provider,
    baseUrl: row.base_url == null ? null : String(row.base_url),
    deviceId: row.device_id == null ? null : String(row.device_id),
    ariUrl: row.ari_url == null ? null : String(row.ari_url),
    ariUsername: row.ari_username == null ? null : String(row.ari_username),
    trunkEndpoint: row.trunk_endpoint == null ? null : String(row.trunk_endpoint),
    webrtcWssUrl: row.webrtc_wss_url == null ? null : String(row.webrtc_wss_url),
    sipDomain: row.sip_domain == null ? null : String(row.sip_domain),
    amdEnabled: Boolean(row.amd_enabled),
    callingStart: clock(row.calling_start),
    callingEnd: clock(row.calling_end),
    callingDays: String(row.calling_days ?? '1,2,3,4,5'),
    inboundExtension: row.inbound_extension == null ? null : String(row.inbound_extension),
    recordCalls: row.record_calls == null ? true : Boolean(row.record_calls),
    callerId: row.caller_id == null ? null : String(row.caller_id),
    maxChannels: Number(row.max_channels ?? 5),
    dialPrefix: String(row.dial_prefix ?? '0'),
    ringTimeoutSeconds: Number(row.ring_timeout_seconds),
    maxAttempts: Number(row.max_attempts),
    retryBusyMinutes: Number(row.retry_busy_minutes),
    retryNoAnswerMinutes: Number(row.retry_no_answer_minutes),
    retryVoicemailMinutes: Number(row.retry_voicemail_minutes),
    hasCredentials: provider === 'asterisk' ? Boolean(ariPasswordEnc) : Boolean(apiTokenEnc && apiKeyEnc),
    apiTokenEnc,
    apiKeyEnc,
    ariPasswordEnc,
  }
}

export async function getTelephonySettings(customerId: string): Promise<TelephonySettings> {
  const { apiTokenEnc: _token, apiKeyEnc: _key, ariPasswordEnc: _password, ...settings } = await loadStored(customerId)
  return settings
}

export type TelephonySettingsInput = Partial<Omit<TelephonySettings, 'hasCredentials'>> & {
  apiToken?: string
  apiKey?: string
  ariPassword?: string
}

function clock(value: unknown) {
  if (value == null) return null
  const match = String(value).match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : null
}

export async function saveTelephonySettings(customerId: string, input: TelephonySettingsInput) {
  const current = await loadStored(customerId)
  const definedInput = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as TelephonySettingsInput
  const next = { ...current, ...definedInput }
  if (Boolean(next.callingStart) !== Boolean(next.callingEnd)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Informe o início e o fim do horário de ligações')
  }
  if (next.callingStart && !/^[1-7](,[1-7])*$/.test(next.callingDays)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Informe ao menos um dia permitido para ligações')
  }
  if (!next.inboundExtension) next.inboundExtension = null
  if (next.provider === 'simulated' && !config.allowSimulatedTelephony) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The simulated provider is disabled in production')
  }
  const apiTokenEnc = input.apiToken ? encryptSecret(input.apiToken) : current.apiTokenEnc
  const apiKeyEnc = input.apiKey ? encryptSecret(input.apiKey) : current.apiKeyEnc
  const ariPasswordEnc = input.ariPassword ? encryptSecret(input.ariPassword) : current.ariPasswordEnc
  await pool.query(
    `INSERT INTO bdr_telephony_settings
      (customer_id, provider, base_url, api_token_enc, api_key_enc, device_id, ari_url, ari_username,
        ari_password_enc, trunk_endpoint, caller_id, max_channels, webrtc_wss_url, sip_domain, amd_enabled,
        calling_start, calling_end, calling_days, inbound_extension, record_calls, dial_prefix,
       ring_timeout_seconds, max_attempts, retry_busy_minutes, retry_no_answer_minutes, retry_voicemail_minutes, updated_at)
     VALUES
      (:customerId, :provider, :baseUrl, :apiTokenEnc, :apiKeyEnc, :deviceId, :ariUrl, :ariUsername,
        :ariPasswordEnc, :trunkEndpoint, :callerId, :maxChannels, :webrtcWssUrl, :sipDomain, :amdEnabled,
        :callingStart, :callingEnd, :callingDays, :inboundExtension, :recordCalls, :dialPrefix,
       :ringTimeoutSeconds, :maxAttempts, :retryBusyMinutes, :retryNoAnswerMinutes, :retryVoicemailMinutes, :now)
     ON DUPLICATE KEY UPDATE
       provider = VALUES(provider), base_url = VALUES(base_url), api_token_enc = VALUES(api_token_enc),
       api_key_enc = VALUES(api_key_enc), device_id = VALUES(device_id), ari_url = VALUES(ari_url),
       ari_username = VALUES(ari_username), ari_password_enc = VALUES(ari_password_enc),
       trunk_endpoint = VALUES(trunk_endpoint), caller_id = VALUES(caller_id), max_channels = VALUES(max_channels),
       webrtc_wss_url = VALUES(webrtc_wss_url), sip_domain = VALUES(sip_domain),
       amd_enabled = VALUES(amd_enabled),
       calling_start = VALUES(calling_start), calling_end = VALUES(calling_end), calling_days = VALUES(calling_days),
       inbound_extension = VALUES(inbound_extension), record_calls = VALUES(record_calls),
       dial_prefix = VALUES(dial_prefix),
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
      ariUrl: next.ariUrl,
      ariUsername: next.ariUsername,
      ariPasswordEnc,
      trunkEndpoint: next.trunkEndpoint,
      webrtcWssUrl: next.webrtcWssUrl,
      sipDomain: next.sipDomain,
      amdEnabled: next.amdEnabled,
      callingStart: next.callingStart,
      callingEnd: next.callingEnd,
      callingDays: next.callingDays,
      inboundExtension: next.inboundExtension,
      recordCalls: next.recordCalls ? 1 : 0,
      callerId: next.callerId,
      maxChannels: next.maxChannels,
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
  if (stored.provider === 'asterisk') {
    const password = stored.ariPasswordEnc ? decryptSecret(stored.ariPasswordEnc) : undefined
    const options = {
      baseUrl: stored.ariUrl ?? undefined,
      username: stored.ariUsername ?? undefined,
      password,
      trunkEndpoint: stored.trunkEndpoint ?? undefined,
    }
    if (!asteriskProviderConfigured(options)) return null
    return createAsteriskProvider({
      customerId,
      baseUrl: options.baseUrl,
      username: options.username,
      password: options.password,
      app: config.ASTERISK_ARI_APP,
      trunkEndpoint: options.trunkEndpoint,
      dialPrefix: stored.dialPrefix,
      callerId: stored.callerId,
      maxChannels: stored.maxChannels,
      amdEnabled: stored.amdEnabled,
      inboundExtension: stored.inboundExtension,
      recordCalls: stored.recordCalls,
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

export async function setOperatorExtension(
  customerId: string,
  userId: string,
  extension: string,
  sipPassword?: string,
) {
  const sipPasswordEnc = sipPassword ? encryptSecret(sipPassword) : null
  await pool.query(
    `INSERT INTO bdr_operator_extensions (user_id, customer_id, extension, sip_password_enc, updated_at)
     VALUES (:userId, :customerId, :extension, :sipPasswordEnc, :now)
     ON DUPLICATE KEY UPDATE extension = VALUES(extension), customer_id = VALUES(customer_id),
       sip_password_enc = COALESCE(VALUES(sip_password_enc), sip_password_enc), updated_at = VALUES(updated_at)`,
    { userId, customerId, extension, sipPasswordEnc, now: new Date() },
  )
}

export async function hasOperatorSipCredentials(customerId: string, userId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sip_password_enc FROM bdr_operator_extensions
     WHERE customer_id = :customerId AND user_id = :userId LIMIT 1`,
    { customerId, userId },
  )
  return Boolean(rows[0]?.sip_password_enc)
}

/** Returns SIP credentials only to the authenticated owner of the registered operator extension. */
export async function getOperatorWebRtcConfig(customerId: string, userId: string) {
  const settings = await loadStored(customerId)
  if (settings.provider !== 'asterisk' || !settings.webrtcWssUrl || !settings.sipDomain) {
    throw new AppError(409, 'WEBRTC_NOT_CONFIGURED', 'Asterisk WebRTC is not configured for this customer')
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT extension, sip_password_enc FROM bdr_operator_extensions
     WHERE customer_id = :customerId AND user_id = :userId LIMIT 1`,
    { customerId, userId },
  )
  const row = rows[0]
  if (!row?.extension || !row.sip_password_enc) {
    throw new AppError(409, 'WEBRTC_CREDENTIALS_MISSING', 'Save your extension and SIP password before connecting')
  }
  const extension = String(row.extension)
  return {
    server: settings.webrtcWssUrl,
    domain: settings.sipDomain,
    extension,
    password: decryptSecret(String(row.sip_password_enc)),
  }
}
