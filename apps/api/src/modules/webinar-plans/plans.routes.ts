import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import {
  availablePlansController,
  createPlanController,
  deletePlanController,
  listPlansController,
  listSubscriptionsController,
  mySubscriptionController,
  recordPaymentController,
  setSubscriptionController,
  subscriptionDetailController,
  updatePlanController,
  voidPaymentController,
} from './plans.controller.js'

/** Added to the signed-in Webinar router (`/api/modules/webinar`), after it has checked the session and the module. */
export const mySubscriptionRouter = Router()
mySubscriptionRouter.get('/subscription', asyncHandler(mySubscriptionController))
mySubscriptionRouter.get('/plans', asyncHandler(availablePlansController))

/** `/api/admin/webinar`, behind the platform-administrator check: the catalog, subscriptions and payments. */
export const webinarPlansAdminRouter = Router()
webinarPlansAdminRouter.get('/plans', asyncHandler(listPlansController))
webinarPlansAdminRouter.post('/plans', asyncHandler(createPlanController))
webinarPlansAdminRouter.patch('/plans/:planId', asyncHandler(updatePlanController))
webinarPlansAdminRouter.delete('/plans/:planId', asyncHandler(deletePlanController))

webinarPlansAdminRouter.get('/subscriptions', asyncHandler(listSubscriptionsController))
webinarPlansAdminRouter.get('/subscriptions/:customerId', asyncHandler(subscriptionDetailController))
webinarPlansAdminRouter.put('/subscriptions/:customerId', asyncHandler(setSubscriptionController))
webinarPlansAdminRouter.post('/subscriptions/:customerId/payments', asyncHandler(recordPaymentController))
webinarPlansAdminRouter.delete('/subscriptions/:customerId/payments/:paymentId', asyncHandler(voidPaymentController))
