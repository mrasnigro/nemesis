import type { RowDataPacket } from 'mysql2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pool } from '../src/core/db.js'
import { overrideCallAi, type CallAi } from '../src/modules/bdr/callAi.js'
import { processCallSummary, queueCallSummary } from '../src/modules/bdr/callSummary.js'
import { createPlatformAdmin, signIn, unique } from './helpers.js'

type Agent = Awaited<ReturnType<typeof signIn>>

let admin: Agent
let customerId: string
let manager: Agent // customer_admin
let operator: Agent // sdr_bdr
let outsider: Agent // sdr_bdr of another customer

const PHONES = ['(11) 98765-4321', '(21) 3333-4444', '(31) 99999-1111']

async function createCustomerUser(customer: string, profile: 'customer_admin' | 'sdr_bdr') {
  const username = unique('u')
  const response = await admin.post('/api/admin/users').send({
    customerId: customer,
    username,
    name: 'Usuário BDR',
    password: 'user-password',
    profile,
    moduleIds: ['bdr'],
  })
  expect(response.status).toBe(201)
  return { agent: await signIn(username, 'user-password'), id: response.body.data.id as string }
}

async function createCustomer() {
  const response = await admin
    .post('/api/admin/customers')
    .send({ name: unique('Cliente BDR '), plan: 'Enterprise', status: 'active', moduleIds: ['bdr'] })
  expect(response.status).toBe(201)
  return response.body.data.id as string
}

async function createCampaign(agent: Agent, name = unique('Campanha ')) {
  const response = await agent.post('/api/modules/bdr/campaigns').send({ name })
  expect(response.status).toBe(201)
  return response.body.data as { id: string; leads: number; completed: number; progress: number }
}

async function importLeads(agent: Agent, campaignId: string, phones = PHONES) {
  return agent
    .post(`/api/modules/bdr/campaigns/${campaignId}/leads`)
    .send({ leads: phones.map((phone, index) => ({ phone, company: `Empresa ${index}`, name: `Contato ${index}` })) })
}

/** Dials the next lead and forces the attempt to "answered" (the simulated line answers at random). */
async function answeredAttempt(agent: Agent, campaignId: string) {
  const response = await agent.post('/api/modules/bdr/dialer/attempts').send({ campaignId })
  expect(response.status).toBe(201)
  const attempt = response.body.data as { id: string; lead: { id: string } }
  await pool.query(
    `UPDATE bdr_dial_attempts SET status = 'answered', answered_at = NOW(3) WHERE id = :id`,
    { id: attempt.id },
  )
  return attempt
}

function callBody(attemptId: string | null, extra: Record<string, unknown> = {}) {
  return {
    phone: '(11) 98765-4321',
    mode: 'automatic',
    callStatus: 'Atendida',
    duration: 90,
    leadName: 'Contato 0',
    company: 'Empresa 0',
    qualificationId: 'interested',
    diagnosis: { painPoints: 'vendas', salesTemperature: 70 },
    attemptId,
    ...extra,
  }
}

async function rows(sql: string, params: Record<string, unknown>) {
  const [result] = await pool.query<RowDataPacket[]>(sql, params)
  return result
}

beforeAll(async () => {
  const credentials = await createPlatformAdmin()
  admin = await signIn(credentials.username, credentials.password)
  customerId = await createCustomer()
  ;({ agent: manager } = await createCustomerUser(customerId, 'customer_admin'))
  ;({ agent: operator } = await createCustomerUser(customerId, 'sdr_bdr'))
  ;({ agent: outsider } = await createCustomerUser(await createCustomer(), 'sdr_bdr'))
  expect((await operator.put('/api/modules/bdr/dialer/extension').send({ extension: '1001' })).status).toBe(200)
})

afterAll(async () => {
  await pool.end()
})

