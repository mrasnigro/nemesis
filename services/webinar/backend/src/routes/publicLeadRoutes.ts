import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getConnection } from '../db/index.js';

const router = Router();

// 1. Validar código de acesso
router.post('/validate-access-code', async (req: Request, res: Response): Promise<any> => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Código de acesso é obrigatório' });
    }

    const connection = await getConnection();

    // Buscar código de acesso
    // M102.46: Removida a trava de expires_at > NOW() para evitar problemas de fuso horário
    // e permitir que o usuário acesse mesmo que o código tecnicamente tenha expirado no banco
    const [rows]: any = await connection.execute(
      `SELECT * FROM webinar_access_codes 
       WHERE code = ? AND is_active = TRUE`,
      [code]
    );

    if (rows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Código de acesso inválido ou expirado' });
    }

    const accessCode = rows[0];

    // Buscar dados do webinar
    const [webinarRows]: any = await connection.execute(
      `SELECT * FROM webinars WHERE id = ?`,
      [accessCode.webinar_id]
    );
    
    await connection.end();

    if (webinarRows.length === 0) {
      return res.status(404).json({ error: 'Webinar não encontrado' });
    }

    res.json({
      accessCode: {
        id: accessCode.id,
        code: accessCode.code,
        scheduledAt: accessCode.scheduled_at,
        expiresAt: accessCode.expires_at,
        maxLeads: accessCode.max_leads,
        currentLeads: accessCode.current_leads,
      },
      webinar: webinarRows[0],
    });
  } catch (error: any) {
    console.error('Erro ao validar código:', error);
    res.status(500).json({ error: 'Erro ao validar código de acesso' });
  }
});

// 2. Registrar lead
router.post('/register-lead', async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('=== POST /register-lead ===');
    const { accessCodeId, name, email, phone, webinarId, clientId } = req.body;

    if (!accessCodeId || !name || !email || !webinarId) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    const finalClientId = clientId || 1;
    const connection = await getConnection();

    // Criar novo lead
    await connection.execute(
      `INSERT INTO leads (client_id, webinar_id, name, email, phone, status)
       VALUES (?, ?, ?, ?, ?, 'registered')`,
      [finalClientId, webinarId, name, email, phone || null]
    );

    // Obter o ID do lead criado
    const [newLeads]: any = await connection.execute(
      `SELECT id FROM leads WHERE email = ? AND webinar_id = ? ORDER BY created_at DESC LIMIT 1`,
      [email, webinarId]
    );
    const leadId = newLeads[0]?.id || 'unknown';

    // Incrementar contador de leads no código de acesso
    try {
      await connection.execute(
        `UPDATE webinar_access_codes SET current_leads = current_leads + 1 WHERE id = ?`,
        [accessCodeId]
      );
    } catch (err) {
      console.warn('Aviso: Não foi possível incrementar contador de leads');
    }

    await connection.end();

    res.status(201).json({
      success: true,
      leadId,
      message: 'Lead registrado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao registrar lead:', error);
    res.status(500).json({ error: 'Erro ao registrar lead' });
  }
});

// 3. Obter dados do webinar para o lead
router.get('/webinar/:accessCodeId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { accessCodeId } = req.params;
    const connection = await getConnection();

    const [accessCodeRows]: any = await connection.execute(
      `SELECT * FROM webinar_access_codes WHERE id = ? AND is_active = TRUE`,
      [accessCodeId]
    );

    if (accessCodeRows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Código de acesso não encontrado' });
    }

    const accessCode = accessCodeRows[0];

    const [webinarRows]: any = await connection.execute(
      `SELECT * FROM webinars WHERE id = ?`,
      [accessCode.webinar_id]
    );

    await connection.end();

    if (webinarRows.length === 0) {
      return res.status(404).json({ error: 'Webinar não encontrado' });
    }

    res.json({
      webinar: webinarRows[0],
      accessCode: {
        id: accessCode.id,
        scheduledAt: accessCode.scheduled_at,
        expiresAt: accessCode.expires_at,
      },
    });
  } catch (error: any) {
    console.error('Erro ao obter webinar:', error);
    res.status(500).json({ error: 'Erro ao obter dados do webinar' });
  }
});

// 6. Atualizar status do lead para "attended"
router.post('/mark-attended', async (req: Request, res: Response): Promise<any> => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId é obrigatório' });

    const connection = await getConnection();
    await connection.execute(
      `UPDATE leads SET status = 'attended', attended_at = NOW() WHERE id = ?`,
      [leadId]
    );
    await connection.end();

    res.json({ success: true, message: 'Lead marcado como presente' });
  } catch (error: any) {
    console.error('Erro ao marcar lead como presente:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do lead' });
  }
});

router.get("/webinar-details/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const webinarId = parseInt(req.params.id);
    const connection = await getConnection();

    const [webinarRows]: any = await connection.execute(
      `SELECT id, title, description, status, presenter_name, presenter_bio, presenter_image_url FROM webinars WHERE id = ?`,
      [webinarId]
    );
    await connection.end();

    if (webinarRows.length === 0) {
      return res.status(404).json({ error: "Webinar não encontrado" });
    }

    res.json(webinarRows[0]);
  } catch (error: any) {
    console.error("Erro ao obter detalhes do webinar público:", error);
    res.status(500).json({ error: "Erro ao obter detalhes do webinar" });
  }
});

// Rotas públicas de chat para leads - M102.45: Corrigido para usar a tabela chat_messages correta
router.get("/chat/:webinarId", async (req: Request, res: Response): Promise<any> => {
  try {
    const webinarId = parseInt(req.params.webinarId);
    const connection = await getConnection();

    const [messages]: any = await connection.execute(
      `SELECT id, webinar_id, participant_id, sender_name, message, created_at 
       FROM chat_messages 
       WHERE webinar_id = ? 
       ORDER BY created_at ASC 
       LIMIT 200`,
      [webinarId]
    );
    await connection.end();

    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      userName: msg.sender_name || 'Anônimo',
      message: msg.message,
      timestamp: msg.created_at,
      role: msg.participant_id ? 'participant' : 'client'
    }));

    res.json(formattedMessages);
  } catch (error: any) {
    console.error("Erro ao obter chat público:", error);
    res.status(500).json({ error: "Erro ao obter chat" });
  }
});

router.post("/chat/:webinarId", async (req: Request, res: Response): Promise<any> => {
  try {
    const webinarId = parseInt(req.params.webinarId);
    const { message, userName, role } = req.body;

    if (!message || !userName) {
      return res.status(400).json({ error: "Mensagem e nome de usuário são obrigatórios" });
    }

    const connection = await getConnection();

    await connection.execute(
      `INSERT INTO chat_messages (webinar_id, participant_id, sender_name, message, timestamp_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [webinarId, role === 'participant' ? 1 : null, userName, message, Math.floor(Date.now() / 1000)]
    );

    await connection.end();

    res.status(201).json({ success: true });
  } catch (error: any) {
    console.error("Erro ao enviar mensagem pública:", error);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

export default router;
