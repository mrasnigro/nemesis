import { createApp } from './app.js'
import type { RowDataPacket } from 'mysql2'
import { config } from './core/config.js'
import { pool } from './core/db.js'
import { log } from './core/logger.js'
import { runMigrations } from './core/migrate.js'
import { resolveWebDistDir } from './core/webDist.js'
import { startCallSummarySweeper } from './modules/bdr/callSummary.js'
import { startRecordingSweeper } from './modules/bdr/recordings.js'
import { closeAsteriskSessions } from './modules/bdr/telephony/asterisk.js'
import { resolveProvider } from './modules/bdr/telephony/settings.js'

async function main() {
  // Hostinger has no shell: apply pending SQL before the process accepts traffic.
  if (process.env.RUN_MIGRATIONS_ON_START !== 'false') {
    const applied = await runMigrations((message) => log('info', message))
    if (applied.length) log('info', 'migrations applied on start', { files: applied })
  }

  const webDist = resolveWebDistDir()
  const app = createApp()
  const server = app.listen(config.PORT, () => {
    log('info', 'api listening', {
      port: config.PORT,
      env: config.NODE_ENV,
      webDist: webDist || 'none',
    })
    startRecordingSweeper()
    startCallSummarySweeper()
    // Keeps every Asterisk customer's ARI socket open (inbound DID calls) and reattaches live calls.
    const recoverAsteriskCalls = async () => {
      try {
        const [rows] = await pool.query<(RowDataPacket & { customer_id: string })[]>(
          `SELECT customer_id FROM bdr_telephony_settings WHERE provider = 'asterisk'
           UNION
           SELECT l.customer_id
           FROM bdr_asterisk_channel_leases l
           JOIN bdr_dial_attempts a ON a.id = l.attempt_id
           WHERE a.status IN ('ringing', 'answered')`,
        )
        for (const row of rows) {
          try {
            const provider = await resolveProvider(String(row.customer_id))
            await provider?.listen?.()
            await provider?.recoverActive?.()
          } catch (error) {
            log('warn', 'Asterisk call recovery failed for customer', {
              customerId: String(row.customer_id),
              err: error instanceof Error ? error.message : String(error),
            })
          }
        }
      } catch (error) {
        log('warn', 'Asterisk active-call recovery failed', {
          err: error instanceof Error ? error.message : String(error),
        })
      }
    }
    void recoverAsteriskCalls()
    const recoveryTimer = setInterval(() => void recoverAsteriskCalls(), 15_000)
    recoveryTimer.unref()
  })

  function shutdown(signal: string) {
    log('info', 'api shutting down', { signal })
    server.close(() => {
      void closeAsteriskSessions().finally(() => pool.end().finally(() => process.exit(0)))
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((error) => {
  log('error', 'api failed to start', {
    err: error instanceof Error ? error.stack ?? error.message : String(error),
  })
  process.exit(1)
})