describe('campaigns and lead queue', () => {
  it('creates campaigns with server-owned counters', async () => {
    const response = await operator
      .post('/api/modules/bdr/campaigns')
      .send({ name: unique('Campanha '), leads: 999, completed: 999, progress: 100 })
    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ leads: 0, completed: 0, progress: 0, status: 'active' })
    expect(response.body.data).not.toHaveProperty('campaign_json')
  })

  it('imports leads, rejects bad and repeated phones, and keeps campaign counters in sync', async () => {
    const campaign = await createCampaign(operator)
    const first = await importLeads(operator, campaign.id, [...PHONES, '123', PHONES[0]])
    expect(first.status).toBe(201)
    expect(first.body.data).toMatchObject({ inserted: 3, duplicates: 1 })
    expect(first.body.data.invalid).toHaveLength(1)
    expect(first.body.data.summary).toMatchObject({ total: 3, ready: 3 })

    const again = await importLeads(operator, campaign.id, [PHONES[0]])
    expect(again.body.data).toMatchObject({ inserted: 0, duplicates: 1 })

    const list = await operator.get('/api/modules/bdr/campaigns')
    const stored = list.body.data.find((row: { id: string }) => row.id === campaign.id)
    expect(stored).toMatchObject({ leads: 3, completed: 0, progress: 0 })
  })

  it('does not expose another customer\'s campaigns', async () => {
    const campaign = await createCampaign(operator)
    const listed = await outsider.get('/api/modules/bdr/campaigns')
    expect(listed.body.data.some((row: { id: string }) => row.id === campaign.id)).toBe(false)
    expect((await importLeads(outsider, campaign.id)).status).toBe(404)
  })
})

describe('telephony settings', () => {
  it('is restricted to the customer administrator', async () => {
    expect((await operator.get('/api/modules/bdr/telephony/settings')).status).toBe(403)
    expect((await operator.put('/api/modules/bdr/telephony/settings').send({ provider: 'none' })).status).toBe(403)
    expect((await admin.get('/api/modules/bdr/telephony/settings')).status).toBe(403)
  })

  it('stores credentials encrypted and never returns them', async () => {
    const response = await manager.put('/api/modules/bdr/telephony/settings').send({
      provider: 'falevono',
      baseUrl: 'https://vono.example.test',
      deviceId: '12',
      apiToken: 'super-secret-token',
      apiKey: 'super-secret-key',
    })
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ provider: 'falevono', hasCredentials: true, deviceId: '12' })
    expect(JSON.stringify(response.body)).not.toContain('super-secret')

    const read = await manager.get('/api/modules/bdr/telephony/settings')
    expect(JSON.stringify(read.body)).not.toContain('super-secret')

    const [stored] = await rows('SELECT api_token_enc, api_key_enc FROM bdr_telephony_settings WHERE customer_id = :customerId', {
      customerId,
    })
    expect(stored.api_token_enc).toBeTruthy()
    expect(String(stored.api_token_enc)).not.toContain('super-secret-token')

    // Saving other fields keeps the stored credentials.
    const update = await manager.put('/api/modules/bdr/telephony/settings').send({ maxAttempts: 5 })
    expect(update.body.data).toMatchObject({ maxAttempts: 5, hasCredentials: true })
  })

  it('validates retry rules', async () => {
    const response = await manager.put('/api/modules/bdr/telephony/settings').send({ ringTimeoutSeconds: 1 })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('blocks dialing while the customer has no working telephony', async () => {
    // The previous test left falevono without a usable device/credentials URL reachable; switch it off explicitly.
    await manager.put('/api/modules/bdr/telephony/settings').send({ provider: 'none' })
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id)
    const response = await operator.post('/api/modules/bdr/dialer/attempts').send({ campaignId: campaign.id })
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('TELEPHONY_NOT_CONFIGURED')
    await manager.put('/api/modules/bdr/telephony/settings').send({ provider: 'simulated' })
  })
})

