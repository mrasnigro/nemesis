import type { Request, Response } from 'express'
import {
  assignCustomerModules,
  createCustomer,
  getCustomerFor,
  listCustomersFor,
  updateCustomerFor,
} from './customers.service.js'
import { customerCreate, customerListQuery, customerUpdate, moduleAssignment } from './customers.schemas.js'

function actor(req: Request) {
  return { user: req.user!, ip: req.ip }
}

export async function listCustomersController(req: Request, res: Response) {
  res.json(await listCustomersFor(req.user!, customerListQuery.parse(req.query)))
}

export async function getCustomerController(req: Request, res: Response) {
  res.json({ data: await getCustomerFor(req.user!, req.params.customerId) })
}

export async function createCustomerController(req: Request, res: Response) {
  const customer = await createCustomer(actor(req), customerCreate.parse(req.body))
  res.status(201).json({ data: customer })
}

export async function updateCustomerController(req: Request, res: Response) {
  res.json({ data: await updateCustomerFor(actor(req), req.params.customerId, customerUpdate.parse(req.body)) })
}

export async function assignCustomerModulesController(req: Request, res: Response) {
  const { moduleIds } = moduleAssignment.parse(req.body)
  res.json({ data: await assignCustomerModules(actor(req), req.params.customerId, moduleIds) })
}
