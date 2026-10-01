import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import { requirePlatformAdmin } from '../auth/auth.middleware.js'
import {
  assignCustomerModulesController,
  createCustomerController,
  getCustomerController,
  listCustomersController,
  updateCustomerController,
} from './customers.controller.js'

/** Mounted behind requireAuth + requireAccountManager. Contract changes are IMP-only. */
export const customersRouter = Router()

customersRouter.get('/', asyncHandler(listCustomersController))
customersRouter.post('/', requirePlatformAdmin, asyncHandler(createCustomerController))
customersRouter.get('/:customerId', asyncHandler(getCustomerController))
customersRouter.patch('/:customerId', requirePlatformAdmin, asyncHandler(updateCustomerController))
customersRouter.put('/:customerId/modules', requirePlatformAdmin, asyncHandler(assignCustomerModulesController))
