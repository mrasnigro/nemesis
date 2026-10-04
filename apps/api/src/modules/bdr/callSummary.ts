import { readFile } from 'node:fs/promises'
import type { RowDataPacket } from 'mysql2'
import { config } from '../../core/config.js'
import { pool } from '../../core/db.js'
import { log } from '../../core/logger.js'
import { getCall, meetingsByCall } from './bdr.repository.js'
import { callAi, MAX_TRANSCRIBE_BYTES } from './callAi.js'
import { recordingAbsolutePath } from './recordingStorage.js'

type Row = RowDataPacket & Record<string, unknown>
type Facts = Record<string, unknown>

export type SummarySource = 'record' | 'ai' | 'ai_audio'
export type SummaryStatus = 'none' | 'pending' | 'ready' | 'failed'

const MAX_TRIES = 5
const SWEEP_INTERVAL_MS = 60_000

const PAIN_LABELS: Record<string, string> = {
  lucro: 'Lucro',
  vendas: 'Vendas',
  gestao: 'Gestão',
  lideranca: 'Liderança',
  todos: 'Todas',
  nenhum: 'Nenhuma',
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: config.PABX_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`
}

function thermometerLabel(value: number): string {
  if (value <= 30) return 'Frio'
  if (value <= 65) return 'Morno'
  return 'Quente'
}

function meetingWhen(meeting: Facts): string {
  const date = text(meeting.date)
  const time = text(meeting.time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}${time ? ` às ${time}` : ''}`
  }
  return formatDateTime(meeting.startsAt)
}

const RECORDING_LINES: Record<string, string> = {
  stored: 'Gravação: disponível.',
  pending: 'Gravação: sendo copiada da central telefônica.',
}

/**
 * The attendance summary built from what the operator saved. Always available, with or without a language
 * model, and it is also the material the model receives.
 */
export function recordSummary(call: Facts & { meetings?: Facts[]; recordingStatus?: string }): string {
  const diagnosis = (call.diagnosis ?? {}) as Facts
  const lines: string[] = []

  const who = [text(call.leadName) || 'Contato', text(call.company)].filter(Boolean).join(' — ')
  const when = formatDateTime(call.startedAt)
  const duration = Number(call.durationSeconds ?? call.duration ?? 0)
  lines.push(
    `Ligação ${call.mode === 'manual' ? 'manual' : 'automática'} com ${who}${text(call.phone) ? ` (${text(call.phone)})` : ''}` +
      `${when ? ` em ${when}` : ''}, duração de ${formatDuration(duration)}.`,
  )

  const result = text(call.qualification) || text(call.result)
  const status = text(call.clientStatus)
  if (result || status) {
    lines.push(`Resultado: ${[result, status && status !== result ? `status do cliente ${status}` : ''].filter(Boolean).join(' · ')}.`)
  }
  if (typeof diagnosis.salesTemperature === 'number') {
    lines.push(`Termômetro de venda: ${diagnosis.salesTemperature}% (${thermometerLabel(diagnosis.salesTemperature)}).`)
  }

  const checked = (diagnosis.pains ?? {}) as Record<string, unknown>
  const pains = Object.entries(PAIN_LABELS)
    .filter(([id]) => checked[id] === true)
    .map(([, label]) => label)
  if (pains.length) lines.push(`Dores marcadas: ${pains.join(', ')}.`)

  const fields: [string, unknown][] = [
    ['Problemas e gargalos', diagnosis.painPoints],
    ['Necessidades', diagnosis.needs],
    ['Objeções', diagnosis.objections],
    ['Observações', diagnosis.extraObservations],
    ['Notas', call.notes],
    ['Resumo do operador', diagnosis.conversationSummary],
  ]
  for (const [label, value] of fields) {
    if (text(value)) lines.push(`${label}: ${text(value)}`)
  }

  for (const meeting of call.meetings ?? []) {
    const at = meetingWhen(meeting)
    if (at) lines.push(`Reunião agendada para ${at}.`)
  }
  const callback = formatDateTime(call.callbackAt)
  if (callback) lines.push(`Retorno combinado para ${callback}.`)

  lines.push(RECORDING_LINES[String(call.recordingStatus)] ?? 'Gravação: não disponível.')
  return lines.join('\n')
}

