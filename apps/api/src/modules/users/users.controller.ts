import type { Request, Response } from 'express'
import { moduleAssignment } from '../customers/customers.schemas.js'
import { userCreate, userListQuery, userUpdate } from './users.schemas.js'
import { assignUserModules, createUser, getUserFor, listUsersFor, updateUserFor } from './users.service.js'

function actor(req: Request) {
  return { user: req.user!, ip: req.ip }
}

export async function listUsersController(req: Request, res: Response) {
  res.json(await listUsersFor(req.user!, userListQuery.parse(req.query)))
}

export async function getUserController(req: Request, res: Response) {
  res.json({ data: await getUserFor(req.user!, req.params.userId) })
}

export async function createUserController(req: Request, res: Response) {
  res.status(201).json({ data: await createUser(actor(req), userCreate.parse(req.body)) })
}

export async function updateUserController(req: Request, res: Response) {
  res.json({ data: await updateUserFor(actor(req), req.params.userId, userUpdate.parse(req.body)) })
}

export async function assignUserModulesController(req: Request, res: Response) {
  const { moduleIds } = moduleAssignment.parse(req.body)
  res.json({ data: await assignUserModules(actor(req), req.params.userId, moduleIds) })
}
