import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createWebinar, getClientWebinarById, updateWebinar, deleteWebinar, getClientStudioWebinarById, updateWebinarStatus, getStudioChat, postStudioChat } from '../controllers/clientWebinarController.js';
import { getClientWebinars } from '../controllers/clientController.js'; // Reutilizar a função de listar webinars do cliente

const router = Router();

// Rotas protegidas por autenticação de cliente
router.use(authMiddleware);

// Criar um novo webinar
router.post('/', createWebinar);

// Obter todos os webinars do cliente (reutilizando a função existente)
router.get('/', getClientWebinars);

// Obter um webinar específico do cliente
router.get('/:id', getClientWebinarById);

// Atualizar um webinar específico do cliente
router.put('/:id', updateWebinar);

// Deletar um webinar específico do cliente
router.delete('/:id', deleteWebinar);

// Obter detalhes do webinar para o estúdio
router.get('/studio/:id', getClientStudioWebinarById);

// Atualizar status do webinar no estúdio
router.post('/studio/:id/status', updateWebinarStatus);

// Obter mensagens do chat do estúdio
router.get('/studio/:id/chat', getStudioChat);

// Enviar mensagem para o chat do estúdio
router.post('/studio/:id/chat', postStudioChat);

// Obter detalhes do webinar para visualização ao vivo (sem restrição de status)
router.get('/live/:id', getClientStudioWebinarById);

export default router;
