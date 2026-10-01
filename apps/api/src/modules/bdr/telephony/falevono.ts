import { config } from '../../../core/config.js'
import { AppError } from '../../../core/errors.js'
import { samePhone } from './phone.js'
import type { DialOutcome, DialTarget, LiveStatus, TelephonyProvider } from './types.js'

/**
 * FaleVono / Vono PABX REST API (https://falevono.com.br/ajuda/categoria/integracoes-e-apis).
 * Auth is path-based: /api/<endpoint>/<API_TOKEN>/<API_KEY>.
 */
export type FaleVonoOptions = {
  baseUrl: string
  apiToken: string
  apiKey: string
  deviceId: string
  dialPrefix: string
}

type VonoRecord = Record<string, unknown>
type VonoList = { error?: number | string; reason?: string; data?: VonoRecord[] }

const REQUEST_TIMEOUT_MS = 10_000

/** CDR disposition codes: 0 cancelado, 1 atendido, 2 ocupado, 3 não atendido, 4 indisponível, 5 congestionado. */
const CDR_DISPOSITIONS: Record<string, DialOutcome> = {
  '0': 'no_answer',
  '1': 'abandoned',
  '2': 'busy',
  '3': 'no_answer',
  '4': 'failed',
  '5': 'failed',
}

function pabxParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.PABX_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}:${get('second')}`,
  }
}

function matchesNumber(record: VonoRecord, phone: string) {
  return samePhone(record.destination, phone) || samePhone(record.source, phone)
}

function matchesExtension(record: VonoRecord, extension: string) {
  return String(record.destination ?? '') === extension || String(record.source ?? '') === extension
}

export function createFaleVonoProvider(options: FaleVonoOptions): TelephonyProvider {
  const base = options.baseUrl.replace(/\/+$/, '')

  function url(endpoint: string, suffix = '', query?: Record<string, string>) {
    const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
    return `${base}/api/${endpoint}/${encodeURIComponent(options.apiToken)}/${encodeURIComponent(options.apiKey)}${suffix}${qs}`
  }

  async function call(method: string, target: string, body?: unknown): Promise<VonoList> {
    let response: Response
    try {
      response = await fetch(target, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new AppError(502, 'TELEPHONY_UNREACHABLE', `FaleVono did not respond: ${String(error)}`)
    }
    const payload = (await response.json().catch(() => null)) as VonoList | null
    if (!response.ok || !payload || String(payload.error ?? '0') !== '0') {
      const reason = payload?.reason || `HTTP ${response.status}`
      throw new AppError(502, 'TELEPHONY_ERROR', `FaleVono: ${reason}`)
    }
    return payload
  }

  async function onlineCalls() {
    const payload = await call('GET', url('onlineCalls'))
    return payload.data ?? []
  }

  return {
    name: 'falevono',
    supportsRecording: true,

    async originate(target: DialTarget) {
      await call('POST', url('click2Call'), {
        device_id: options.deviceId,
        src: `${options.dialPrefix}${target.phone}`,
        dst: target.extension,
      })
    },

    async liveState(target: DialTarget): Promise<LiveStatus> {
      const matches = (await onlineCalls()).filter((record) => matchesNumber(record, target.phone))
      if (matches.length === 0) return { state: 'gone' }
      const talking = matches.find(
        (record) => String(record.status) === '1' || String(record.status_text).toUpperCase() === 'TALKING',
      )
      const chosen = talking ?? matches[0]
      return {
        state: talking ? 'talking' : 'ringing',
        providerCallId: chosen.id == null ? null : String(chosen.id),
      }
    },

    async hangup(target: DialTarget) {
      const legs = (await onlineCalls()).filter(
        (record) => matchesNumber(record, target.phone) || matchesExtension(record, target.extension),
      )
      for (const leg of legs) {
        if (leg.id == null) continue
        await call('DELETE', url('onlineCalls', `/${encodeURIComponent(String(leg.id))}`)).catch(() => null)
      }
    },

    async finalOutcome(target: DialTarget) {
      const from = pabxParts(new Date(target.startedAt.getTime() - 60_000))
      const to = pabxParts(new Date())
      const payload = await call(
        'GET',
        url('cdr', '', {
          date_ini: from.date,
          time_ini: from.time,
          date_end: to.date,
          time_end: to.time,
          start: '0',
          limit: '100',
        }),
      )
      const records = (payload.data ?? [])
        .filter((record) => samePhone(record.destination, target.phone))
        .sort((a, b) => String(b.calldate ?? '').localeCompare(String(a.calldate ?? '')))
      const latest = records[0]
      if (!latest || latest.disposition == null) return null
      return CDR_DISPOSITIONS[String(latest.disposition)] ?? null
    },

    async fetchRecording(target: DialTarget) {
      const day = pabxParts(target.startedAt).date
      const endDay = pabxParts(target.endedAt ?? new Date()).date
      const payload = await call(
        'GET',
        url('recording', '', { date_ini: day, date_end: endDay, start: '0', limit: '200' }),
      )
      const candidates = (payload.data ?? []).filter((record) =>
        Object.values(record).some((value) => typeof value === 'string' && samePhone(value, target.phone)),
      )
      const latest = candidates.sort((a, b) =>
        String(b.calldate ?? b.date ?? '').localeCompare(String(a.calldate ?? a.date ?? '')),
      )[0]
      const recordId = latest?.id ?? latest?.id_record
      if (recordId == null) return null

      const response = await fetch(url('recording', '/', { id_record: String(recordId), is_download: '1' }), {
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) return null
      if ((response.headers.get('content-type') || '').includes('json')) return null
      const audio = Buffer.from(await response.arrayBuffer())
      return audio.length > 0 ? audio : null
    },
  }
}
