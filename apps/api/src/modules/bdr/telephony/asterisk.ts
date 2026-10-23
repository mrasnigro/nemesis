import { createHash } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { ulid } from 'ulid'
import WebSocket, { type ClientOptions } from 'ws'
import { AppError } from '../../../core/errors.js'
import { pool } from '../../../core/db.js'
import { normalizePhone } from './phone.js'
import type { CallRecording, DialOutcome, DialTarget, LiveStatus, TelephonyProvider } from './types.js'

/** Dialplan context that runs AMD and returns the channel to this Stasis app. */
export const ASTERISK_AMD_CONTEXT = 'imp-bdr-amd'

export type AsteriskOptions = {
  customerId: string
  baseUrl: string
  username: string
  password: string
  app: string
  trunkEndpoint: string
  dialPrefix: string
  callerId: string | null
  maxChannels: number
  amdEnabled?: boolean
  inboundExtension?: string | null
  recordCalls?: boolean
  fetchImpl?: typeof fetch
  socketFactory?: (url: string, options: ClientOptions) => WebSocket
  leaseStore?: AsteriskLeaseStore
  inboundStore?: InboundStore
}

type AriChannel = { id: string; state?: string }
type AriBridge = { id: string; channels?: string[] }
type AriLiveRecording = { name: string; state?: string }
type AriEvent = {
  type?: string
  application?: string
  args?: string[]
  channel?: { id?: string; caller?: { number?: string } }
  cause?: number
}
type AttemptSession = {
  attemptId: string
  customerId: string
  externalChannelId: string | null
  operatorChannelId: string | null
  bridgeId: string | null
  stage: 'originating' | 'amd' | 'agent_ringing' | 'talking' | 'ended' | 'failed'
  outcome: DialOutcome | null
  extension: string
  externalStarted: boolean
  operatorStarted: boolean
  operatorJoined: boolean
  amdStarted: boolean
  amdCompleted: boolean
  ignoredChannels: Set<string>
  operatorViaTrunk: boolean
  direction: 'outbound' | 'inbound'
  /** When the operator or second external leg started ringing. */
  localRingStartedAt: number | null
}

export type InboundCallUpdate = {
  attemptId: string
  customerId: string
  phone: string
  extension: string
  providerCallId: string
}

export type InboundStore = {
  opened(call: InboundCallUpdate): Promise<void>
  answered(customerId: string, attemptId: string, extension: string): Promise<void>
  ended(customerId: string, attemptId: string, outcome: DialOutcome): Promise<void>
}
type AriSession = {
  socket: WebSocket | null
  connecting: Promise<void> | null
  recovery: Promise<void> | null
  calls: Map<string, AttemptSession>
}

export type AsteriskLease = {
  customerId: string
  attemptId: string
  trunkKey: string
  phone: string
  extension: string
  startedAt: Date
  wasAnswered: boolean
  providerCallId: string | null
}

export type AsteriskLeaseStore = {
  acquire(customerId: string, attemptId: string, trunkKey: string, maxChannels: number, slots?: number): Promise<boolean>
  release(customerId: string, attemptId: string): Promise<void>
  list(customerId: string): Promise<AsteriskLease[]>
}

type LeaseRow = RowDataPacket & {
  customer_id: string
  attempt_id: string
  trunk_key: string
  phone: string
  operator_extension: string
  started_at: Date | string
  status: string
  provider_call_id: string | null
}