describe('dialer', () => {
  it('requires the operator extension', async () => {
    const { agent } = await createCustomerUser(customerId, 'sdr_bdr')
    const campaign = await createCampaign(agent)
    await importLeads(agent, campaign.id)
    const response = await agent.post('/api/modules/bdr/dialer/attempts').send({ campaignId: campaign.id })
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('NO_EXTENSION')
  })

  it('reports an empty queue with the next retry time', async () => {
    const campaign = await createCampaign(operator)
    const empty = await operator.post('/api/modules/bdr/dialer/attempts').send({ campaignId: campaign.id })
    expect(empty.status).toBe(200)
    expect(empty.body.data).toBeNull()
    expect(empty.body.queue).toMatchObject({ total: 0, ready: 0, scheduled: 0, nextAttemptAt: null })

    await importLeads(operator, campaign.id, [PHONES[0]])
    const retryAt = new Date(Date.now() + 30 * 60_000)
    await pool.query('UPDATE bdr_leads SET next_attempt_at = :retryAt WHERE campaign_id = :campaignId', {
      retryAt,
      campaignId: campaign.id,
    })
    const waiting = await operator.post('/api/modules/bdr/dialer/attempts').send({ campaignId: campaign.id })
    expect(waiting.status).toBe(200)
    expect(waiting.body.data).toBeNull()
    expect(waiting.body.queue).toMatchObject({ ready: 0, scheduled: 1 })
    expect(Date.parse(waiting.body.queue.nextAttemptAt)).toBeGreaterThan(Date.now())
  })

  it('reserves a lead per attempt and returns it to the queue when the operator hangs up', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[0]])
    const started = await operator.post('/api/modules/bdr/dialer/attempts').send({ campaignId: campaign.id })
    expect(started.status).toBe(201)
    expect(started.body.data).toMatchObject({ status: 'ringing', phone: '11987654321' })
    expect(started.body.data.lead).toMatchObject({ status: 'dialing', attempts: 1 })

    // The only lead is reserved, so a second reload cancels the first attempt before reserving again.
    const hangup = await operator.post(`/api/modules/bdr/dialer/attempts/${started.body.data.id}/hangup`)
    expect(hangup.status).toBe(200)
    expect(hangup.body.data).toMatchObject({ status: 'ended', outcome: 'cancelled' })

    const summary = await operator.get(`/api/modules/bdr/campaigns/${campaign.id}/leads/summary`)
    expect(summary.body.data.total).toBe(1)
    expect(summary.body.data.active).toBe(0)
  })

  it('keeps attempts private to the operator who dialed', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[1]])
    const started = await operator.post('/api/modules/bdr/dialer/attempts').send({ campaignId: campaign.id })
    const id = started.body.data.id
    expect((await manager.get(`/api/modules/bdr/dialer/attempts/${id}`)).status).toBe(404)
    expect((await outsider.get(`/api/modules/bdr/dialer/attempts/${id}`)).status).toBe(404)
    expect((await operator.get(`/api/modules/bdr/dialer/attempts/${id}`)).status).toBe(200)
  })

  it('lets the operator reclassify a false answer, which requeues the lead with a delay', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[2]])
    const attempt = await answeredAttempt(operator, campaign.id)
    const response = await operator
      .post(`/api/modules/bdr/dialer/attempts/${attempt.id}/outcome`)
      .send({ outcome: 'voicemail' })
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ status: 'ended', outcome: 'voicemail' })
    expect(response.body.data.lead).toMatchObject({ status: 'queued', lastOutcome: 'voicemail' })
    expect(response.body.data.lead.nextAttemptAt).toBeTruthy()
  })
})

