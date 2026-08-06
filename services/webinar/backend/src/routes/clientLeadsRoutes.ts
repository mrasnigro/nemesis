import { Router, Request, Response } from 'express';
import { leadService } from '../services/leadService.js';

const router = Router();

// GET /api/client/leads - Obter todos os leads do cliente
router.get('/leads', async (req: Request, res: Response): Promise<any> => {
  try {
    const clientId = (req as any).user?.clientId || 1;

    // Buscar leads do cliente usando leadService
    const leads = await leadService.getLeadsByClient(clientId);

    res.json({
      success: true,
      leads: leads || []
    });
  } catch (error: any) {
    console.error('Erro ao obter leads:', error);
    res.status(500).json({ error: 'Erro ao obter leads' });
  }
});

// GET /api/client/webinars/:webinarId/leads - Obter leads de um webinar específico
router.get('/webinars/:webinarId/leads', async (req: Request, res: Response): Promise<any> => {
  try {
    const clientId = (req as any).user?.clientId || 1;
    const { webinarId } = req.params;

    // Buscar leads do webinar usando leadService com filtro
    const leads = await leadService.getLeadsByClient(clientId, { webinar_id: Number(webinarId) });

    res.json({
      success: true,
      leads: leads
    });
  } catch (error: any) {
    console.error('Erro ao obter leads do webinar:', error);
    res.status(500).json({ error: 'Erro ao obter leads' });
  }
});

export default router;
