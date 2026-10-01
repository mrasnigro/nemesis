import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import { requireAuth, requireModule } from '../auth/auth.middleware.js'
import {
  createPersonaController,
  createScenarioController,
  createTemplateController,
  deletePersonaController,
  deleteScenarioController,
  deleteTemplateController,
  finishSessionController,
  getPersonaController,
  getScenarioController,
  getSessionController,
  getTemplateController,
  installStarterCatalogController,
  listPersonasController,
  listScenariosController,
  listSessionsController,
  listTemplatesController,
  metricsController,
  sendMessageController,
  startSessionController,
  statusController,
  updatePersonaController,
  updateScenarioController,
  updateTemplateController,
} from './training-ai.controller.js'

export const trainingAiRouter = Router()

trainingAiRouter.use(requireAuth, requireModule('training-ai'))

trainingAiRouter.get('/status', statusController)
trainingAiRouter.get('/metrics', asyncHandler(metricsController))

trainingAiRouter.get('/personas', asyncHandler(listPersonasController))
trainingAiRouter.post('/personas', asyncHandler(createPersonaController))
trainingAiRouter.get('/personas/:personaId', asyncHandler(getPersonaController))
trainingAiRouter.patch('/personas/:personaId', asyncHandler(updatePersonaController))
trainingAiRouter.delete('/personas/:personaId', asyncHandler(deletePersonaController))

trainingAiRouter.get('/templates', asyncHandler(listTemplatesController))
trainingAiRouter.post('/templates', asyncHandler(createTemplateController))
trainingAiRouter.get('/templates/:templateId', asyncHandler(getTemplateController))
trainingAiRouter.patch('/templates/:templateId', asyncHandler(updateTemplateController))
trainingAiRouter.delete('/templates/:templateId', asyncHandler(deleteTemplateController))

trainingAiRouter.get('/scenarios', asyncHandler(listScenariosController))
trainingAiRouter.post('/scenarios', asyncHandler(createScenarioController))
trainingAiRouter.get('/scenarios/:scenarioId', asyncHandler(getScenarioController))
trainingAiRouter.patch('/scenarios/:scenarioId', asyncHandler(updateScenarioController))
trainingAiRouter.delete('/scenarios/:scenarioId', asyncHandler(deleteScenarioController))

trainingAiRouter.post('/starter-catalog', asyncHandler(installStarterCatalogController))

trainingAiRouter.get('/sessions', asyncHandler(listSessionsController))
trainingAiRouter.post('/sessions', asyncHandler(startSessionController))
trainingAiRouter.get('/sessions/:sessionId', asyncHandler(getSessionController))
trainingAiRouter.post('/sessions/:sessionId/messages', asyncHandler(sendMessageController))
trainingAiRouter.post('/sessions/:sessionId/finish', asyncHandler(finishSessionController))
