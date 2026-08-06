import { db } from './db/index.js';
import { users, clientSubscriptions, plans } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function test() {
  console.log('--- Iniciando Teste Real de Criação de Cliente ---');
  const testEmail = `final-test-${Date.now()}@example.com`;
  
  try {
    const today = new Date();
    const allPlans = await db.select().from(plans);
    const trialPlan = allPlans.find(p => p.name === 'Trial') || allPlans[0];
    const basicPlan = allPlans.find(p => p.name === 'Básico') || allPlans[1] || allPlans[0];

    const [newUserResult] = await db.insert(users).values({
      name: 'Teste Final',
      email: testEmail,
      passwordHash: 'pwd',
      role: 'client',
      isActive: 1,
    });
    const newClientId = (newUserResult as any).insertId;

    // 1. Trial Pago
    await db.insert(clientSubscriptions).values({
      clientId: newClientId,
      planId: trialPlan.id,
      status: 'active',
      startedAt: today,
      expiresAt: today,
      paymentStatus: 'paid',
    });

    // 2. Básico Pendente
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    await db.insert(clientSubscriptions).values({
      clientId: newClientId,
      planId: basicPlan.id,
      status: 'active',
      startedAt: today,
      expiresAt: nextMonth,
      paymentStatus: 'pending',
    });

    const subs = await db.select().from(clientSubscriptions).where(eq(clientSubscriptions.clientId, newClientId));
    console.log(`Assinaturas criadas para o cliente ${newClientId}: ${subs.length}`);
    
    if (subs.length === 2) {
      console.log('✅ TESTE APROVADO: Dois registros criados com sucesso.');
    } else {
      console.error('❌ TESTE REPROVADO: Apenas ' + subs.length + ' registros criados.');
    }

    // Limpar
    await db.delete(clientSubscriptions).where(eq(clientSubscriptions.clientId, newClientId));
    await db.delete(users).where(eq(users.id, newClientId));
  } catch (e) {
    console.error('Erro no teste:', e);
  } finally {
    process.exit();
  }
}
test();
