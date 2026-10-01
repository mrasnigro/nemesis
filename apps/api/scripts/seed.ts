import bcrypt from 'bcryptjs'
import type { RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { config } from '../src/core/config.js'
import { pool } from '../src/core/db.js'
import { seedEvaluationTemplates } from '../../../src/modules/training-ai/data/evaluationTemplates.js'
import { seedPersonas } from '../../../src/modules/training-ai/data/personas.js'
import { seedScenarios } from '../../../src/modules/training-ai/data/scenarios.js'
import { SEED_CAMPAIGNS, SEED_HISTORY, SEED_MEETINGS } from '../../../src/modules/bdr/data/seeds.js'

async function main() {
  const username = config.SEED_USERNAME.trim().toLowerCase()
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id, customer_id FROM users WHERE username = :username LIMIT 1',
    { username },
  )

  let userId = existing[0] ? String(existing[0].id) : ''
  let customerId = existing[0]?.customer_id ? String(existing[0].customer_id) : ''

  if (!userId) {
    customerId = ulid()
    userId = ulid()
    const now = new Date()
    const passwordHash = await bcrypt.hash(config.SEED_PASSWORD, 10)
    await pool.query(
      `INSERT INTO customers (id, name, created_at, updated_at) VALUES (:id, :name, :now, :now)`,
      { id: customerId, name: 'Acelere Seu Crescimento', now },
    )
    await pool.query(
      `INSERT INTO users
        (id, customer_id, username, name, role, password_hash, created_at, updated_at)
       VALUES
        (:id, :customerId, :username, :name, 'imp', :passwordHash, :now, :now)`,
      {
        id: userId,
        customerId,
        username,
        name: config.SEED_NAME,
        passwordHash,
        now,
      },
    )
    await pool.query(`INSERT INTO user_modules (user_id, module_id) VALUES (:userId, 'training-ai')`, {
      userId,
    })
    await pool.query(`INSERT INTO user_modules (user_id, module_id) VALUES (:userId, 'bdr')`, {
      userId,
    })
    console.log(`seeded user ${username}`)
  }

  await pool.query(
    `INSERT IGNORE INTO user_modules (user_id, module_id) VALUES (:userId, 'bdr')`,
    { userId },
  )

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
  await pool.end()
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
