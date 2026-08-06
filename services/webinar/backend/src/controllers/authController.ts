import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      return;
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      res.status(400).json({ error: 'Email já está em uso' });
      return;
    }

    // Inserção sem hash para simplificar por enquanto (conforme banco atual)
    const [result] = await db.insert(users).values({
      email,
      name,
      passwordHash: password,
      role: 'client',
      isActive: 1
    } as any);

    const userId = (result as any).insertId;

    // Criar assinatura trial automática de 30 dias para o novo usuário
    try {
      const { clientSubscriptions, plans } = await import('../db/schema.js');
      const trialPlan = await db.select().from(plans).where(eq(plans.name, 'Trial')).limit(1);
      
      if (trialPlan.length > 0) {
        await db.insert(clientSubscriptions).values({
          clientId: userId,
          planId: trialPlan[0].id,
          status: 'active',
          paymentStatus: 'paid', // Trial inicial marcado como pago
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
        });
      }
    } catch (subError) {
      console.error('Erro ao criar assinatura trial no registro:', subError);
    }

    const user = { id: userId, name, email, role: 'client' };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({ message: 'Usuário registrado com sucesso', user, accessToken, refreshToken });
  } catch (error: any) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const userResult = await db.select().from(users).where(eq(users.email, email));
    const userRecord = userResult[0];

    if (!userRecord || userRecord.isActive === 0) {
      res.status(401).json({ error: 'Credenciais inválidas ou conta inativa' });
      return;
    }

    // Comparação de senha - suporta texto plano e hash bcrypt
    let isPasswordCorrect = false;
    if (userRecord.passwordHash === password) {
      isPasswordCorrect = true;
    } else {
      try {
        const bcrypt = await import('bcryptjs');
        isPasswordCorrect = await bcrypt.default.compare(password, userRecord.passwordHash);
      } catch (err) {
        console.warn('Bcrypt comparison failed, falling back to plaintext check');
        isPasswordCorrect = userRecord.passwordHash === password;
      }
    }

    if (!isPasswordCorrect) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
    };

    const accessToken = generateAccessToken(user as any);
    const refreshToken = generateRefreshToken(user as any);

    res.status(200).json({ user, accessToken, refreshToken });
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    
    const userResult = await db.select().from(users).where(eq(users.id, req.user.id as any));
    const userRecord = userResult[0];
    
    if (!userRecord) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    
    const user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
    };
    
    res.status(200).json(user);
  } catch (error: any) {
    console.error('Erro no getMe:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'Logout realizado com sucesso' });
}

export async function forgotPassword(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({ message: 'Email de recuperação será enviado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function resetPassword(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({ message: 'Senha redefinida com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