const databaseLeaseStore: AsteriskLeaseStore = {
  async acquire(customerId, attemptId, trunkKey, maxChannels, slots = 1) {
    const connection = await pool.getConnection()
    const lockName = `bdr:${trunkKey.slice(0, 59)}`
    let lockAcquired = false
    let transactionStarted = false
    try {
      const [lockRows] = await connection.query<(RowDataPacket & { lock_acquired: number | null })[]>(
        'SELECT GET_LOCK(:lockName, 10) AS lock_acquired',
        { lockName },
      )
      lockAcquired = Number(lockRows[0]?.lock_acquired) === 1
      if (!lockAcquired) throw new AppError(503, 'TELEPHONY_LIMIT_LOCK_TIMEOUT', 'Could not reserve an Asterisk channel')

      await connection.beginTransaction()
      transactionStarted = true
      const [counts] = await connection.query<(RowDataPacket & { active: number | string })[]>(
        'SELECT COALESCE(SUM(slots), 0) AS active FROM bdr_asterisk_channel_leases WHERE trunk_key = :trunkKey',
        { trunkKey },
      )
      if (Number(counts[0]?.active ?? 0) + slots > maxChannels) {
        await connection.rollback()
        return false
      }
      await connection.query(
        `INSERT INTO bdr_asterisk_channel_leases (customer_id, attempt_id, trunk_key, slots, acquired_at)
         VALUES (:customerId, :attemptId, :trunkKey, :slots, :acquiredAt)`,
        { customerId, attemptId, trunkKey, slots, acquiredAt: new Date() },
      )
      await connection.commit()
      transactionStarted = false
      return true
    } catch (error) {
      if (transactionStarted) await connection.rollback()
      throw error
    } finally {
      try {
        if (lockAcquired) {
          await connection.query('SELECT RELEASE_LOCK(:lockName)', { lockName })
        }
      } finally {
        connection.release()
      }
    }
  },

  async release(customerId, attemptId) {
    await pool.query(
      'DELETE FROM bdr_asterisk_channel_leases WHERE customer_id = :customerId AND attempt_id = :attemptId',
      { customerId, attemptId },
    )
  },

  async list(customerId) {
    const [rows] = await pool.query<LeaseRow[]>(
      `SELECT l.customer_id, l.attempt_id, l.trunk_key, a.phone, a.operator_extension, a.started_at, a.status, a.provider_call_id
       FROM bdr_asterisk_channel_leases l
       JOIN bdr_dial_attempts a ON a.id = l.attempt_id
       WHERE l.customer_id = :customerId AND a.status IN ('ringing', 'answered')`,
      { customerId },
    )
    return rows.map((row) => ({
      customerId: String(row.customer_id),
      attemptId: String(row.attempt_id),
      trunkKey: String(row.trunk_key),
      phone: String(row.phone),
      extension: String(row.operator_extension),
      startedAt: new Date(row.started_at),
      wasAnswered: row.status === 'answered',
      providerCallId: row.provider_call_id == null ? null : String(row.provider_call_id),
    }))
  },
}

const databaseInboundStore: InboundStore = {
  async opened(call) {
    const now = new Date()
    await pool.query(
      `INSERT INTO bdr_dial_attempts
        (id, customer_id, user_id, phone, operator_extension, provider, direction, provider_call_id, status, started_at, created_at, updated_at)
       VALUES
        (:id, :customerId, NULL, :phone, :extension, 'asterisk', 'inbound', :providerCallId, 'ringing', :now, :now, :now)`,
      {
        id: call.attemptId,
        customerId: call.customerId,
        phone: call.phone,
        extension: call.extension,
        providerCallId: call.providerCallId,
        now,
      },
    )
  },

  async answered(customerId, attemptId, extension) {
    const now = new Date()
    await pool.query(
      `UPDATE bdr_dial_attempts
       SET status = 'answered', answered_at = :now, operator_extension = :extension, updated_at = :now,
           user_id = (
             SELECT matched.user_id FROM (
               SELECT user_id FROM bdr_operator_extensions
               WHERE customer_id = :customerId AND extension = :extension
               LIMIT 1
             ) matched
           )
       WHERE customer_id = :customerId AND id = :attemptId AND direction = 'inbound' AND status = 'ringing'`,
      { customerId, attemptId, extension, now },
    )
  },

  async ended(customerId, attemptId, outcome) {
    const now = new Date()
    await pool.query(
      `UPDATE bdr_dial_attempts
       SET status = 'ended', outcome = :outcome, ended_at = COALESCE(ended_at, :now), updated_at = :now
       WHERE customer_id = :customerId AND id = :attemptId AND direction = 'inbound' AND status <> 'ended'`,
      { customerId, attemptId, outcome, now },
    )
  },
}

