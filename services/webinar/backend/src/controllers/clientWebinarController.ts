import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { webinars, chatMessages } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function createWebinar(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id; // Assumindo que req.user é populado pelo authMiddleware
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const { title, description, scheduledDate, durationMinutes, isRecurring, recurrencePattern, recurrenceEndDate, timezone, presenterName, presenterBio, presenterImageUrl, registrationPageColor, maxParticipants, status } = req.body;


    console.log("createWebinar (backend): Validating fields - title:", title, "scheduledDate:", scheduledDate, "durationMinutes:", durationMinutes);
    if (!title || !scheduledDate || !durationMinutes) {
      res.status(400).json({ error: 'Título, data agendada e duração são obrigatórios' });
      return;
    }

    const [result] = await db.insert(webinars).values({
      clientId: parseInt(clientId),
      title,
      description: description || null,
      scheduledDate: new Date(scheduledDate),
      durationMinutes: parseInt(durationMinutes),
      isRecurring: isRecurring ? 1 : 0,
      recurrencePattern: recurrencePattern || null,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      timezone: timezone || 'America/Sao_Paulo',
      presenterName: presenterName || null,
      presenterBio: presenterBio || null,
      presenterImageUrl: presenterImageUrl || null,
      registrationPageColor: registrationPageColor || '#007bff',
      maxParticipants: parseInt(maxParticipants) || 0,
      status: status || 'draft',
    });

    const newWebinarId = (result as any).insertId;
    const newWebinar = await db.select().from(webinars).where(eq(webinars.id, newWebinarId)).limit(1);

    res.status(201).json(newWebinar[0]);
  } catch (error: any) {
    console.error('Erro ao criar webinar:', error);

    res.status(500).json({ error: error.message });
  }
}

export async function getClientWebinarById(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const webinarId = parseInt(req.params.id);
    const webinarResult = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);
    const webinar = webinarResult[0];

    if (!webinar || webinar.clientId !== parseInt(clientId)) {
      res.status(404).json({ error: 'Webinar não encontrado ou você não tem permissão para acessá-lo' });
      return;
    }

    res.status(200).json(webinar);
  } catch (error: any) {
    console.error('Erro ao obter webinar:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateWebinar(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const webinarId = parseInt(req.params.id);
    const { title, description, scheduledDate, durationMinutes, isRecurring, recurrencePattern, recurrenceEndDate, timezone, presenterName, presenterBio, presenterImageUrl, registrationPageColor, maxParticipants, status } = req.body;

    const existingWebinar = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);
    if (!existingWebinar[0] || existingWebinar[0].clientId !== parseInt(clientId)) {
      res.status(404).json({ error: 'Webinar não encontrado ou você não tem permissão para editá-lo' });
      return;
    }

    const updates: any = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (scheduledDate) updates.scheduledDate = new Date(scheduledDate);
    if (durationMinutes) updates.durationMinutes = parseInt(durationMinutes);
    if (isRecurring !== undefined) updates.isRecurring = isRecurring ? 1 : 0;
    if (recurrencePattern !== undefined) updates.recurrencePattern = recurrencePattern;
    if (recurrenceEndDate !== undefined) updates.recurrenceEndDate = recurrenceEndDate ? new Date(recurrenceEndDate) : null;
    if (timezone) updates.timezone = timezone;
    if (presenterName !== undefined) updates.presenterName = presenterName;
    if (presenterBio !== undefined) updates.presenterBio = presenterBio;
    if (presenterImageUrl !== undefined) updates.presenterImageUrl = presenterImageUrl;
    if (registrationPageColor) updates.registrationPageColor = registrationPageColor;
    if (maxParticipants) updates.maxParticipants = parseInt(maxParticipants);
    if (status) updates.status = status;

    await db.update(webinars).set(updates).where(eq(webinars.id, webinarId));
    const updatedWebinar = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);

    res.status(200).json(updatedWebinar[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar webinar:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getClientStudioWebinarById(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const webinarId = parseInt(req.params.id);
    const webinarResult = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);
    const webinar = webinarResult[0];

    if (!webinar || webinar.clientId !== parseInt(clientId)) {
      res.status(404).json({ error: 'Webinar não encontrado ou você não tem permissão para acessá-lo' });
      return;
    }

    res.status(200).json(webinar);
  } catch (error: any) {
    console.error('Erro ao obter webinar para estúdio:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateWebinarStatus(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const webinarId = parseInt(req.params.id);
    const { status } = req.body;

    const existingWebinar = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);
    if (!existingWebinar[0] || existingWebinar[0].clientId !== parseInt(clientId)) {
      res.status(404).json({ error: 'Webinar não encontrado ou você não tem permissão para editá-lo' });
      return;
    }

    if (!status) {
      res.status(400).json({ error: 'Status é obrigatório' });
      return;
    }

    await db.update(webinars).set({ status }).where(eq(webinars.id, webinarId));
    const updatedWebinar = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);

    res.status(200).json(updatedWebinar[0]);
  } catch (error: any) {
    console.error('Erro ao atualizar status do webinar:', error);
    res.status(500).json({ error: error.message });
  }
}

