import { createApp } from './app.js'
import { config } from './core/config.js'
import { pool } from './core/db.js'
import { log } from './core/logger.js'
import { startCallSummarySweeper } from './modules/bdr/callSummary.js'
import { startRecordingSweeper } from './modules/bdr/recordings.js'

const server = createApp().listen(config.PORT, () => {
  log('info', 'api listening', { port: config.PORT, env: config.NODE_ENV })
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