const sessions = new Map<string, AriSession>()
const REQUEST_TIMEOUT_MS = 10_000
const SOCKET_TIMEOUT_MS = 10_000
const INVALID_NUMBER_CAUSES = new Set([1, 3, 22, 28])

function sessionKey(options: AsteriskOptions) {
  return createHash('sha256')
    .update([options.baseUrl, options.username, options.password, options.app, options.trunkEndpoint].join('\0'))
    .digest('hex')
}

export function asteriskProviderConfigured(
  options: Partial<Pick<AsteriskOptions, 'baseUrl' | 'username' | 'password' | 'trunkEndpoint'>>,
): options is Pick<AsteriskOptions, 'baseUrl' | 'username' | 'password' | 'trunkEndpoint'> {
  return Boolean(options.baseUrl && options.username && options.password && options.trunkEndpoint)
}

function channelOutcome(cause: number | undefined, wasTalking: boolean): DialOutcome {
  if (!wasTalking && cause != null && INVALID_NUMBER_CAUSES.has(cause)) return 'invalid'
  if (cause === 17) return 'busy'
  if (cause === 18 || cause === 19) return 'no_answer'
  if (cause === 16) return wasTalking ? 'abandoned' : 'no_answer'
  return 'failed'
}

function callerNumber(value: string | undefined) {
  const raw = String(value ?? '')
  return normalizePhone(raw) ?? raw.replace(/\D/g, '').replace(/^0+/, '').slice(-20)
}

function base64Auth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

function getSession(options: AsteriskOptions): AriSession {
  const key = sessionKey(options)
  let session = sessions.get(key)
  if (!session) {
    session = { socket: null, connecting: null, recovery: null, calls: new Map() }
    sessions.set(key, session)
  }
  return session
}

