import express, { Request, Response } from 'express';
import { affectedRows, db } from '../db/index.js';
import { clientSubscriptions, users, plans } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const router = express.Router();

// 1. Obter todos os pagamentos (assinaturas)
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const allPayments = await db.select({
      id: clientSubscriptions.id,
      clientId: clientSubscriptions.clientId,
      clientName: users.name,
      planName: plans.name,
      amount: plans.price,
      status: clientSubscriptions.paymentStatus,
      date: clientSubscriptions.createdAt,
      expiresAt: clientSubscriptions.expiresAt,
      lastPaymentDate: clientSubscriptions.lastPaymentDate,
    })
    .from(clientSubscriptions)
    .leftJoin(users, eq(clientSubscriptions.clientId, users.id))
    .leftJoin(plans, eq(clientSubscriptions.planId, plans.id))
    .orderBy(clientSubscriptions.createdAt);

    res.json({ payments: allPayments });
  } catch (error: any) {
    console.error('Erro ao obter pagamentos:', error);
    res.status(500).json({ error: 'Erro ao obter pagamentos' });
  }
});

// 2. Obter um pagamento específico (assinatura)
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const paymentId = parseInt(req.params.id);

    const payment = await db.select({
      id: clientSubscriptions.id,
      clientId: clientSubscriptions.clientId,
      clientName: users.name,
      planName: plans.name,
      amount: plans.price,
      status: clientSubscriptions.paymentStatus,
      startedAt: clientSubscriptions.startedAt,
      expiresAt: clientSubscriptions.expiresAt,
      paymentMethod: clientSubscriptions.paymentMethod,
      autoRenewal: clientSubscriptions.autoRenewal,
      createdAt: clientSubscriptions.createdAt,
    })
    .from(clientSubscriptions)
    .leftJoin(users, eq(clientSubscriptions.clientId, users.id))
    .leftJoin(plans, eq(clientSubscriptions.planId, plans.id))
    .where(eq(clientSubscriptions.id, paymentId))
    .limit(1);

    if (payment.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json({ payment: payment[0] });
  } catch (error: any) {
    console.error('Erro ao obter pagamento:', error);
    res.status(500).json({ error: 'Erro ao obter pagamento' });
  }
});

