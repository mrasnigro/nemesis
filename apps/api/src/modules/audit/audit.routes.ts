import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { AppError } from '../../core/errors.js'
import { asyncHandler } from '../../core/http.js'
import { pageMeta, pageQuery } from '../../core/list.js'
import { managedCustomerId } from '../auth/auth.middleware.js'
import { listAudit } from './audit.repository.js'

const auditListQuery = pageQuery.extend({
  customerId: z.string().length(26).optional(),
})

/** Mounted behind requireAuth + requireAccountManager. */
export const auditRouter = Router()

auditRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = auditListQuery.parse(req.query)
    const scope = managedCustomerId(req.user!)
    if (scope && query.customerId && query.customerId !== scope) {
      throw new AppError(404, 'NOT_FOUND', 'Customer not found')
    }
    const { rows, total } = await listAudit({
      customerId: scope ?? query.customerId ?? null,
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
    })
    res.json({ data: rows, page: pageMeta(query.page, query.pageSize, total) })
  }),
)