/** What the API returns as `summary`: the model's text when there is one, otherwise the record summary. */
export function presentSummary(call: Facts & { meetings?: Facts[]; recordingStatus?: string }) {
  const stored = (call.summary ?? {}) as Facts
  const aiText = text(stored.text)
  return {
    text: aiText || recordSummary(call),
    source: (aiText ? stored.source : 'record') as SummarySource,
    status: (stored.status ?? 'none') as SummaryStatus,
    updatedAt: stored.updatedAt ?? null,
  }
}

/** Asks for a model-written summary in the background. A no-op when no AI provider is configured. */
export async function queueCallSummary(callId: string) {
  if (!callAi()) return
  await pool.query(
    `UPDATE bdr_calls SET summary_status = 'pending', summary_tries = 0, summary_updated_at = :now
     WHERE id = :callId AND deleted_at IS NULL`,
    { callId, now: new Date() },
  )
  void processCallSummary(callId)
}

/** Transcribes the stored recording (once) and writes the summary. Never throws; failures are retried. */
export async function processCallSummary(callId: string) {
  try {
    const [rows] = await pool.query<Row[]>(
      `SELECT c.customer_id, c.transcript_text, a.recording_status, a.recording_path
       FROM bdr_calls c
       LEFT JOIN bdr_dial_attempts a ON a.call_id = c.id
       WHERE c.id = :callId AND c.summary_status = 'pending' AND c.deleted_at IS NULL
       LIMIT 1`,
      { callId },
    )
    const row = rows[0]
    if (!row) return
    const ai = callAi()
    if (!ai) {
      await pool.query(`UPDATE bdr_calls SET summary_status = 'none' WHERE id = :callId`, { callId })
      return
    }
    // Claim the job so the sweeper leaves it alone while the provider works.
    await pool.query(`UPDATE bdr_calls SET summary_updated_at = :now WHERE id = :callId`, { callId, now: new Date() })

    const customerId = String(row.customer_id)
    const recordingStatus = row.recording_status == null ? 'none' : String(row.recording_status)
    let transcript = row.transcript_text == null ? null : String(row.transcript_text)
    if (!transcript && ai.canTranscribe && recordingStatus === 'stored' && row.recording_path != null) {
      const audio = await readFile(recordingAbsolutePath(String(row.recording_path)))
      if (audio.length <= MAX_TRANSCRIBE_BYTES) {
        transcript = (await ai.transcribe(audio)) || null
        await pool.query(`UPDATE bdr_calls SET transcript_text = :transcript WHERE id = :callId`, {
          callId,
          transcript,
        })
      } else {
        log('warn', 'call recording too large to transcribe', { callId, bytes: audio.length })
      }
    }

    const call = await getCall(customerId, callId)
    if (!call) return
    const meetings = (await meetingsByCall(customerId, [callId])).get(callId) ?? []
    const facts = recordSummary({ ...call, meetings, recordingStatus })
    const summary = await ai.summarize({ facts, transcript })
    await pool.query(
      `UPDATE bdr_calls
       SET summary_text = :summary, summary_source = :source, summary_status = 'ready', summary_updated_at = :now
       WHERE id = :callId AND summary_status = 'pending'`,
      { callId, summary, source: transcript ? 'ai_audio' : 'ai', now: new Date() },
    )
  } catch (error) {
    log('warn', 'call summary failed', { callId, message: error instanceof Error ? error.message : String(error) })
    await pool
      .query(
        `UPDATE bdr_calls
         SET summary_tries = summary_tries + 1,
             summary_status = IF(summary_tries >= :maxTries, 'failed', 'pending'),
             summary_updated_at = :now
         WHERE id = :callId AND summary_status = 'pending'`,
        { callId, maxTries: MAX_TRIES, now: new Date() },
      )
      .catch(() => null)
  }
}

/** Retries pending summaries with a growing delay; state lives in MySQL, so restarts lose nothing. */
export function startCallSummarySweeper() {
  const timer = setInterval(async () => {
    if (!callAi()) return
    try {
      const [rows] = await pool.query<Row[]>(
        `SELECT id FROM bdr_calls
         WHERE summary_status = 'pending'
           AND summary_updated_at <= DATE_SUB(:now, INTERVAL (summary_tries + 1) * 300 SECOND)
         ORDER BY summary_updated_at
         LIMIT 10`,
        { now: new Date() },
      )
      for (const row of rows) await processCallSummary(String(row.id))
    } catch (error) {
      log('warn', 'call summary sweep failed', { message: error instanceof Error ? error.message : String(error) })
    }
  }, SWEEP_INTERVAL_MS)
  timer.unref()
}
