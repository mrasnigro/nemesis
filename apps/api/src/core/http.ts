import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from './errors.js'

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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

  console.error(JSON.stringify({ level: 'error', message: 'unhandled', err: String(err) }))
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Unexpected server error',
      details: [],
    },
  })
}
