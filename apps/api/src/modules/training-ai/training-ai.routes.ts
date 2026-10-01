import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import { requireAuth, requireModule } from '../auth/auth.middleware.js'
import {
  createPersonaController,
  createScenarioController,
  createSessionController,
  createTemplateController,
  getPersonaController,
  getScenarioController,
  getSessionController,
  getTemplateController,
  listPersonasController,
  listScenariosController,
  listSessionsController,
  listTemplatesController,
  updatePersonaController,
  updateScenarioController,
  updateTemplateController,
} from './training-ai.controller.js'

export const trainingAiRouter = Router()

trainingAiRouter.use(requireAuth, requireModule('training-ai'))

trainingAiRouter.get('/personas', asyncHandler(listPersonasController))
trainingAiRouter.post('/personas', asyncHandler(createPersonaController))
trainingAiRouter.get('/personas/:personaId', asyncHandler(getPersonaController))
trainingAiRouter.patch('/personas/:personaId', asyncHandler(updatePersonaController))

trainingAiRouter.get('/templates', asyncHandler(listTemplatesController))
trainingAiRouter.post('/templates', asyncHandler(createTemplateController))
trainingAiRouter.get('/templates/:templateId', asyncHandler(getTemplateController))
trainingAiRouter.patch('/templates/:templateId', asyncHandler(updateTemplateController))

trainingAiRouter.get('/scenarios', asyncHandler(listScenariosController))
trainingAiRouter.post('/scenarios', asyncHandler(createScenarioController))
trainingAiRouter.get('/scenarios/:scenarioId', asyncHandler(getScenarioController))
trainingAiRouter.patch('/scenarios/:scenarioId', asyncHandler(updateScenarioController))

trainingAiRouter.get('/sessions', asyncHandler(listSessionsController))
trainingAiRouter.post('/sessions', asyncHandler(createSessionController))
trainingAiRouter.get('/sessions/:sessionId', asyncHandler(getSessionController))
