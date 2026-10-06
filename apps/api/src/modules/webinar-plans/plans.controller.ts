import type { Request, Response } from 'express'
import { AppError } from '../../core/errors.js'
import { pageMeta } from '../../core/list.js'
import {
  createPlanFor,
  deletePlanFor,
  listPlansFor,
  listSubscriptionsFor,
  publicPlans,
  recordPaymentFor,
  setSubscriptionFor,
  subscriptionDetailFor,
  subscriptionFor,
  updatePlanFor,
  voidPaymentFor,
  type PlanActor,
} from './plans.service.js'
import { paymentCreate, planCreate, planPatch, subscriptionListQuery, subscriptionWrite } from './plans.schemas.js'

function planActor(req: Request): PlanActor {
  return { userId: req.user!.id, name: req.user!.name, ip: req.ip }
}

// --------------------------------------------- the customer's own subscription

/** Everyone with the module sees the plan and its limits; the payment history is for customer administrators. */
export async function mySubscriptionController(req: Request, res: Response) {
  const user = req.user!
  if (!user.customerId) throw new AppError(403, 'MODULE_FORBIDDEN', 'User is not bound to a customer')
  res.json({ data: await subscriptionFor(user.customerId, user.profile === 'customer_admin' || user.role === 'admin') })
}

export async function availablePlansController(_req: Request, res: Response) {
  res.json({ data: await publicPlans() })
}

// ---------------------------------------------------------- IMP administrators

export async function listPlansController(_req: Request, res: Response) {
  res.json({ data: await listPlansFor() })
}

export async function createPlanController(req: Request, res: Response) {
  res.status(201).json({ data: await createPlanFor(planActor(req), planCreate.parse(req.body)) })
}

export async function updatePlanController(req: Request, res: Response) {
  res.json({ data: await updatePlanFor(planActor(req), req.params.planId, planPatch.parse(req.body)) })
}

export async function deletePlanController(req: Request, res: Response) {
  await deletePlanFor(planActor(req), req.params.planId)
  res.status(204).end()
}

export async function listSubscriptionsController(req: Request, res: Response) {
  const query = subscriptionListQuery.parse(req.query)
  const result = await listSubscriptionsFor(query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function subscriptionDetailController(req: Request, res: Response) {
  res.json({ data: await subscriptionDetailFor(req.params.customerId) })
}

export async function setSubscriptionController(req: Request, res: Response) {
  res.json({ data: await setSubscriptionFor(planActor(req), req.params.customerId, subscriptionWrite.parse(req.body)) })
}

export async function recordPaymentController(req: Request, res: Response) {
  res.status(201).json({ data: await recordPaymentFor(planActor(req), req.params.customerId, paymentCreate.parse(req.body)) })
}

export async function voidPaymentController(req: Request, res: Response) {
  res.json({ data: await voidPaymentFor(planActor(req), req.params.customerId, req.params.paymentId) })
}
