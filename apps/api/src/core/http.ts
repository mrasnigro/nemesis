import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from './errors.js'
import { log } from './logger.js'

function isBodyParseError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed'
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`))
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    })
    return
  }

  if (isBodyParseError(err)) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body', details: [] },
    })
    return
  }

  log('error', 'unhandled', {
    requestId: req.requestId,
    path: req.originalUrl,
    err: err instanceof Error ? (err.stack ?? err.message) : String(err),
  })
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Unexpected server error',
      details: [],
    },
  })
}
