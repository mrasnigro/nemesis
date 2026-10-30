import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../../core/db.js'
import { queueCallSummary } from './callSummary.js'
import { recordingAbsolutePath } from './recordingStorage.js'
import { resolveProvider } from './telephony/settings.js'

type Row = RowDataPacket & Record<string, unknown>

/** The PABX publishes recordings some time after hangup and keeps them only 90 days. */
const FIRST_TRY_DELAY_MS = 20_000
const SWEEP_INTERVAL_MS = 60_000
const MAX_TRIES = 10

async function fetchOnce(attemptId: string) {
  const [rows] = await pool.query<Row[]>(
    `SELECT * FROM bdr_dial_attempts WHERE id = :attemptId AND recording_status = 'pending' LIMIT 1`,
    { attemptId },
  )
  const row = rows[0]
  if (!row) return
  const customerId = String(row.customer_id)
  const tries = Number(row.recording_tries) + 1
  const now = new Date()
  try {
    const provider = await resolveProvider(customerId)
    const recording = provider?.supportsRecording
      ? await provider.fetchRecording({
          attemptId,
          phone: String(row.phone),
          extension: String(row.operator_extension),
          startedAt: new Date(String(row.started_at)),
          endedAt: row.ended_at == null ? null : new Date(String(row.ended_at)),
          providerCallId: row.provider_call_id == null ? null : String(row.provider_call_id),
        })
      : null
    if (recording) {
      const relative = path.join(customerId, `${attemptId}.${recording.format}`)
      const absolute = recordingAbsolutePath(relative)
      await mkdir(path.dirname(absolute), { recursive: true })
      await writeFile(absolute, recording.audio)
      await pool.query(
        `UPDATE bdr_dial_attempts
         SET recording_status = 'stored', recording_path = :relative, recording_tries = :tries, updated_at = :now
         WHERE id = :attemptId`,
        { attemptId, relative: relative.split(path.sep).join('/'), tries, now },
      )
      // With the audio in hand the summary can be redone from the transcript.
      if (row.call_id != null) await queueCallSummary(String(row.call_id))
      return
    }
  } catch (error) {
    console.error(JSON.stringify({ level: 'warn', message: 'recording fetch failed', attemptId, err: String(error) }))
  }
  const giveUp = tries >= MAX_TRIES
  await pool.query(
    `UPDATE bdr_dial_attempts
     SET recording_status = :status, recording_tries = :tries, updated_at = :now
     WHERE id = :attemptId`,
    { attemptId, status: giveUp ? 'missing' : 'pending', tries, now },
  )
}

export function scheduleRecordingFetch(attemptId: string) {
  setTimeout(() => {
    void fetchOnce(attemptId)
  }, FIRST_TRY_DELAY_MS).unref()
}

/** Retries pending downloads with a growing delay; survives API restarts because state lives in MySQL. */
export function startRecordingSweeper() {
  const timer = setInterval(async () => {
    try {
      const [rows] = await pool.query<Row[]>(
        `SELECT id FROM bdr_dial_attempts
         WHERE recording_status = 'pending'
           AND updated_at <= DATE_SUB(:now, INTERVAL (recording_tries + 1) * 60 SECOND)
         ORDER BY updated_at
         LIMIT 20`,
        { now: new Date() },
      )
      for (const row of rows) await fetchOnce(String(row.id))
    } catch (error) {
      console.error(JSON.stringify({ level: 'warn', message: 'recording sweep failed', err: String(error) }))
    }
  }, SWEEP_INTERVAL_MS)
  timer.unref()
}

export async function recordingForCall(customerId: string, callId: string) {
  const [rows] = await pool.query<Row[]>(
    `SELECT recording_status, recording_path FROM bdr_dial_attempts
     WHERE customer_id = :customerId AND call_id = :callId
     ORDER BY started_at DESC LIMIT 1`,
    { customerId, callId },
  )
  const row = rows[0]
  if (!row) return null
  return {
    status: String(row.recording_status),
    path: row.recording_path == null ? null : String(row.recording_path),
  }
}

export async function recordingStatusByCall(customerId: string, callIds: string[]) {
  if (callIds.length === 0) return new Map<string, string>()
  const [rows] = await pool.query<Row[]>(
    `SELECT call_id, recording_status FROM bdr_dial_attempts
     WHERE customer_id = ? AND call_id IN (?)`,
    [customerId, callIds],
  )
  return new Map(rows.map((row) => [String(row.call_id), String(row.recording_status)]))
}