describe('saved calls', () => {
  it('links the call to its attempt and lead, and closes the lead', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[0]])
    const attempt = await answeredAttempt(operator, campaign.id)

    const response = await operator
      .post('/api/modules/bdr/calls')
      .send(callBody(attempt.id, { campaignId: campaign.id, qualificationId: 'sold' }))
    expect(response.status).toBe(201)
    const call = response.body.data
    expect(call).toMatchObject({
      attemptId: attempt.id,
      leadId: attempt.lead.id,
      campaignId: campaign.id,
      qualificationId: 'sold',
      callStatus: 'Atendida',
      duration: 90,
      meetings: [],
    })
    expect(call.diagnosis).toMatchObject({ painPoints: 'vendas' })

    const [stored] = await rows('SELECT attempt_id, lead_id, qualification_id, call_json FROM bdr_calls WHERE id = :id', {
      id: call.id,
    })
    expect(stored.attempt_id).toBe(attempt.id)
    expect(stored.lead_id).toBe(attempt.lead.id)
    expect(stored.qualification_id).toBe('sold')
    // Column-owned values are not duplicated inside the JSON document.
    const document = typeof stored.call_json === 'string' ? JSON.parse(stored.call_json) : stored.call_json
    expect(document).not.toHaveProperty('attemptId')
    expect(document).not.toHaveProperty('qualificationId')
    expect(document).not.toHaveProperty('phone')

    const [linked] = await rows('SELECT status, call_id FROM bdr_dial_attempts WHERE id = :id', { id: attempt.id })
    expect(linked).toMatchObject({ status: 'ended', call_id: call.id })
    const [lead] = await rows('SELECT status, last_outcome FROM bdr_leads WHERE id = :id', { id: attempt.lead.id })
    expect(lead).toMatchObject({ status: 'done', last_outcome: 'sold' })

    const campaigns = await operator.get('/api/modules/bdr/campaigns')
    const refreshed = campaigns.body.data.find((row: { id: string }) => row.id === campaign.id)
    expect(refreshed).toMatchObject({ leads: 1, completed: 1, progress: 100 })
  })

  it('puts a callback lead back in the queue at the promised time', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[1]])
    const attempt = await answeredAttempt(operator, campaign.id)
    const callbackAt = new Date(Date.now() + 3 * 3_600_000).toISOString()

    const response = await operator
      .post('/api/modules/bdr/calls')
      .send(callBody(attempt.id, { campaignId: campaign.id, qualificationId: 'callback', callbackAt }))
    expect(response.status).toBe(201)
    expect(response.body.data.callbackAt).toBe(callbackAt)

    const [lead] = await rows('SELECT status, attempts, next_attempt_at FROM bdr_leads WHERE id = :id', {
      id: attempt.lead.id,
    })
    expect(lead.status).toBe('queued')
    expect(Number(lead.attempts)).toBe(0) // a callback does not consume an attempt
    expect(new Date(lead.next_attempt_at).toISOString()).toBe(callbackAt)
  })

  it('refuses to save a call for an attempt nobody answered, without leaving a call behind', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[2]])
    const started = await operator.post('/api/modules/bdr/dialer/attempts').send({ campaignId: campaign.id })
    const before = await rows('SELECT COUNT(*) AS total FROM bdr_calls WHERE customer_id = :customerId', { customerId })

    const response = await operator.post('/api/modules/bdr/calls').send(callBody(started.body.data.id))
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('ATTEMPT_NOT_ANSWERED')

    const after = await rows('SELECT COUNT(*) AS total FROM bdr_calls WHERE customer_id = :customerId', { customerId })
    expect(Number(after[0].total)).toBe(Number(before[0].total))
  })

  it('saves each attempt only once', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[0]])
    const attempt = await answeredAttempt(operator, campaign.id)
    expect((await operator.post('/api/modules/bdr/calls').send(callBody(attempt.id))).status).toBe(201)
    const repeated = await operator.post('/api/modules/bdr/calls').send(callBody(attempt.id))
    expect(repeated.status).toBe(409)
    expect(repeated.body.error.code).toBe('ATTEMPT_ALREADY_SAVED')
  })

  it("does not accept another operator's attempt", async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[1]])
    const attempt = await answeredAttempt(operator, campaign.id)
    const response = await manager.post('/api/modules/bdr/calls').send(callBody(attempt.id))
    expect(response.status).toBe(404)
  })

  it('saves manual calls without an attempt and filters history by qualification', async () => {
    const qualificationId = unique('q')
    const saved = await operator
      .post('/api/modules/bdr/calls')
      .send(callBody(null, { mode: 'manual', qualificationId }))
    expect(saved.status).toBe(201)
    expect(saved.body.data).toMatchObject({ attemptId: null, leadId: null, mode: 'manual', qualificationId })

    const filtered = await operator.get('/api/modules/bdr/calls').query({ qualificationId })
    expect(filtered.body.data.map((row: { id: string }) => row.id)).toEqual([saved.body.data.id])
    expect(filtered.body.page.total).toBe(1)

    const detail = await operator.get(`/api/modules/bdr/calls/${saved.body.data.id}`)
    expect(detail.status).toBe(200)
  })

  it('keeps call history private to the customer', async () => {
    const saved = await operator.post('/api/modules/bdr/calls').send(callBody(null, { mode: 'manual' }))
    expect((await outsider.get(`/api/modules/bdr/calls/${saved.body.data.id}`)).status).toBe(404)
    expect((await outsider.get(`/api/modules/bdr/calls/${saved.body.data.id}/recording`)).status).toBe(404)
  })

  it('attaches meetings booked during the call and ignores foreign ones', async () => {
    const mine = await operator
      .post('/api/modules/bdr/meetings')
      .send({ leadName: 'Carlos Oliveira', company: 'Indústria XYZ', date: '2030-08-06', time: '09:30' })
    expect(mine.status).toBe(201)
    expect(mine.body.data.recordingUrl).toBeNull()
    const foreign = await outsider
      .post('/api/modules/bdr/meetings')
      .send({ leadName: 'Outro Cliente', date: '2030-08-06', time: '10:00' })

    const saved = await operator
      .post('/api/modules/bdr/calls')
      .send(callBody(null, { mode: 'manual', meetingIds: [mine.body.data.id, foreign.body.data.id] }))
    expect(saved.status).toBe(201)
    expect(saved.body.data.meetingIds).toEqual([mine.body.data.id])
    expect(saved.body.data.meetings[0]).toMatchObject({ leadName: 'Carlos Oliveira', callId: saved.body.data.id })

    const listed = await operator.get('/api/modules/bdr/calls').query({ qualificationId: 'interested', pageSize: 100 })
    const row = listed.body.data.find((call: { id: string }) => call.id === saved.body.data.id)
    expect(row.meetings).toHaveLength(1)

    const foreignMeeting = await rows('SELECT call_id FROM bdr_meetings WHERE id = :id', { id: foreign.body.data.id })
    expect(foreignMeeting[0].call_id).toBeNull()
  })

  it('serves a stored recording to its own customer only', async () => {
    const campaign = await createCampaign(operator)
    await importLeads(operator, campaign.id, [PHONES[2]])
    const attempt = await answeredAttempt(operator, campaign.id)
    const saved = await operator.post('/api/modules/bdr/calls').send(callBody(attempt.id))
    const callId = saved.body.data.id as string

    expect(saved.body.data.recordingUrl).toBeNull()
    expect((await operator.get(`/api/modules/bdr/calls/${callId}/recording`)).status).toBe(404)

    // A stored file is only reachable through the path persisted on the attempt.
    const { mkdir, writeFile, rm } = await import('node:fs/promises')
    const path = await import('node:path')
    const { config } = await import('../src/core/config.js')
    const relative = `${customerId}/${callId}.mp3`
    const absolute = path.resolve(config.RECORDINGS_DIR, relative)
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, 'ID3-test')
    try {
      await pool.query(
        `UPDATE bdr_dial_attempts SET recording_status = 'stored', recording_path = :relative WHERE id = :id`,
        { relative, id: attempt.id },
      )
      const detail = await operator.get(`/api/modules/bdr/calls/${callId}`)
      expect(detail.body.data.recordingUrl).toBe(`/api/modules/bdr/calls/${callId}/recording`)
      const audio = await operator.get(`/api/modules/bdr/calls/${callId}/recording`)
      expect(audio.status).toBe(200)
      expect(audio.headers['content-type']).toContain('audio/mpeg')
      expect((await outsider.get(`/api/modules/bdr/calls/${callId}/recording`)).status).toBe(404)
    } finally {
      await rm(path.dirname(absolute), { recursive: true, force: true })
    }
  })
})

