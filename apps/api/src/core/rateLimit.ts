import type { NextFunction, Request, Response } from 'express'
import { AppError } from './errors.js'

type Bucket = { count: number; resetAt: number }

/**
 * Fixed-window limiter kept in process memory. Good enough for a single API instance;
 * move to Redis before running more than one replica.
 */
export function rateLimit(options: { windowMs: number; max: number; key: (req: Request) => string }) {
  const buckets = new Map<string, Bucket>()

  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, options.windowMs)
  sweep.unref()

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    const key = options.key(req)
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs }
      buckets.set(key, bucket)
    }
    bucket.count += 1
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)))
      next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.'))
      return
    }
    next()
  }
}
