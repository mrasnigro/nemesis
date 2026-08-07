import express, { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users, clientSubscriptions, plans } from '../db/schema.js';
import { eq, sql, and } from 'drizzle-orm';

const router = express.Router();

// 1. Obter todos os clientes
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    // Subconsulta para pegar apenas a assinatura mais recente de cada cliente
    const latestSubQuery = db
      .select({
        clientId: clientSubscriptions.clientId,
        maxId: sql<number>`max(${clientSubscriptions.id})`.as('max_id'),
      })
      .from(clientSubscriptions)
      .groupBy(clientSubscriptions.clientId)
      .as('latest_sub');

    const allClients = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      planName: plans.name,
      subscriptionStatus: clientSubscriptions.status,
      subscriptionExpiresAt: clientSubscriptions.expiresAt,
    })
    .from(users)
    .leftJoin(latestSubQuery, eq(users.id, latestSubQuery.clientId))
    .leftJoin(clientSubscriptions, eq(latestSubQuery.maxId, clientSubscriptions.id))
    .leftJoin(plans, eq(clientSubscriptions.planId, plans.id))
    .where(eq(users.role, 'client'))
    .orderBy(users.createdAt);

    console.log("Backend allClients createdAt format:", allClients.map(client => client.createdAt));
    res.json({ clients: allClients });
  } catch (error: any) {
    console.error('Erro ao obter clientes:', error);
    res.status(500).json({ error: 'Erro ao obter clientes' });
  }
});

// 2. Obter um cliente específico
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const clientId = parseInt(req.params.id);

    const client = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      companyName: users.companyName,
      phone: users.phone,
      website: users.website,
      profileImageUrl: users.profileImageUrl,
      planName: plans.name,
      planId: plans.id,
      subscriptionStatus: clientSubscriptions.status,
      subscriptionExpiresAt: clientSubscriptions.expiresAt,
    })
    .from(users)
    .leftJoin(clientSubscriptions, eq(users.id, clientSubscriptions.clientId))
    .leftJoin(plans, eq(clientSubscriptions.planId, plans.id))
    .where(and(eq(users.id, clientId), eq(users.role, 'client')))
    .limit(1);

    if (client.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ client: client[0] });
  } catch (error: any) {
    console.error('Erro ao obter cliente:', error);
    res.status(500).json({ error: 'Erro ao obter cliente' });
  }
});

