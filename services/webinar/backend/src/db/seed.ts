import { sql } from 'drizzle-orm'
import { db, pool } from './index.js'
import { plans, users } from './schema.js'
import { hashPassword } from '../utils/password.js'

const PLAN_CATALOG = [
  {
    name: 'Trial',
    description: 'Plano gratuito por 30 dias para testar a plataforma',
    price: 0,
    maxDurationMinutes: 20,
    maxParticipants: 5,
    replayStorageDays: 30,
    features: ['chat', 'enquetes', 'ctas'],
  },
  {
    name: 'Básico',
    description: 'Plano básico para pequenos eventos',
    price: 99,
    maxDurationMinutes: 30,
    maxParticipants: 1000,
    replayStorageDays: 30,
    features: ['chat', 'enquetes', 'ctas', 'replays', 'relatorios'],
  },
  {
    name: 'Profissional',
    description: 'Plano profissional para eventos médios',
    price: 299,
    maxDurationMinutes: 120,
    maxParticipants: 5000,
    replayStorageDays: 999999,
    features: ['chat', 'enquetes', 'ctas', 'replays', 'relatorios', 'automacao', 'integracao'],
  },
  {
    name: 'Enterprise',
    description: 'Plano enterprise sem limites',
    price: 999,
    maxDurationMinutes: 999999,
    maxParticipants: 999999,
    replayStorageDays: 999999,
    features: ['chat', 'enquetes', 'ctas', 'replays', 'relatorios', 'automacao', 'integracao', 'suporte_prioritario'],
  },
]

async function seedPlans() {
  for (const plan of PLAN_CATALOG) {
    await db
      .insert(plans)
      .values({ ...plan, features: JSON.stringify(plan.features) })
      .onDuplicateKeyUpdate({ set: { name: sql`name` } })
  }
  console.log(`plans: ${PLAN_CATALOG.length} ensured`)
}

/** Optional direct-login Webinar admin; IMP users reach Webinar through the handoff instead. */
async function seedAdmin() {
  const email = process.env.WEBINAR_SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.WEBINAR_SEED_ADMIN_PASSWORD
  if (!email || !password) {
    console.log('admin: skipped (WEBINAR_SEED_ADMIN_EMAIL / WEBINAR_SEED_ADMIN_PASSWORD not set)')
    return
  }
  if (password.length < 12) throw new Error('WEBINAR_SEED_ADMIN_PASSWORD must be at least 12 characters')
  await db
    .insert(users)
    .values({ email, name: 'Webinar Admin', passwordHash: await hashPassword(password), role: 'admin', isActive: 1 })
    .onDuplicateKeyUpdate({ set: { email: sql`email` } })
  console.log(`admin: ${email} ensured`)
}

async function main() {
  try {
    await seedPlans()
    await seedAdmin()
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