describe('call summary', () => {
  async function summaryOf(callId: string) {
    const detail = await operator.get(`/api/modules/bdr/calls/${callId}`)
    expect(detail.status).toBe(200)
    return detail.body.data as {
      summary: { text: string; source: string; status: string }
      transcript: string | null
      hasTranscript: boolean
    }
  }

  async function waitFor(callId: string, done: (call: Awaited<ReturnType<typeof summaryOf>>) => boolean) {
    for (let i = 0; i < 40; i += 1) {
      const call = await summaryOf(callId)
      if (done(call)) return call
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('summary did not reach the expected state')
  }

  it('builds a summary from the saved attendance when no AI provider is configured', async () => {
    const meeting = await operator
      .post('/api/modules/bdr/meetings')
      .send({ leadName: 'Contato 0', company: 'Empresa 0', date: '2030-08-06', time: '09:30' })
    const saved = await operator.post('/api/modules/bdr/calls').send(
      callBody(null, {
        mode: 'manual',
        qualification: 'Agendamento / Retorno',
        clientStatus: 'Agendado',
        notes: 'Pediu proposta por e-mail',
        diagnosis: {
          painPoints: 'Equipe comercial sem rotina',
          needs: 'Previsibilidade de agenda',
          conversationSummary: 'Interessado, quer falar com o sócio',
          salesTemperature: 70,
          pains: { vendas: true, gestao: true, lucro: false },
        },
        meetingIds: [meeting.body.data.id],
      }),
    )
    expect(saved.status).toBe(201)
    const { summary } = saved.body.data
    expect(summary).toMatchObject({ source: 'record', status: 'none' })
    expect(summary.text).toContain('Ligação manual com Contato 0 — Empresa 0')
    expect(summary.text).toContain('Resultado: Agendamento / Retorno · status do cliente Agendado.')
    expect(summary.text).toContain('Termômetro de venda: 70% (Quente).')
    expect(summary.text).toContain('Dores marcadas: Vendas, Gestão.')
    expect(summary.text).toContain('Necessidades: Previsibilidade de agenda')
    expect(summary.text).toContain('Resumo do operador: Interessado, quer falar com o sócio')
    expect(summary.text).toContain('Reunião agendada para 06/08/2030 às 09:30.')
    expect(summary.text).toContain('Gravação: não disponível.')

    const listed = await operator.get('/api/modules/bdr/calls').query({ pageSize: 100 })
    const row = listed.body.data.find((call: { id: string }) => call.id === saved.body.data.id)
    expect(row.summary.text).toBe(summary.text)
    expect(row).not.toHaveProperty('transcript')
  })

  it('writes an AI summary from the form, then redoes it from the transcript when the recording arrives', async () => {
    const inputs: { facts: string; transcript: string | null }[] = []
    const fake: CallAi = {
      canTranscribe: true,
      transcribe: async () => 'Cliente: Alô? Vendedor: Bom dia, aqui é da IMP.',
      summarize: async (input) => {
        inputs.push(input)
        return input.transcript ? 'Resumo com a conversa.' : 'Resumo do formulário.'
      },
    }
    overrideCallAi(fake)
    const { mkdir, writeFile, rm } = await import('node:fs/promises')
    const path = await import('node:path')
    const { config } = await import('../src/core/config.js')
    let folder: string | null = null
    try {
      const campaign = await createCampaign(operator)
      await importLeads(operator, campaign.id, [PHONES[0]])
      const attempt = await answeredAttempt(operator, campaign.id)
      const saved = await operator.post('/api/modules/bdr/calls').send(callBody(attempt.id, { campaignId: campaign.id }))
      expect(saved.status).toBe(201)
      const callId = saved.body.data.id as string

      const fromForm = await waitFor(callId, (call) => call.summary.status === 'ready')
      expect(fromForm.summary).toMatchObject({ text: 'Resumo do formulário.', source: 'ai' })
      expect(inputs[0].facts).toContain('Termômetro de venda: 70% (Quente).')
      expect(inputs[0].transcript).toBeNull()

      const relative = `${customerId}/${attempt.id}.mp3`
      const absolute = path.resolve(config.RECORDINGS_DIR, relative)
      folder = path.dirname(absolute)
      await mkdir(folder, { recursive: true })
      await writeFile(absolute, 'ID3-test')
      await pool.query(
        `UPDATE bdr_dial_attempts SET recording_status = 'stored', recording_path = :relative WHERE id = :id`,
        { relative, id: attempt.id },
      )
      await queueCallSummary(callId)

      const fromAudio = await waitFor(callId, (call) => call.summary.source === 'ai_audio')
      expect(fromAudio.summary).toMatchObject({ text: 'Resumo com a conversa.', status: 'ready' })
      expect(fromAudio.transcript).toBe('Cliente: Alô? Vendedor: Bom dia, aqui é da IMP.')
      expect(fromAudio.hasTranscript).toBe(true)
      expect(inputs.at(-1)?.facts).toContain('Gravação: disponível.')
    } finally {
      overrideCallAi(undefined)
      if (folder) await rm(folder, { recursive: true, force: true })
    }
  })

  it('gives up after repeated provider errors and keeps the summary built from the form', async () => {
    overrideCallAi({
      canTranscribe: false,
      transcribe: async () => '',
      summarize: async () => {
        throw new Error('provider down')
      },
    })
    try {
      const saved = await operator.post('/api/modules/bdr/calls').send(callBody(null, { mode: 'manual' }))
      const callId = saved.body.data.id as string
      for (let i = 0; i < 10; i += 1) {
        await processCallSummary(callId)
        const [row] = await rows('SELECT summary_status FROM bdr_calls WHERE id = :id', { id: callId })
        if (row.summary_status === 'failed') break
      }
      const call = await summaryOf(callId)
      expect(call.summary).toMatchObject({ source: 'record', status: 'failed' })
      expect(call.summary.text).toContain('Ligação manual com Contato 0')
    } finally {
      overrideCallAi(undefined)
    }
  })
})

describe('meetings and metrics', () => {
  it('creates, patches and removes a meeting', async () => {
    const created = await operator
      .post('/api/modules/bdr/meetings')
      .send({ leadName: 'Maria Santos', company: 'Tech Solutions', date: '2030-09-01', time: '14:30', notes: '' })
    expect(created.status).toBe(201)
    const id = created.body.data.id

    const patched = await operator.patch(`/api/modules/bdr/meetings/${id}`).send({ notes: 'Enviar proposta' })
    expect(patched.status).toBe(200)
    expect(patched.body.data.notes).toBe('Enviar proposta')

    expect((await outsider.patch(`/api/modules/bdr/meetings/${id}`).send({ notes: 'x' })).status).toBe(404)
    expect((await outsider.delete(`/api/modules/bdr/meetings/${id}`)).status).toBe(404)
    expect((await operator.delete(`/api/modules/bdr/meetings/${id}`)).status).toBe(204)
    expect((await operator.delete(`/api/modules/bdr/meetings/${id}`)).status).toBe(404)
  })

  it('computes metrics from stored calls only', async () => {
    const customer = await createCustomer()
    const { agent } = await createCustomerUser(customer, 'sdr_bdr')

    const empty = await agent.get('/api/modules/bdr/metrics')
    expect(empty.body.data).toMatchObject({
      totalCalls: 0,
      callsToday: 0,
      meetingsScheduled: 0,
      weekDeltaPercent: 0,
      averageDurationLabel: '0m 0s',
    })

    await agent.post('/api/modules/bdr/calls').send(callBody(null, { mode: 'manual', duration: 120 }))
    await agent.post('/api/modules/bdr/calls').send(callBody(null, { mode: 'manual', duration: 60 }))
    const metrics = await agent.get('/api/modules/bdr/metrics')
    expect(metrics.body.data).toMatchObject({
      totalCalls: 2,
      callsToday: 2,
      averageDurationLabel: '1m 30s',
      weekDeltaPercent: 100,
    })
  })

  it('requires the bdr module', async () => {
    const customer = await admin
      .post('/api/admin/customers')
      .send({ name: unique('Sem BDR '), plan: 'Growth', status: 'active', moduleIds: ['vsl'] })
    const username = unique('u')
    await admin.post('/api/admin/users').send({
      customerId: customer.body.data.id,
      username,
      name: 'Sem módulo',
      password: 'user-password',
      profile: 'sdr_bdr',
      moduleIds: ['vsl'],
    })
    const agent = await signIn(username, 'user-password')
    const response = await agent.get('/api/modules/bdr/campaigns')
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('MODULE_FORBIDDEN')
  })
})
