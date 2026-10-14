import { createApp } from './app.js'
import { config } from './core/config.js'
import { pool } from './core/db.js'
import { log } from './core/logger.js'
import { runMigrations } from './core/migrate.js'
import { resolveWebDistDir } from './core/webDist.js'
import { startCallSummarySweeper } from './modules/bdr/callSummary.js'
import { startRecordingSweeper } from './modules/bdr/recordings.js'

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
  })

  function shutdown(signal: string) {
    log('info', 'api shutting down', { signal })
    server.close(() => {
      pool.end().finally(() => process.exit(0))
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
