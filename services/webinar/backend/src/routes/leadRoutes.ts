import express, { Router, Request, Response } from 'express';
import { leadService } from '../services/leadService.js';

const router: Router = express.Router();

/**
 * POST /api/leads/register
 * Registrar um novo lead para um webinar
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { client_id, name, email, phone, webinar_id, session_id } = req.body;

    if (!client_id || !name || !email) {
      res.status(400).json({ error: 'Nome, email e client_id são obrigatórios' });
      return;
    }

    // Verificar se lead já existe para esta sessão
    if (session_id) {
      const exists = await leadService.leadExists(client_id, email, session_id);
      if (exists) {
        res.status(409).json({ error: 'Este email já está registrado para esta sessão' });
        return;
      }
    }

    const leadId = await leadService.registerLead({
      client_id,
      name,
      email,
      phone,
      webinar_id,
      session_id,
    });

    res.status(201).json({
      message: 'Lead registrado com sucesso',
      leadId,
    });
  } catch (error: any) {
    console.error('Erro ao registrar lead:', error);
    res.status(500).json({ error: 'Erro ao registrar lead' });
  }
  return;
});

/**
 * GET /api/leads/client/:clientId
 * Obter leads de um cliente
 */
router.get('/client/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const { webinar_id, status } = req.query;
    
    console.log(`📝 GET /api/leads/client/${clientId}`);
    console.log(`   webinar_id: ${webinar_id}, status: ${status}`);

    const leads = await leadService.getLeadsByClient(Number(clientId), {
      webinar_id: webinar_id ? Number(webinar_id) : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    console.log(`   Retornando ${leads?.length || 0} leads`);
    res.json({ leads });
  } catch (error: any) {
    console.error('❌ Erro ao obter leads:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao obter leads', details: error.message });
  }
  return;
});

/**
 * GET /api/leads/session/:sessionId
 * Obter leads de uma sessão específica
 */
router.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    console.log(`📝 GET /api/leads/session/${sessionId}`);

    const leads = await leadService.getLeadsBySession(Number(sessionId));

    console.log(`   Retornando ${leads?.length || 0} leads`);
    res.json({ leads });
  } catch (error: any) {
    console.error('❌ Erro ao obter leads da sessão:', error.message);
    res.status(500).json({ error: 'Erro ao obter leads da sessão', details: error.message });
  }
  return;
});

/**
 * GET /api/leads/stats/:clientId
 * Obter estatísticas de leads
 */
router.get('/stats/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    
    console.log(`📝 GET /api/leads/stats/${clientId}`);

    const stats = await leadService.getLeadsStats(Number(clientId));

    console.log(`   Retornando stats:`, stats);
    res.json({ stats });
  } catch (error: any) {
    console.error('❌ Erro ao obter estatísticas:', error.message);
    res.status(500).json({ error: 'Erro ao obter estatísticas', details: error.message });
  }
  return;
});

/**
 * PUT /api/leads/:leadId/status
 * Atualizar status do lead
 */
router.put('/:leadId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status é obrigatório' });
      return;
    }

    const updated = await leadService.updateLeadStatus(Number(leadId), status);

    if (!updated) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
  return;
});

/**
 * PUT /api/leads/:leadId/attended
 * Marcar lead como presente
 */
router.put('/:leadId/attended', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const updated = await leadService.markLeadAsAttended(Number(leadId));

    if (!updated) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    res.json({ message: 'Lead marcado como presente' });
  } catch (error: any) {
    console.error('Erro ao marcar presença:', error);
    res.status(500).json({ error: 'Erro ao marcar presença' });
  }
  return;
});

/**
 * DELETE /api/leads/:leadId
 * Deletar lead
 */
router.delete('/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const deleted = await leadService.deleteLead(Number(leadId));

    if (!deleted) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    res.json({ message: 'Lead deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar lead:', error);
    res.status(500).json({ error: 'Erro ao deletar lead' });
  }
  return;
});

export default router;