export function createAsteriskProvider(options: AsteriskOptions): TelephonyProvider {
  const base = options.baseUrl.replace(/\/+$/, '')
  const doFetch = options.fetchImpl ?? fetch
  const socketFactory = options.socketFactory ?? ((url, clientOptions) => new WebSocket(url, clientOptions))
  const leaseStore = options.leaseStore ?? databaseLeaseStore
  const inboundStore = options.inboundStore ?? databaseInboundStore
  const recordCalls = options.recordCalls !== false
  const session = getSession(options)
  const trunkKey = createHash('sha256').update(`${base}\0${options.trunkEndpoint}`).digest('hex')
  const authorization = base64Auth(options.username, options.password)

  async function request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    let response: Response
    try {
      response = await doFetch(`${base}${endpoint}`, {
        method,
        headers: {
          Authorization: authorization,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new AppError(502, 'ASTERISK_UNREACHABLE', `Asterisk ARI did not respond: ${String(error)}`)
    }
    const text = await response.text()
    let payload: unknown = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = text
      }
    }
    if (!response.ok) {
      const detail =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String(payload.message)
          : `HTTP ${response.status}`
      throw new AppError(
        502,
        response.status === 404
          ? 'ASTERISK_NOT_FOUND'
          : response.status === 409
            ? 'ASTERISK_CONFLICT'
            : 'ASTERISK_ERROR',
        `Asterisk ARI: ${detail}`,
      )
    }
    return payload as T
  }

  function websocketUrl() {
    const url = new URL(base)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/events`
    url.searchParams.set('app', options.app)
    url.searchParams.set('subscribeAll', 'true')
    return url.toString()
  }

  async function ensureEvents() {
    if (session.socket?.readyState === WebSocket.OPEN) return
    if (session.connecting) return session.connecting

    session.connecting = new Promise<void>((resolve, reject) => {
      const socket = socketFactory(websocketUrl(), { headers: { Authorization: authorization } })
      session.socket = socket
      let settled = false
      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        socket.close()
        reject(new AppError(502, 'ASTERISK_UNREACHABLE', 'Asterisk ARI event socket timed out'))
      }, SOCKET_TIMEOUT_MS)
      timeout.unref?.()

      socket.on('open', () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        resolve()
      })
      socket.on('message', (raw) => {
        let event: AriEvent
        try {
          event = JSON.parse(raw.toString()) as AriEvent
        } catch (error) {
          console.error(JSON.stringify({ level: 'warn', message: 'invalid Asterisk ARI event', err: String(error) }))
          return
        }
        void handleEvent(event).catch((error) => {
          console.error(
            JSON.stringify({ level: 'error', message: 'Asterisk ARI event handling failed', err: String(error) }),
          )
        })
      })
      socket.on('error', (error) => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(new AppError(502, 'ASTERISK_UNREACHABLE', `Asterisk ARI event socket failed: ${error.message}`))
        } else {
          console.error(
            JSON.stringify({ level: 'error', message: 'Asterisk ARI event socket error', err: error.message }),
          )
        }
      })
      socket.on('close', () => {
        if (session.socket === socket) session.socket = null
      })
    }).finally(() => {
      session.connecting = null
    })
    return session.connecting
  }

  async function addToBridge(bridgeId: string, channelId: string) {
    await request(
      'POST',
      `/bridges/${encodeURIComponent(bridgeId)}/addChannel?${new URLSearchParams({ channel: channelId })}`,
    )
  }

  function recordingName(attemptId: string) {
    return `imp-${attemptId.replace(/[^a-zA-Z0-9]/g, '')}`
  }

  async function ensureBridgeRecording(attemptId: string, bridgeId: string) {
    if (!recordCalls) return
    const name = recordingName(attemptId)
    const endpoint = `/recordings/live/${encodeURIComponent(name)}`
    try {
      await request<AriLiveRecording>('GET', endpoint)
      return
    } catch (error) {
      if (!(error instanceof AppError && error.code === 'ASTERISK_NOT_FOUND')) throw error
    }

    const query = new URLSearchParams({
      name,
      format: 'wav',
      ifExists: 'fail',
      beep: 'false',
      terminateOn: 'none',
    })
    try {
      await request('POST', `/bridges/${encodeURIComponent(bridgeId)}/record?${query}`)
    } catch (error) {
      if (!(error instanceof AppError && error.code === 'ASTERISK_CONFLICT')) throw error
      await request<AriLiveRecording>('GET', endpoint)
    }
  }

  function channelId(attemptId: string, role: 'external' | 'operator') {
    return `imp-${attemptId}-${role}`
  }

  function newCall(fields: Pick<AttemptSession, 'attemptId' | 'extension'> & Partial<AttemptSession>): AttemptSession {
    return {
      customerId: options.customerId,
      externalChannelId: null,
      operatorChannelId: null,
      bridgeId: null,
      stage: 'originating',
      outcome: null,
      externalStarted: false,
      operatorStarted: false,
      operatorJoined: false,
      amdStarted: false,
      amdCompleted: false,
      ignoredChannels: new Set(),
      operatorViaTrunk: false,
      direction: 'outbound',
      localRingStartedAt: null,
      ...fields,
    }
  }

  function leaseTarget(lease: AsteriskLease): DialTarget {
    return {
      attemptId: lease.attemptId,
      phone: lease.phone,
      extension: lease.extension,
      startedAt: lease.startedAt,
      providerCallId: lease.providerCallId,
      wasAnswered: lease.wasAnswered,
    }
  }

  async function originateOperator(call: AttemptSession) {
    if (call.operatorStarted) return
    call.operatorStarted = true
    const endpoint = call.operatorViaTrunk
      ? `PJSIP/${options.dialPrefix}${call.extension}@${options.trunkEndpoint}`
      : `PJSIP/${call.extension}`
    const operator = await request<AriChannel>(
      'POST',
      `/channels?${new URLSearchParams({
        endpoint,
        channelId: channelId(call.attemptId, 'operator'),
        app: options.app,
        appArgs: `${call.attemptId},operator`,
      })}`,
    )
    call.operatorChannelId ??= operator.id
  }

  async function onExternalAnswered(call: AttemptSession, externalChannelId: string) {
    call.externalChannelId = externalChannelId
    if (call.bridgeId) return
    const bridge = await request<AriBridge>('POST', '/bridges?type=mixing')
    call.bridgeId = bridge.id
    await addToBridge(bridge.id, externalChannelId)
    call.stage = 'agent_ringing'
    call.localRingStartedAt ??= Date.now()
    await originateOperator(call)
  }

  async function startAnsweringMachineDetection(call: AttemptSession, externalChannelId: string) {
    call.externalChannelId = externalChannelId
    call.amdStarted = true
    call.stage = 'amd'
    const query = new URLSearchParams({
      context: ASTERISK_AMD_CONTEXT,
      extension: call.attemptId,
      priority: '1',
    })
    await request(
      'POST',
      `/channels/${encodeURIComponent(externalChannelId)}/continue?${query}`,
    )
  }

  async function failAttempt(call: AttemptSession) {
    call.stage = 'failed'
    call.outcome = 'failed'
    await leaseStore.release(call.customerId, call.attemptId)
    await hangupChannels(call).catch((error) => {
      console.error(JSON.stringify({ level: 'warn', message: 'failed to clean up Asterisk channels', err: String(error) }))
    })
  }

  async function missInbound(channel: string, attemptId: string, outcome: DialOutcome) {
    await request('DELETE', `/channels/${encodeURIComponent(channel)}`).catch((error) => {
      if (!(error instanceof AppError && error.code === 'ASTERISK_NOT_FOUND')) throw error
    })
    await inboundStore.ended(options.customerId, attemptId, outcome)
  }

  async function acceptInbound(event: AriEvent, externalChannelId: string) {
    const phone = callerNumber(event.args?.[1] ?? event.channel?.caller?.number)
    if (!phone) {
      await request('DELETE', `/channels/${encodeURIComponent(externalChannelId)}`).catch(() => null)
      return
    }
    const attemptId = ulid()
    const extension = options.inboundExtension?.trim() || ''
    await inboundStore.opened({
      attemptId,
      customerId: options.customerId,
      phone,
      extension,
      providerCallId: externalChannelId,
    })
    if (!extension) {
      await missInbound(externalChannelId, attemptId, 'no_answer')
      return
    }
    const acquired = await leaseStore.acquire(options.customerId, attemptId, trunkKey, options.maxChannels)
    if (!acquired) {
      await missInbound(externalChannelId, attemptId, 'failed')
      return
    }
    const call = newCall({
      attemptId,
      extension,
      externalChannelId,
      externalStarted: true,
      direction: 'inbound',
    })
    session.calls.set(attemptId, call)
    try {
      await onExternalAnswered(call, externalChannelId)
    } catch (error) {
      await failAttempt(call)
      await inboundStore.ended(options.customerId, attemptId, 'failed')
      throw error
    }
  }

  async function handleEvent(event: AriEvent) {
    const eventChannelId = event.channel?.id
    if (!eventChannelId) return

    if (event.type === 'StasisStart' && event.application === options.app && event.args?.[0] === 'inbound') {
      const alreadyTracked = [...session.calls.values()].some((call) => call.externalChannelId === eventChannelId)
      if (alreadyTracked) return
      await acceptInbound(event, eventChannelId)
      return
    }

    if (event.type === 'StasisStart' && event.application === options.app) {
      const [attemptId, role] = event.args ?? []
      if (!attemptId || (role !== 'external' && role !== 'operator' && role !== 'amd')) return
      const call = session.calls.get(attemptId)
      if (!call) return

      if (role === 'amd') {
        const result = event.args?.[2]?.toUpperCase()
        const externalChannelId = call.externalChannelId
        if (
          !externalChannelId ||
          call.amdCompleted ||
          call.stage === 'ended' ||
          call.stage === 'failed'
        ) return
        call.amdCompleted = true
        call.amdStarted = true
        if (result === 'MACHINE') {
          call.outcome = 'voicemail'
          call.stage = 'ended'
          await hangupChannels(call)
          await leaseStore.release(call.customerId, call.attemptId)
        } else {
          try {
            await onExternalAnswered(call, externalChannelId)
          } catch (error) {
            await failAttempt(call)
            throw error
          }
        }
        return
      }

      if (role === 'external') {
        if (call.externalStarted) return
        call.externalStarted = true
        try {
          if (options.amdEnabled) await startAnsweringMachineDetection(call, eventChannelId)
          else await onExternalAnswered(call, eventChannelId)
        } catch (error) {
          await failAttempt(call)
          throw error
        }
        return
      }

      if (call.operatorJoined) return
      call.operatorStarted = true
      call.operatorJoined = true
      call.operatorChannelId = eventChannelId
      if (!call.bridgeId) {
        await failAttempt(call)
        return
      }
      await addToBridge(call.bridgeId, eventChannelId)
      try {
        await ensureBridgeRecording(call.attemptId, call.bridgeId)
      } catch (error) {
        await failAttempt(call)
        throw error
      }
      call.stage = 'talking'
      if (call.direction === 'inbound') {
        await inboundStore.answered(call.customerId, call.attemptId, call.extension)
      }
      return
    }

    if (event.type === 'ChannelDestroyed') {
      const call = [...session.calls.values()].find(
        (candidate) =>
          candidate.externalChannelId === eventChannelId ||
          candidate.operatorChannelId === eventChannelId ||
          candidate.ignoredChannels.has(eventChannelId),
      )
      if (!call || call.stage === 'ended' || call.stage === 'failed') return
      if (call.ignoredChannels.delete(eventChannelId)) return
      const wasTalking = call.stage === 'talking'
      call.outcome = channelOutcome(event.cause, wasTalking)
      call.stage = 'ended'
      await hangupChannels(call, eventChannelId).catch((error) => {
        console.error(JSON.stringify({ level: 'warn', message: 'failed to hang up Asterisk peer channel', err: String(error) }))
      })
      await leaseStore.release(call.customerId, call.attemptId)
      if (call.direction === 'inbound' && call.outcome) {
        await inboundStore.ended(call.customerId, call.attemptId, call.outcome)
      }
    }
  }

  async function hangupChannels(call: AttemptSession, except?: string) {
    const ids = [call.externalChannelId, call.operatorChannelId].filter(
      (channelId): channelId is string => Boolean(channelId && channelId !== except),
    )
    for (const channelId of new Set(ids)) {
      await request('DELETE', `/channels/${encodeURIComponent(channelId)}`).catch((error) => {
        if (!(error instanceof AppError && error.code === 'ASTERISK_NOT_FOUND')) throw error
      })
    }
    if (call.bridgeId) {
      await request('DELETE', `/bridges/${encodeURIComponent(call.bridgeId)}`).catch((error) => {
        if (!(error instanceof AppError && error.code === 'ASTERISK_NOT_FOUND')) throw error
      })
      call.bridgeId = null
    }
  }

  async function recoverAttempt(
    target: DialTarget,
    channels: AriChannel[],
    bridges: AriBridge[],
  ): Promise<AttemptSession> {
    const externalId = channelId(target.attemptId, 'external')
    const operatorId = channelId(target.attemptId, 'operator')
    const external =
      channels.find((channel) => channel.id === externalId) ??
      (target.providerCallId ? channels.find((channel) => channel.id === target.providerCallId) : undefined)
    const operator = channels.find((channel) => channel.id === operatorId)
    const externalOnBridge = external?.id ?? externalId
    const bridge = bridges.find(
      (candidate) => candidate.channels?.includes(externalOnBridge) && candidate.channels.includes(operatorId),
    )
    const call = newCall({
      attemptId: target.attemptId,
      extension: target.connectPhone || target.extension,
      externalChannelId: external?.id ?? null,
      operatorChannelId: operator?.id ?? null,
      externalStarted: Boolean(external),
      operatorStarted: Boolean(operator),
      operatorJoined: Boolean(bridge),
      operatorViaTrunk: Boolean(target.connectPhone),
    })

    if (!external && !operator) {
      call.stage = 'ended'
      call.outcome = target.wasAnswered ? 'abandoned' : 'no_answer'
      session.calls.set(target.attemptId, call)
      await leaseStore.release(options.customerId, target.attemptId)
      return call
    }

    if (!external && operator) {
      call.stage = 'ended'
      call.outcome = target.wasAnswered ? 'abandoned' : 'failed'
      session.calls.set(target.attemptId, call)
      await hangupChannels(call)
      await leaseStore.release(options.customerId, target.attemptId)
      return call
    }

    call.bridgeId = bridge?.id ?? null
    if (bridge) {
      try {
        await ensureBridgeRecording(target.attemptId, bridge.id)
      } catch (error) {
        await failAttempt(call)
        throw error
      }
      call.stage = 'talking'
    } else if (external && operator) {
      const recoveredBridge = await request<AriBridge>('POST', '/bridges?type=mixing')
      call.bridgeId = recoveredBridge.id
      await addToBridge(recoveredBridge.id, external.id)
      await addToBridge(recoveredBridge.id, operator.id)
      try {
        await ensureBridgeRecording(target.attemptId, recoveredBridge.id)
      } catch (error) {
        await failAttempt(call)
        throw error
      }
      call.operatorJoined = true
      call.stage = 'talking'
    } else if (operator) {
      call.stage = 'agent_ringing'
    } else if (external?.state === 'Up') {
      if (options.amdEnabled) {
        call.externalStarted = true
        try {
          await startAnsweringMachineDetection(call, external.id)
        } catch (error) {
          await failAttempt(call)
          throw error
        }
      } else call.stage = 'originating'
    } else {
      call.stage = 'originating'
    }
    session.calls.set(target.attemptId, call)

    if (!options.amdEnabled && external?.state === 'Up' && !operator && !bridge) {
      call.externalStarted = true
      try {
        await onExternalAnswered(call, external.id)
      } catch (error) {
        await failAttempt(call)
        await leaseStore.release(options.customerId, target.attemptId)
        throw error
      }
    }
    return call
  }

  async function recoverLeases() {
    const leases = await leaseStore.list(options.customerId)
    if (leases.length === 0) return
    await ensureEvents()
    const [channels, bridges] = await Promise.all([
      request<AriChannel[]>('GET', '/channels'),
      request<AriBridge[]>('GET', '/bridges'),
    ])
    for (const lease of leases) {
      if (session.calls.has(lease.attemptId)) continue
      await recoverAttempt(leaseTarget(lease), channels, bridges)
    }
  }

  async function recoverLeasesOnce() {
    if (session.recovery) return session.recovery
    session.recovery = recoverLeases().finally(() => {
      session.recovery = null
    })
    return session.recovery
  }

  function pruneFinishedCalls() {
    for (const [attemptId, call] of session.calls) {
      if (call.stage === 'ended' || call.stage === 'failed') session.calls.delete(attemptId)
    }
  }

  function liveFrom(call: AttemptSession): LiveStatus {
    if (call.stage === 'talking') return { state: 'talking', providerCallId: call.externalChannelId }
    if (call.stage === 'ended' || call.stage === 'failed') return { state: 'gone' }
    return {
      state: 'ringing',
      providerCallId: call.externalChannelId,
      ...(call.stage === 'agent_ringing' && call.localRingStartedAt
        ? { ringingSince: new Date(call.localRingStartedAt).toISOString() }
        : {}),
    }
  }

  return {
    name: 'asterisk',
    supportsRecording: recordCalls,

    async originate(target: DialTarget) {
      await recoverLeasesOnce()
      pruneFinishedCalls()
      const slots = target.connectPhone ? 2 : 1
      if (!(await leaseStore.acquire(options.customerId, target.attemptId, trunkKey, options.maxChannels, slots))) {
        throw new AppError(409, 'TELEPHONY_CHANNEL_LIMIT', 'Asterisk channel limit reached')
      }
      const call = newCall({
        attemptId: target.attemptId,
        extension: target.connectPhone || target.extension,
        operatorViaTrunk: Boolean(target.connectPhone),
      })
      session.calls.set(target.attemptId, call)
      try {
        await ensureEvents()
        const channel = await request<AriChannel>(
          'POST',
          `/channels?${new URLSearchParams({
            endpoint: `PJSIP/${options.dialPrefix}${target.phone}@${options.trunkEndpoint}`,
            channelId: channelId(target.attemptId, 'external'),
            app: options.app,
            appArgs: `${target.attemptId},external`,
            ...(options.callerId ? { callerId: options.callerId } : {}),
          })}`,
        )
        call.externalChannelId ??= channel.id
      } catch (error) {
        call.stage = 'failed'
        call.outcome = 'failed'
        await leaseStore.release(options.customerId, target.attemptId)
        throw error
      }
    },

    async liveState(target: DialTarget): Promise<LiveStatus> {
      const socketWasConnected = session.socket?.readyState === WebSocket.OPEN
      await ensureEvents()
      let call = session.calls.get(target.attemptId)
      if (!call || !socketWasConnected) {
        const [channels, bridges] = await Promise.all([
          request<AriChannel[]>('GET', '/channels'),
          request<AriBridge[]>('GET', '/bridges'),
        ])
        call = await recoverAttempt(target, channels, bridges)
      }
      return liveFrom(call)
    },

    async transfer(target: DialTarget, extension: string) {
      const call = session.calls.get(target.attemptId)
      if (!call || call.stage !== 'talking' || !call.bridgeId) {
        throw new AppError(409, 'TRANSFER_UNAVAILABLE', 'A chamada não está conectada')
      }
      if (!/^[\w.@-]+$/.test(extension)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Ramal inválido')
      }
      const previous = call.operatorChannelId
      if (previous) call.ignoredChannels.add(previous)
      call.operatorJoined = false
      call.operatorStarted = false
      call.operatorChannelId = null
      call.operatorViaTrunk = false
      call.extension = extension
      call.stage = 'agent_ringing'
      call.localRingStartedAt = Date.now()
      if (previous) {
        await request('DELETE', `/channels/${encodeURIComponent(previous)}`).catch((error) => {
          if (!(error instanceof AppError && error.code === 'ASTERISK_NOT_FOUND')) throw error
        })
      }
      await originateOperator(call)
    },

    async listen() {
      await ensureEvents()
    },

    async hangup(target: DialTarget) {
      let call = session.calls.get(target.attemptId)
      if (!call) {
        await ensureEvents()
        const [channels, bridges] = await Promise.all([
          request<AriChannel[]>('GET', '/channels'),
          request<AriBridge[]>('GET', '/bridges'),
        ])
        call = await recoverAttempt(target, channels, bridges)
      }
      if (call.stage === 'ended' || call.stage === 'failed') {
        await leaseStore.release(options.customerId, target.attemptId)
        return
      }
      await hangupChannels(call)
      call.stage = 'ended'
      call.outcome ??= 'cancelled'
      await leaseStore.release(options.customerId, target.attemptId)
    },

    async finalOutcome(target: DialTarget) {
      let call = session.calls.get(target.attemptId)
      if (!call) {
        await ensureEvents()
        const [channels, bridges] = await Promise.all([
          request<AriChannel[]>('GET', '/channels'),
          request<AriBridge[]>('GET', '/bridges'),
        ])
        call = await recoverAttempt(target, channels, bridges)
      }
      const outcome = call?.outcome ?? null
      if (call && (call.stage === 'ended' || call.stage === 'failed')) session.calls.delete(target.attemptId)
      return outcome
    },

    async fetchRecording(target): Promise<CallRecording | null> {
      const name = recordingName(target.attemptId)
      let response: Response
      try {
        response = await doFetch(`${base}/recordings/stored/${encodeURIComponent(name)}/file`, {
          headers: { Authorization: authorization },
          signal: AbortSignal.timeout(60_000),
        })
      } catch (error) {
        throw new AppError(502, 'ASTERISK_UNREACHABLE', `Asterisk recording download failed: ${String(error)}`)
      }
      if (response.status === 404) return null
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300)
        throw new AppError(502, 'ASTERISK_ERROR', `Asterisk recording download: ${detail || response.status}`)
      }
      const audio = Buffer.from(await response.arrayBuffer())
      return audio.length > 0 ? { audio, format: 'wav' } : null
    },

    async recoverActive() {
      await recoverLeasesOnce()
    },
  }
}

export async function closeAsteriskSessions() {
  const sockets = [...sessions.values()].flatMap((session) => (session.socket ? [session.socket] : []))
  sessions.clear()
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close()
  }
}
