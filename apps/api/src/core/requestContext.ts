import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { log } from './logger.js'

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/

/** Assigns X-Request-Id (reusing a well-formed inbound one) and writes one access log line per request. */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const inbound = req.header('x-request-id')
  const requestId = inbound && REQUEST_ID.test(inbound) ? inbound : randomUUID()
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  const started = process.hrtime.bigint()
  res.on('finish', () => {
    if (req.path === '/health') return
    log(res.statusCode >= 500 ? 'error' : 'info', 'request', {
      requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - started) / 1_000_000n),
      userId: req.user?.id,
    })
  })
  next()
}
