import bcrypt from 'bcryptjs'
import type { RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { config } from '../src/core/config.js'
import { pool } from '../src/core/db.js'
import { seedEvaluationTemplates } from '../../../src/modules/training-ai/data/evaluationTemplates.js'
import { seedPersonas } from '../../../src/modules/training-ai/data/personas.js'
import { seedScenarios } from '../../../src/modules/training-ai/data/scenarios.js'

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
    console.log(`seeded user ${username}`)
  }

  const [counts] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM training_personas WHERE customer_id = :customerId',
    { customerId },
  )
  if (Number(counts[0]?.total ?? 0) > 0) {
    console.log('training catalog already present')
    await pool.end()
    return
  }

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
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
