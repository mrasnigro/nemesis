import { MODULE_IDS, type CustomerPlan, type CustomerStatus, type ModuleId, type UserProfile } from '@imp/shared'
import bcrypt from 'bcryptjs'
import type { RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { config } from '../src/core/config.js'
import { pool } from '../src/core/db.js'
import { AppError } from '../src/core/errors.js'
import { installStarterCatalog } from '../src/modules/training-ai/training-ai.service.js'
type SeedCustomer = { slug: string; name: string; plan: CustomerPlan; status: CustomerStatus; modules: readonly ModuleId[] }
type SeedUser = {
  username: string
  password: string
  name: string
  role: 'admin' | 'imp'
  profile: UserProfile | null
  customerId: string | null
  modules: readonly ModuleId[]
}

async function ensureCustomer(customer: SeedCustomer, preferredId?: string): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM customers WHERE id = :preferredId OR slug = :slug ORDER BY id = :preferredId DESC LIMIT 1',
    { preferredId: preferredId ?? '', slug: customer.slug },
  )
  let id = rows[0] ? String(rows[0].id) : ''
  const now = new Date()
  if (!id) {
    id = ulid()
    await pool.query(
      `INSERT INTO customers (id, name, slug, plan, status, created_at, updated_at)
       VALUES (:id, :name, :slug, :plan, :status, :now, :now)`,
      { id, ...customer, now },
    )
    console.log(`seeded customer ${customer.slug}`)
  } else {
    // Rows created before migration 002_platform_tenancy carry a placeholder slug (their lowercased id).
    await pool.query(
      `UPDATE customers SET slug = :slug, plan = :plan, status = :status, updated_at = :now
       WHERE id = :id AND slug = LOWER(id)`,
      { id, ...customer, now },
    )
  }
  if (customer.modules.length > 0) {
    await pool.query('INSERT IGNORE INTO customer_modules (customer_id, module_id) VALUES ?', [
      customer.modules.map((moduleId) => [id, moduleId]),
    ])
  }
  return id
}

async function ensureUser(user: SeedUser): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE username = :username LIMIT 1', {
    username: user.username,
  })
  let id = rows[0] ? String(rows[0].id) : ''
  if (!id) {
    id = ulid()
    const now = new Date()
    await pool.query(
      `INSERT INTO users (id, customer_id, username, name, role, profile, status, password_hash, created_at, updated_at)
       VALUES (:id, :customerId, :username, :name, :role, :profile, 'active', :passwordHash, :now, :now)`,
      {
        id,
        customerId: user.customerId,
        username: user.username,
        name: user.name,
        role: user.role,
        profile: user.profile,
        passwordHash: await bcrypt.hash(user.password, 12),
        now,
      },
    )
    console.log(`seeded ${user.role} user ${user.username}`)
  }
  if (user.modules.length > 0) {
    await pool.query('INSERT IGNORE INTO user_modules (user_id, module_id) VALUES ?', [
      user.modules.map((moduleId) => [id, moduleId]),
    ])
  }
  return id
}

async function seedPlatformAdmin() {
  await ensureUser({
    username: config.SEED_ADMIN_USERNAME.trim().toLowerCase(),
    password: config.SEED_ADMIN_PASSWORD,
    name: 'Administrador IMP',
    role: 'admin',
    profile: null,
    customerId: null,
    modules: [],
  })
}

async function main() {
  if (config.NODE_ENV === 'production') {
    if (config.SEED_ADMIN_PASSWORD.length < 12) {
      throw new Error('Set SEED_ADMIN_PASSWORD (12+ characters) to bootstrap the production administrator')
    }
    await seedPlatformAdmin()
    console.log('production: only the platform administrator is seeded')
    await pool.end()
    return
  }

  await seedPlatformAdmin()

  const username = config.SEED_USERNAME.trim().toLowerCase()
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT customer_id FROM users WHERE username = :username LIMIT 1',
    { username },
  )
  // Demo customers mirror the client's example: one customer with every module, one with a subset.
  const customerId = await ensureCustomer(
    { slug: 'acelere', name: 'Acelere Seu Crescimento', plan: 'Enterprise', status: 'active', modules: MODULE_IDS },
    existing[0]?.customer_id ? String(existing[0].customer_id) : undefined,
  )
  const novaRotaId = await ensureCustomer({
    slug: 'novarota',
    name: 'NovaRota Comercial',
    plan: 'Growth',
    status: 'active',
    modules: ['training-ai', 'bdr', 'prospecting'],
  })

  await ensureUser({
    username,
    password: config.SEED_PASSWORD,
    name: config.SEED_NAME,
    role: 'imp',
    profile: 'sdr_bdr',
    customerId,
    modules: MODULE_IDS,
  })
  await ensureUser({
    username: 'bdr',
    password: 'bdr',
    name: 'Bruno Lima',
    role: 'imp',
    profile: 'sdr_bdr',
    customerId,
    modules: MODULE_IDS,
  })
  await ensureUser({
    username: 'gestor',
    password: 'gestor',
    name: 'Ana Souza',
    role: 'imp',
    profile: 'customer_admin',
    customerId,
    modules: MODULE_IDS,
  })
  await ensureUser({
    username: 'sdr',
    password: 'sdr',
    name: 'Felipe Rocha',
    role: 'imp',
    profile: 'sdr_bdr',
    customerId: novaRotaId,
    modules: ['training-ai', 'prospecting'],
  })

  // The same starter catalog a customer administrator installs from the module (only on an empty catalog).
  try {
    const installed = await installStarterCatalog({ customerId, userId: 'seed', isManager: true })
    console.log(`seeded ${installed.personas} personas, ${installed.templates} templates, ${installed.scenarios} scenarios`)
  } catch (error) {
    if (error instanceof AppError && error.code === 'CATALOG_NOT_EMPTY') console.log('training catalog already present')
    else throw error
  }

  // BDR has no demo data: campaigns, leads, calls and meetings are created through the app.
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
