import { MODULE_IDS, type CustomerPlan, type CustomerStatus, type ModuleId, type UserProfile } from '@imp/shared'
import bcrypt from 'bcryptjs'
import type { RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { config } from '../src/core/config.js'
import { pool } from '../src/core/db.js'
import { seedEvaluationTemplates } from '../../web/src/modules/training-ai/data/evaluationTemplates.js'
import { seedPersonas } from '../../web/src/modules/training-ai/data/personas.js'
import { seedScenarios } from '../../web/src/modules/training-ai/data/scenarios.js'
import {
  SEED_CAMPAIGNS,
  SEED_DIAL_POOL,
  SEED_HISTORY,
  SEED_MEETINGS,
} from '../../web/src/modules/bdr/data/seeds.js'
import { importLeads } from '../src/modules/bdr/leads.repository.js'

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
    // Rows created before migration 005 carry a placeholder slug (their lowercased id).
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

  const userId = await ensureUser({
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

  const [counts] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM training_personas WHERE customer_id = :customerId',
    { customerId },
  )
  if (Number(counts[0]?.total ?? 0) > 0) {
    console.log('training catalog already present')
  } else {

  const personaIds = new Map<string, string>()
  const templateIds = new Map<string, string>()
  const now = new Date()

  for (const template of seedEvaluationTemplates) {
    const id = ulid()
    templateIds.set(template.id, id)
    const stored = { ...template, id }
    await pool.query(
      `INSERT INTO training_templates
        (id, customer_id, title, contact_type, template_json, created_at, updated_at)
       VALUES
        (:id, :customerId, :title, :contactType, :templateJson, :now, :now)`,
      {
        id,
        customerId,
        title: template.title,
        contactType: template.contactType ?? null,
        templateJson: JSON.stringify(stored),
        now,
      },
    )
  }

  for (const persona of seedPersonas) {
    const id = ulid()
    personaIds.set(persona.id, id)
    const stored = { ...persona, id }
    await pool.query(
      `INSERT INTO training_personas
        (id, customer_id, name, status, industry, difficulty, profile_json, created_at, updated_at)
       VALUES
        (:id, :customerId, :name, :status, :industry, :difficulty, :profileJson, :now, :now)`,
      {
        id,
        customerId,
        name: persona.name,
        status: persona.status,
        industry: persona.industry,
        difficulty: persona.difficulty,
        profileJson: JSON.stringify(stored),
        now,
      },
    )
  }

  for (const scenario of seedScenarios) {
    const id = ulid()
    const personaId = personaIds.get(scenario.personaId)
    const evaluationTemplateId = templateIds.get(scenario.evaluationTemplateId)
    if (!personaId || !evaluationTemplateId) {
      throw new Error(`Scenario ${scenario.id} is missing a persona or template`)
    }
    const stored = { ...scenario, id, personaId, evaluationTemplateId }
    await pool.query(
      `INSERT INTO training_scenarios
        (id, customer_id, title, difficulty, funnel_stage, persona_id, evaluation_template_id, scenario_json, created_at, updated_at)
       VALUES
        (:id, :customerId, :title, :difficulty, :funnelStage, :personaId, :evaluationTemplateId, :scenarioJson, :now, :now)`,
      {
        id,
        customerId,
        title: scenario.title,
        difficulty: scenario.difficulty,
        funnelStage: scenario.funnelStage ?? null,
        personaId,
        evaluationTemplateId,
        scenarioJson: JSON.stringify(stored),
        now,
      },
    )
  }

  console.log(
    `seeded ${seedPersonas.length} personas, ${seedEvaluationTemplates.length} templates, ${seedScenarios.length} scenarios`,
  )
  }

  await seedBdr(customerId, userId)
  await seedDialQueue(customerId)
  await pool.end()
}

/** Gives every empty active campaign the demo leads so the dialer has something to call locally. */
async function seedDialQueue(customerId: string) {
  const [campaigns] = await pool.query<RowDataPacket[]>(
    `SELECT c.id FROM bdr_campaigns c
     WHERE c.customer_id = :customerId AND c.status = 'active' AND c.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM bdr_leads l WHERE l.campaign_id = c.id)`,
    { customerId },
  )
  for (const campaign of campaigns) {
    const result = await importLeads(customerId, String(campaign.id), SEED_DIAL_POOL, 'import')
    console.log(`seeded ${result.inserted} dial leads into campaign ${campaign.id}`)
  }
}

async function seedBdr(customerId: string, userId: string) {
  const [counts] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM bdr_campaigns WHERE customer_id = :customerId',
    { customerId },
  )
  if (Number(counts[0]?.total ?? 0) > 0) {
    console.log('dialer catalog already present')
    return
  }

  const now = new Date()
  const campaignIds = new Map<string, string>()
  for (const campaign of SEED_CAMPAIGNS) {
    const id = ulid()
    campaignIds.set(campaign.id, id)
    await pool.query(
      `INSERT INTO bdr_campaigns
        (id, customer_id, name, status, lead_count, completed_count, campaign_json, created_at, updated_at)
       VALUES
        (:id, :customerId, :name, :status, :leads, :completed, :campaignJson, :now, :now)`,
      {
        id,
        customerId,
        name: campaign.name,
        status: campaign.status,
        leads: campaign.leads,
        completed: campaign.completed,
        campaignJson: JSON.stringify({ ...campaign, id }),
        now,
      },
    )
  }

  const meetingIds = new Map<string, string>()
  for (const meeting of SEED_MEETINGS) {
    const id = ulid()
    meetingIds.set(meeting.id, id)
    const startsAt = new Date(`${meeting.date}T${meeting.time}:00`)
    await pool.query(
      `INSERT INTO bdr_meetings
        (id, customer_id, lead_name, company, starts_at, meeting_json, created_at, updated_at)
       VALUES
        (:id, :customerId, :leadName, :company, :startsAt, :meetingJson, :now, :now)`,
      {
        id,
        customerId,
        leadName: meeting.leadName,
        company: meeting.company,
        startsAt,
        meetingJson: JSON.stringify({ ...meeting, id }),
        now,
      },
    )
  }

  for (const [index, call] of SEED_HISTORY.entries()) {
    const id = ulid()
    const campaignId = call.campaignId ? campaignIds.get(call.campaignId) ?? null : null
    const meetingIdList = (call.meetingIds || []).map((meetingId) => meetingIds.get(meetingId) || meetingId)
    const startedAt = new Date(now.getTime() - index * 60 * 60 * 1000)
    await pool.query(
      `INSERT INTO bdr_calls
        (id, customer_id, user_id, campaign_id, phone, lead_name, company, mode, call_status, duration_seconds, call_json, started_at, created_at)
       VALUES
        (:id, :customerId, :userId, :campaignId, :phone, :leadName, :company, :mode, :callStatus, :duration, :callJson, :startedAt, :startedAt)`,
      {
        id,
        customerId,
        userId,
        campaignId,
        phone: call.phone,
        leadName: call.leadName,
        company: call.company,
        mode: call.mode,
        callStatus: call.callStatus,
        duration: call.duration,
        callJson: JSON.stringify({ ...call, id, campaignId, meetingIds: meetingIdList, durationSeconds: call.duration }),
        startedAt,
      },
    )
  }

  console.log(`seeded ${SEED_CAMPAIGNS.length} campaigns, ${SEED_HISTORY.length} calls, ${SEED_MEETINGS.length} meetings`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