// 3. Criar novo cliente
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password, plan, planId } = req.body;

    // Aceitar tanto 'password' quanto um padrão (para compatibilidade)
    const pwd = password || 'defaultPassword123';
    let pId = planId ? parseInt(planId) : (plan && !isNaN(parseInt(plan)) ? parseInt(plan) : null);
    
    // Se pId ainda for nulo (caso 'plan' seja uma string como 'Trial'), tentamos buscar pelo nome
    if (!pId && typeof plan === 'string') {
      const foundPlan = await db.select().from(plans).where(eq(plans.name, plan)).limit(1);
      if (foundPlan.length > 0) {
        pId = foundPlan[0].id;
      }
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    const [created] = await db.insert(users).values({
      name,
      email,
      passwordHash: pwd,
      role: 'client',
      isActive: 1,
    }).returning({ id: users.id });

    const newClientId = created.id;

    // Lógica de Novo Cliente: Sempre criar dois registros (Trial Pago Vencido Hoje + Básico Pendente Vencendo Próximo Mês)
    if (newClientId) {
      const today = new Date();
      
      // Buscar IDs dos planos de forma segura
      const allPlans = await db.select().from(plans);
      const trialPlan = allPlans.find(p => p.name === 'Trial') || allPlans[0];
      const basicPlan = allPlans.find(p => p.name === 'Básico') || allPlans[1] || allPlans[0];

      // 1. Registro Trial (Pago, Vencimento Hoje)
      await db.insert(clientSubscriptions).values({
        clientId: newClientId,
        planId: trialPlan.id,
        status: 'active',
        startedAt: today.toISOString(),
        expiresAt: today.toISOString(),
        paymentStatus: 'paid',
      });

      // 2. Registro Básico (Pendente, Vencimento Mês Seguinte)
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      await db.insert(clientSubscriptions).values({
        clientId: newClientId,
        planId: basicPlan.id,
        status: 'active',
        startedAt: today.toISOString(),
        expiresAt: nextMonth.toISOString(),
        paymentStatus: 'pending',
      });
      console.log(`[BACKEND] Novo Cliente ${newClientId}: Criado Trial Pago (ID ${trialPlan.id}) e Básico Pendente (ID ${basicPlan.id})`);
    }

    res.status(201).json({
      success: true,
      clientId: newClientId,
      message: 'Cliente criado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// 4. Atualizar cliente
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const clientId = parseInt(req.params.id);
    const { name, email, password, plan, planId, subscriptionStatus, isActive } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.passwordHash = password;
    if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(and(eq(users.id, clientId), eq(users.role, 'client')));
    }

    let pId = planId ? parseInt(planId) : (plan && !isNaN(parseInt(plan)) ? parseInt(plan) : null);
    if (!pId && typeof plan === 'string') {
      const foundPlan = await db.select().from(plans).where(eq(plans.name, plan)).limit(1);
      if (foundPlan.length > 0) {
        pId = foundPlan[0].id;
      }
    }

    if (pId || subscriptionStatus) {
      const existingSubscription = await db.select().from(clientSubscriptions).where(eq(clientSubscriptions.clientId, clientId)).limit(1);
      if (existingSubscription.length > 0) {
        const subUpdates: any = {};
        if (planId) subUpdates.planId = parseInt(planId);
        if (subscriptionStatus) subUpdates.status = subscriptionStatus;
        await db.update(clientSubscriptions).set(subUpdates).where(eq(clientSubscriptions.clientId, clientId));
      } else if (planId) {
        // Create new subscription if none exists and planId is provided
        await db.insert(clientSubscriptions).values({
          clientId: clientId,
          planId: parseInt(planId),
          status: subscriptionStatus || 'active',
          startedAt: new Date().toISOString(),
          expiresAt: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
          paymentStatus: 'paid',
        });
      }
    }

    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// 5. Alternar status do cliente (Ativar/Desativar)
router.post('/:id/toggle', async (req: Request, res: Response): Promise<any> => {
  try {
    const clientId = parseInt(req.params.id);

    const client = await db.select().from(users).where(and(eq(users.id, clientId), eq(users.role, 'client'))).limit(1);
    if (client.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const newStatus = client[0].isActive === 1 ? 0 : 1;
    await db.update(users).set({ isActive: newStatus }).where(eq(users.id, clientId));

    res.json({
      success: true,
      message: `Cliente ${newStatus === 1 ? 'ativado' : 'desativado'} com sucesso`,
      isActive: newStatus
    });
  } catch (error: any) {
    console.error('Erro ao alternar status do cliente:', error);
    res.status(500).json({ error: 'Erro ao alternar status do cliente' });
  }
});

// 6. Deletar cliente (mantido para compatibilidade, mas não usado na UI principal)
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const clientId = parseInt(req.params.id);

    // Delete associated subscriptions first
    await db.delete(clientSubscriptions).where(eq(clientSubscriptions.clientId, clientId));
    // Then delete the user
    const deleteResult = await db.delete(users).where(and(eq(users.id, clientId), eq(users.role, 'client')));

    if ((deleteResult as any).rowsAffected === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({
      success: true,
      message: 'Cliente deletado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});

// 6. Obter estatísticas de clientes
router.get('/stats', async (_req: Request, res: Response): Promise<any> => {
  try {
    const totalClientsResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'client'));
    const totalClients = totalClientsResult[0]?.count || 0;

    const activeClientsResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, 'client'), eq(users.isActive, 1)));
    const activeClients = activeClientsResult[0]?.count || 0;

    res.json({
      totalClients,
      activeClients,
    });
  } catch (error: any) {
    console.error('Erro ao obter stats de clientes:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

export default router;
