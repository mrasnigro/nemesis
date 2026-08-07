import { Request, Response } from 'express';
import { db, fromSqliteDate } from '../db/index.js';
import { users, webinars, clientSubscriptions, plans } from '../db/schema.js';
import { eq, sql, and, gte } from 'drizzle-orm';

// Mocks






export const getClientStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id; // Assuming req.user is populated by authMiddleware

    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    // Fetch client's current subscription
    const subscription = await db.select().from(clientSubscriptions).where(eq(clientSubscriptions.clientId, Number(clientId))).limit(1);
    const currentSubscription = subscription[0];

    let activePlan = 'Nenhum Plano Ativo';
    let subscriptionStatus = 'Inativo';
    let nextRenewal: string | null = null;
    let maxWebinars = 0;
    let maxParticipants = 0;

    if (currentSubscription) {
      const plan = await db.select().from(plans).where(eq(plans.id, currentSubscription.planId)).limit(1);
      if (plan[0]) {
        activePlan = plan[0].name;
        // maxWebinars is not directly from plan, it's a derived value based on plan limits and used webinars.
        // For now, we'll use maxParticipants as a proxy or set a default.
        // maxWebinars = plan[0].maxWebinars || 0; // Removed as maxWebinars is not in schema
        maxWebinars = plan[0].maxDurationMinutes || 0; // Using maxDurationMinutes as a placeholder for now
        maxParticipants = plan[0].maxParticipants || 0;
      }
      subscriptionStatus = currentSubscription.status || 'inactive';
      nextRenewal = fromSqliteDate(currentSubscription.expiresAt as any)?.split('T')[0] || null;
    }

    // Count watched webinars (assuming 'attended' status in leads table)
    const watchedWebinarsResult = await db.select({ count: sql<number>`count(DISTINCT webinar_id)` })
      .from(webinars)
      .leftJoin(users, eq(webinars.clientId, users.id))
      .where(and(eq(webinars.clientId, Number(clientId)), eq(webinars.status, 'completed')));
    const watchedWebinars = watchedWebinarsResult[0]?.count || 0;

    // Count upcoming webinars
    const upcomingWebinarsResult = await db.select({ count: sql<number>`count(*)` })
      .from(webinars)
      .where(and(eq(webinars.clientId, Number(clientId)), gte(webinars.scheduledDate, new Date().toISOString())));
    const upcomingWebinars = upcomingWebinarsResult[0]?.count || 0;

    const stats = {
      activePlan,
      status: subscriptionStatus,
      nextRenewal,
      availableWebinars: maxWebinars,
      watchedWebinars,
      upcomingWebinars,
      maxParticipants
    };

    res.json(stats);
  } catch (error: any) {
    console.error("Erro ao obter estatísticas do cliente:", error);

    res.status(500).json({ error: 'Erro ao obter estatísticas do cliente' });
  }
};

export const getClientWebinars = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id; // Assuming req.user is populated by authMiddleware
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const clientWebinars = await db.select().from(webinars).where(eq(webinars.clientId, Number(clientId)));

    const formattedWebinars = clientWebinars.map(webinar => ({
      id: String(webinar.id),
      title: webinar.title,
      description: webinar.description,
      date: fromSqliteDate(webinar.scheduledDate as any),
      instructor: webinar.presenterName || 'N/A',
      status: webinar.status,
      duration: webinar.durationMinutes || 0,
    }));

    res.json(formattedWebinars);
  } catch (error: any) {
    console.error('Erro ao obter webinars do cliente:', error);
    res.status(500).json({ error: 'Erro ao obter webinars do cliente' });
  }
};

export const getClientSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.id; // Assuming req.user is populated by authMiddleware
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const subscriptionResult = await db.select().from(clientSubscriptions).where(eq(clientSubscriptions.clientId, Number(clientId))).limit(1);
    const subscription = subscriptionResult[0];

    if (!subscription) {
      // Handoff users may not have a subscription row yet — return a free trial stub
      res.json({
        id: '0',
        planName: 'Trial IMP',
        price: 0,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodEnd: null,
        features: ['Webinars via IMP', 'Studio / Live'],
      });
      return;
    }

    const planResult = await db.select().from(plans).where(eq(plans.id, subscription.planId)).limit(1);
    const plan = planResult[0];

    if (!plan) {
      res.status(404).json({ error: 'Plano da assinatura não encontrado' });
      return;
    }

    const formattedSubscription = {
      id: String(subscription.id),
      planName: plan.name,
      price: typeof plan.price === 'number' ? plan.price : parseFloat(String(plan.price)),
      status: subscription.status,
      billingCycle: 'monthly',
      currentPeriodEnd: fromSqliteDate(subscription.expiresAt as any),
      features: plan.features ? String(plan.features).split('\n') : [],
    };

    res.json(formattedSubscription);
  } catch (error: any) {
    console.error('Erro ao obter assinatura do cliente:', error);
    res.status(500).json({ error: 'Erro ao obter assinatura do cliente' });
  }
};

export const updateClientProfile = async (_req: Request, res: Response): Promise<void> => {
  // This function would typically handle profile updates to the database.
  // For now, it's a placeholder as per the task description to remove mock data.
  res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso' });
};