// 3. Criar novo pagamento (assinatura)
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { clientId, planId, status, amount, paymentStatus, paymentMethod, autoRenewal, startedAt, expiresAt } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId é obrigatório' });
    }

    // Fallback for planId if only amount is provided
    let pId = planId ? parseInt(planId) : null;
    if (!pId && amount) {
      const foundPlan = await db.select().from(plans).where(eq(plans.price, amount.toString())).limit(1);
      if (foundPlan.length > 0) pId = foundPlan[0].id;
    }
    
    // If still no pId, default to Básico (2)
    if (!pId) pId = 2;

    const finalStatus = paymentStatus || status || 'pending';
    const finalExpiresAt = expiresAt ? new Date(expiresAt) : new Date(new Date().setMonth(new Date().getMonth() + 1));
    const startedAtDate = startedAt ? new Date(startedAt) : new Date();

    const [created] = await db.insert(clientSubscriptions).values({
      clientId: parseInt(clientId),
      planId: pId,
      status: 'active', // Default status for new subscriptions
      paymentStatus: finalStatus,
      paymentMethod: paymentMethod || null,
      autoRenewal: autoRenewal !== undefined ? (autoRenewal ? 1 : 0) : 1,
      startedAt: startedAtDate,
      expiresAt: finalExpiresAt,
    }).$returningId();

    const newPaymentId = created.id;

    // Se o pagamento criado já for 'paid', criar o próximo registro pendente
    if (finalStatus === 'paid') {
      const nextExpiry = new Date(finalExpiresAt);
      nextExpiry.setMonth(nextExpiry.getMonth() + 1);

      await db.insert(clientSubscriptions).values({
        clientId: parseInt(clientId),
        planId: pId,
        status: 'active',
        paymentStatus: 'pending',
        paymentMethod: null,
        autoRenewal: autoRenewal !== undefined ? (autoRenewal ? 1 : 0) : 1,
        startedAt: finalExpiresAt,
        expiresAt: nextExpiry,
      });
    }

    res.status(201).json({
      success: true,
      paymentId: newPaymentId,
      message: 'Pagamento (assinatura) criado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

// 4. Atualizar pagamento (assinatura)
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const paymentId = parseInt(req.params.id);
    const { paymentStatus, paymentMethod, autoRenewal, expiresAt, planId } = req.body;

    const updates: any = {};
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (autoRenewal !== undefined) updates.autoRenewal = autoRenewal ? 1 : 0;
    if (expiresAt) updates.expiresAt = new Date(expiresAt).toISOString();
    if (planId) updates.planId = parseInt(planId);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar fornecido' });
    }

    const updateResult = await db.update(clientSubscriptions).set(updates).where(eq(clientSubscriptions.id, paymentId));

    if (affectedRows(updateResult) === 0) {
      return res.status(404).json({ error: 'Pagamento (assinatura) não encontrado' });
    }

    // Se o pagamento foi confirmado (paid), criar o próximo registro pendente
    if (paymentStatus === 'paid') {
      const currentSub = await db.select().from(clientSubscriptions).where(eq(clientSubscriptions.id, paymentId)).limit(1);
      
      if (currentSub.length > 0) {
        const sub = currentSub[0];
        const nextExpiry = new Date(sub.expiresAt || new Date());
        // Adiciona exatamente 1 mês mantendo o dia se possível
        nextExpiry.setMonth(nextExpiry.getMonth() + 1);

        // Usar o planId atualizado (do registro que acabou de ser pago) para a próxima fatura
        await db.insert(clientSubscriptions).values({
          clientId: sub.clientId,
          planId: sub.planId, // Este já é o valor atualizado pelo db.update anterior
          status: 'active',
          paymentStatus: 'pending',
          paymentMethod: null,
          autoRenewal: sub.autoRenewal,
          startedAt: sub.expiresAt || new Date(),
          expiresAt: nextExpiry,
        });

        // Nota: O plano do cliente é gerenciado via client_subscriptions, não há campo planId em users.
      }
    }

    res.json({
      success: true,
      message: 'Pagamento (assinatura) atualizado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao atualizar pagamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
});

// 5. Deletar pagamento (assinatura)
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const paymentId = parseInt(req.params.id);

    const deleteResult = await db.delete(clientSubscriptions).where(eq(clientSubscriptions.id, paymentId));

    if (affectedRows(deleteResult) === 0) {
      return res.status(404).json({ error: 'Pagamento (assinatura) não encontrado' });
    }

    res.json({
      success: true,
      message: 'Pagamento (assinatura) deletado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao deletar pagamento:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento' });
  }
});

// 6. Obter estatísticas de pagamentos
router.get('/stats', async (_req: Request, res: Response): Promise<any> => {
  try {
    const totalRevenueResult = await db.select({ total: sql<number>`sum(${plans.price})` })
      .from(clientSubscriptions)
      .leftJoin(plans, eq(clientSubscriptions.planId, plans.id))
      .where(eq(clientSubscriptions.paymentStatus, 'paid'));
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const pendingPaymentsResult = await db.select({ count: sql<number>`count(*)` })
      .from(clientSubscriptions)
      .where(eq(clientSubscriptions.paymentStatus, 'pending'));
    const pendingPayments = pendingPaymentsResult[0]?.count || 0;

    const completedPaymentsResult = await db.select({ count: sql<number>`count(*)` })
      .from(clientSubscriptions)
      .where(eq(clientSubscriptions.paymentStatus, 'paid'));
    const completedPayments = completedPaymentsResult[0]?.count || 0;

    res.json({
      totalRevenue,
      pendingPayments,
      completedPayments,
    });
  } catch (error: any) {
    console.error('Erro ao obter stats de pagamentos:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

export default router;
