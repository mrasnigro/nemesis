import express, { Request, Response } from 'express';
import { getConnection } from '../db/index.js';

const router = express.Router();

// 1. Obter todos os leads de um webinar
router.get('/webinars/:webinarId/leads', async (req: Request, res: Response): Promise<any> => {
  try {
    const { webinarId } = req.params;

    const connection = await getConnection();

    const [leads]: any = await connection.execute(
      `SELECT l.id, l.name, l.email, l.phone, l.status, l.created_at as registeredAt, l.attended_at as attendedAt
       FROM leads l
       WHERE l.webinar_id = ?
       ORDER BY l.created_at DESC`,
      [webinarId]
    );

    // Contar mensagens por lead
    const leadsWithMessages = await Promise.all(
      leads.map(async (lead: any) => {
        const [messages]: any = await connection.execute(
          `SELECT COUNT(*) as count FROM lead_chat_messages WHERE lead_id = ?`,
          [lead.id]
        );
        return {
          ...lead,
          messageCount: messages[0].count || 0,
        };
      })
    );

    await connection.end();

    res.json({
      leads: leadsWithMessages,
      total: leadsWithMessages.length,
      attended: leadsWithMessages.filter((l: any) => l.status === 'attended').length,
    });
  } catch (error: any) {
    console.error('Erro ao obter leads do webinar:', error);
    res.status(500).json({ error: 'Erro ao obter leads' });
  }
});

// 2. Obter detalhes de um lead específico
router.get('/webinars/:webinarId/leads/:leadId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { webinarId, leadId } = req.params;

    const connection = await getConnection();

    const [leads]: any = await connection.execute(
      `SELECT l.* FROM leads l WHERE l.id = ? AND l.webinar_id = ?`,
      [leadId, webinarId]
    );

    if (leads.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const lead = leads[0];

    // Obter mensagens do lead
    const [messages]: any = await connection.execute(
      `SELECT id, message, created_at FROM lead_chat_messages WHERE lead_id = ? ORDER BY created_at DESC`,
      [leadId]
    );

    await connection.end();

    res.json({
      lead: {
        ...lead,
        messages: messages || [],
      },
    });
  } catch (error: any) {
    console.error('Erro ao obter detalhes do lead:', error);
    res.status(500).json({ error: 'Erro ao obter detalhes' });
  }
});

// 3. Obter estatísticas de leads por webinar
router.get('/webinars/:webinarId/leads-stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const { webinarId } = req.params;

    const connection = await getConnection();

    const [total]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM leads WHERE webinar_id = ?`,
      [webinarId]
    );

    const [attended]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM leads WHERE webinar_id = ? AND status = 'attended'`,
      [webinarId]
    );

    const [registered]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM leads WHERE webinar_id = ? AND status = 'registered'`,
      [webinarId]
    );

    const [noShow]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM leads WHERE webinar_id = ? AND status = 'no-show'`,
      [webinarId]
    );

    const [totalMessages]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM lead_chat_messages lcm
       INNER JOIN leads l ON lcm.lead_id = l.id
       WHERE l.webinar_id = ?`,
      [webinarId]
    );

    await connection.end();

    res.json({
      total: total[0].count,
      attended: attended[0].count,
      registered: registered[0].count,
      noShow: noShow[0].count,
      totalMessages: totalMessages[0].count,
      attendanceRate: total[0].count > 0 ? ((attended[0].count / total[0].count) * 100).toFixed(2) : 0,
    });
  } catch (error: any) {
    console.error('Erro ao obter stats de leads:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

// 4. Exportar leads em CSV
router.get('/webinars/:webinarId/leads/export/csv', async (req: Request, res: Response): Promise<any> => {
  try {
    const { webinarId } = req.params;

    const connection = await getConnection();

    const [leads]: any = await connection.execute(
      `SELECT l.name, l.email, l.phone, l.status, l.created_at, l.attended_at
       FROM leads l
       WHERE l.webinar_id = ?
       ORDER BY l.created_at DESC`,
      [webinarId]
    );

    await connection.end();

    // Gerar CSV
    const headers = ['Nome', 'Email', 'Telefone', 'Status', 'Data de Registro', 'Data de Participação'];
    const rows = leads.map((lead: any) => [
      lead.name,
      lead.email,
      lead.phone,
      lead.status,
      new Date(lead.created_at).toLocaleString('pt-BR'),
      lead.attended_at ? new Date(lead.attended_at).toLocaleString('pt-BR') : 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-webinar-${webinarId}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Erro ao exportar leads:', error);
    res.status(500).json({ error: 'Erro ao exportar leads' });
  }
});

export default router;
