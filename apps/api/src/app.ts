import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express, Router } from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { config } from './core/config.js'
import { pingDatabase } from './core/db.js'
import { errorHandler, notFoundHandler } from './core/http.js'
import { requestContext } from './core/requestContext.js'
import { resolveWebDistDir } from './core/webDist.js'
import { auditRouter } from './modules/audit/audit.routes.js'
import { requireAccountManager, requireAuth, requirePlatformAdmin } from './modules/auth/auth.middleware.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { bdrRouter } from './modules/bdr/bdr.routes.js'
import { customersRouter } from './modules/customers/customers.routes.js'
import { trainingAiRouter } from './modules/training-ai/training-ai.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { webinarRouter, webinarPublicRouter } from './modules/webinar/webinar.routes.js'
import { webinarPlansAdminRouter } from './modules/webinar-plans/plans.routes.js'
import { webinarBridgeRouter } from './modules/webinar-bridge/webinar-bridge.routes.js'

export const API_VERSION = '0.2.0'

function mountApiRoutes(app: Express, prefix = '') {
  const admin = Router()
  admin.use(requireAuth, requireAccountManager)
  admin.use('/customers', customersRouter)
  admin.use('/users', usersRouter)
  admin.use('/audit-logs', auditRouter)
  // Webinar plans, subscriptions and payments are the platform's business, not the customer's.
  admin.use('/webinar', requirePlatformAdmin, webinarPlansAdminRouter)

  app.use(`${prefix}/api/auth`, authRouter)
  app.use(`${prefix}/api/admin`, admin)
  app.use(`${prefix}/api/modules/training-ai`, trainingAiRouter)
  app.use(`${prefix}/api/modules/bdr`, bdrRouter)
  app.use(`${prefix}/api/modules/webinar`, webinarRouter)
  // Sign-on handoff to the separate Webinar service; goes away once the web app uses this module.
  app.use(`${prefix}/api/modules/webinar`, webinarBridgeRouter)
  app.use(`${prefix}/api/public/webinar`, webinarPublicRouter)
}

function mountWebApp(app: Express) {
  const webDist = resolveWebDistDir()
  if (!webDist) return false

  app.use(express.static(webDist, { index: false, fallthrough: true }))
  app.get(/^(?!\/api(?:\/|$)|\/platform-api(?:\/|$)|\/health(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'))
  })
  return true
}

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)
  app.use(requestContext)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }))
  app.use(cors({ origin: config.corsOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/health', async (_req, res) => {
    const up = await pingDatabase().catch(() => false)
    res.status(up ? 200 : 503).json({
      status: up ? 'ok' : 'error',
      version: API_VERSION,
      database: up ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    })
  })

  // Direct API paths and the same-origin `/platform-api` prefix the web app uses in production.
  mountApiRoutes(app)
  mountApiRoutes(app, '/platform-api')

  mountWebApp(app)
  // API misses return JSON. With a web build, browser routes already received index.html above.
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