// Removed ensureChatTableExists as we are using the existing chat_messages table

export async function getStudioChat(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id;
    const userRole = req.user?.role;
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const webinarId = parseInt(req.params.id);
    const existingWebinar = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);
    // M102.54: Permitir acesso para admin OU para o dono do webinar
    if (!existingWebinar[0] || (userRole !== 'admin' && existingWebinar[0].clientId !== parseInt(clientId))) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // M102.43: Ordenar por ASC para o chat fluir de cima para baixo
    const messages = await db.select().from(chatMessages).where(eq(chatMessages.webinarId, webinarId)).orderBy(chatMessages.createdAt);
    
    // Map to frontend format
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      userName: msg.senderName || 'Anônimo',
      message: msg.message,
      timestamp: msg.createdAt,
      role: msg.participantId ? 'participant' : 'client',
      user: msg.senderName || 'Anônimo'
    }));
    
    res.status(200).json(formattedMessages);
  } catch (error: any) {
    console.error('Erro ao obter chat do estúdio:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function postStudioChat(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id;
    const userRole = req.user?.role;
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const webinarId = parseInt(req.params.id);
    const { message, userName, user, role } = req.body; // Aceitar userName ou user

    const existingWebinar = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);
    // M102.54: Permitir acesso para admin OU para o dono do webinar
    if (!existingWebinar[0] || (userRole !== 'admin' && existingWebinar[0].clientId !== parseInt(clientId))) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const finalUserName = userName || user;
    if (!message || !finalUserName) {
      res.status(400).json({ error: 'Mensagem e usuário são obrigatórios' });
      return;
    }

    const [result] = await db.insert(chatMessages).values({
      webinarId: webinarId,
      participantId: role === 'participant' ? 1 : null, // Marcar como participante se role for participant
      senderName: finalUserName,
      message: message,
      timestampSeconds: Math.floor(Date.now() / 1000),
    });
    
    const newMessageId = (result as any).insertId;
    const newMessageEntry = await db.select().from(chatMessages).where(eq(chatMessages.id, newMessageId)).limit(1);
    
    const msg = newMessageEntry[0];
    res.status(201).json({
      id: msg.id,
      userName: msg.senderName || 'Anônimo',
      message: msg.message,
      timestamp: msg.createdAt,
      role: role || 'client',
      user: msg.senderName || 'Anônimo'
    });
  } catch (error: any) {
    console.error('Erro ao enviar mensagem do chat:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteWebinar(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.user?.id;
    if (!clientId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const webinarId = parseInt(req.params.id);
    const existingWebinar = await db.select().from(webinars).where(eq(webinars.id, webinarId)).limit(1);

    if (!existingWebinar[0] || existingWebinar[0].clientId !== parseInt(clientId)) {
      res.status(404).json({ error: 'Webinar não encontrado ou você não tem permissão para deletá-lo' });
      return;
    }

    await db.delete(webinars).where(eq(webinars.id, webinarId));
    res.status(200).json({ message: 'Webinar deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar webinar:', error);
    res.status(500).json({ error: error.message });
  }
}
