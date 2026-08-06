import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users, plans, webinars, clientSubscriptions } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';


export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalWebinarsResult = await db.select({ count: sql<number>`count(*)` }).from(webinars);
    const totalPlansResult = await db.select({ count: sql<number>`count(*)` }).from(plans);
    const totalSubscriptionsResult = await db.select({ count: sql<number>`count(*)` }).from(clientSubscriptions);
    
    const activeUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, 1));
    const activeWebinarsResult = await db.select({ count: sql<number>`count(*)` }).from(webinars).where(eq(webinars.status, 'live'));

    const stats = {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalWebinars: totalWebinarsResult[0]?.count || 0,
      totalPlans: totalPlansResult[0]?.count || 0,
      totalSubscriptions: totalSubscriptionsResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      activeWebinars: activeWebinarsResult[0]?.count || 0,
    };
    
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
  try {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt
    }).from(users);
    
    res.status(200).json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function toggleUser(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);
    
    const userResult = await db.select().from(users).where(eq(users.id, userIdNum));
    const user = userResult[0];
    
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const newStatus = user.isActive === 1 ? 0 : 1;
    
    await db.update(users).set({ isActive: newStatus }).where(eq(users.id, userIdNum));
    
    res.status(200).json({ id: userId, isActive: newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: 'Email já cadastrado' });
      return;
    }

    const [result] = await db.insert(users).values({
      name,
      email,
      passwordHash: password,
      role: role || 'client',
      isActive: 1
    });

    const insertedId = (result as any).insertId;
    
    // Se o usuário for um cliente, atribuir automaticamente o plano Trial
    if ((role || 'client') === 'client') {
      try {
        // Buscar o ID do plano 'Trial'
        const trialPlan = await db.select().from(plans).where(eq(plans.name, 'Trial')).limit(1);
        
        if (trialPlan.length > 0) {
          await db.insert(clientSubscriptions).values({
            clientId: insertedId,
            planId: trialPlan[0].id,
            status: 'active',
            paymentStatus: 'pending',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias de validade
          });
        }
      } catch (subError) {
        console.error('Erro ao criar assinatura trial automática:', subError);
        // Não interromper a criação do usuário se a assinatura falhar
      }
    }

    const newUser = await db.select().from(users).where(eq(users.id, insertedId)).limit(1);
    res.status(201).json(newUser[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);
    const { name, email, password, role } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.passwordHash = password;
    if (role) updates.role = role;

    await db.update(users).set(updates).where(eq(users.id, userIdNum));
    const updated = await db.select().from(users).where(eq(users.id, userIdNum)).limit(1);
    res.status(200).json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getPlans(_req: Request, res: Response): Promise<void> {
  try {
    const allPlans = await db.select().from(plans);
    res.status(200).json(allPlans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createNewPlan(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, price, maxDurationMinutes, maxParticipants, replayStorageDays, features } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({ error: 'Nome e preço são obrigatórios' });
      return;
    }

    // Drizzle auto-increments IDs, no need for randomUUID for new plans
    // const id = crypto.randomUUID();
    
    await db.insert(plans).values({
      name,
      description: description || null,
      price: price.toString(),
      maxDurationMinutes: parseInt(maxDurationMinutes) || 60,
      maxParticipants: parseInt(maxParticipants) || 100,
      replayStorageDays: parseInt(replayStorageDays) || 30,
      features: features || null
    });

    // For auto-incrementing IDs, we need to fetch the last inserted ID or re-query based on unique fields if available.
    // For now, we'll assume the insert operation returns the ID or we can query by name if it's unique.
    // Since Drizzle's insert doesn't directly return the ID for MySQL2, we'll re-query by name.
    const newPlan = await db.select().from(plans).where(eq(plans.name, name));
    res.status(201).json(newPlan[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateExistingPlan(req: Request, res: Response): Promise<void> {
  try {
    const { planId } = req.params;
    const planIdNum = parseInt(planId);
    const { name, description, price, maxDurationMinutes, maxParticipants, replayStorageDays, features } = req.body;

    const planResult = await db.select().from(plans).where(eq(plans.id, planIdNum));
    if (planResult.length === 0) {
      res.status(404).json({ error: 'Plano não encontrado' });
      return;
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price.toString();
    if (maxDurationMinutes !== undefined) updates.maxDurationMinutes = parseInt(maxDurationMinutes);
    if (maxParticipants !== undefined) updates.maxParticipants = parseInt(maxParticipants);
    if (replayStorageDays !== undefined) updates.replayStorageDays = parseInt(replayStorageDays);
    if (features !== undefined) updates.features = features;

    await db.update(plans).set(updates).where(eq(plans.id, planIdNum));
    
    const updatedPlan = await db.select().from(plans).where(eq(plans.id, planIdNum));
    res.status(200).json(updatedPlan[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteExistingPlan(req: Request, res: Response): Promise<void> {
  try {
    const { planId } = req.params;
    const planIdNum = parseInt(planId);
    
    const planResult = await db.select().from(plans).where(eq(plans.id, planIdNum));
    if (planResult.length === 0) {
      res.status(404).json({ error: 'Plano não encontrado' });
      return;
    }

    await db.delete(plans).where(eq(plans.id, planIdNum));
    
    res.status(200).json({ id: planId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getWebinars(_req: Request, res: Response): Promise<void> {
  try {
    const allWebinars = await db.select().from(webinars);
    res.status(200).json(allWebinars);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
