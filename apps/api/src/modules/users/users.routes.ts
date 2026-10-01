import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import {
  assignUserModulesController,
  createUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from './users.controller.js'

/** Mounted behind requireAuth + requireAccountManager; the service enforces customer scope. */
export const usersRouter = Router()

usersRouter.get('/', asyncHandler(listUsersController))
usersRouter.post('/', asyncHandler(createUserController))
usersRouter.get('/:userId', asyncHandler(getUserController))
usersRouter.patch('/:userId', asyncHandler(updateUserController))
usersRouter.put('/:userId/modules', asyncHandler(assignUserModulesController))
