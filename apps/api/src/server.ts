import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { config } from './core/config.js'
import { pingDatabase } from './core/db.js'
import { errorHandler } from './core/http.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { bdrRouter } from './modules/bdr/bdr.routes.js'
import { trainingAiRouter } from './modules/training-ai/training-ai.routes.js'

const app = express()

app.disable('x-powered-by')
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.get('/health', async (_req, res) => {
  try {
    const up = await pingDatabase()
    res.status(up ? 200 : 503).json({
      status: up ? 'ok' : 'error',
      version: '0.1.0',
      database: up ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    })
  } catch {
    res.status(503).json({
      status: 'error',
      version: '0.1.0',
      database: 'down',
      timestamp: new Date().toISOString(),
    })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/modules/training-ai', trainingAiRouter)
app.use('/api/modules/bdr', bdrRouter)

app.use(errorHandler)

app.listen(config.PORT, () => {
  console.log(JSON.stringify({ level: 'info', message: 'api listening', port: config.PORT }))
})
