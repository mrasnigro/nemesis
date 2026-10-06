import http from 'node:http'
import type { AddressInfo } from 'node:net'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pool } from '../src/core/db.js'
import { StreamHub, MAX_VIEWER_BACKLOG_BYTES, type StreamViewer } from '../src/modules/webinar/stream.hub.js'
import { clusterStartsWithKeyframe, findVideoTrack } from '../src/modules/webinar/webm.js'
import { app, createPlatformAdmin, grantWebinarPlan, signIn, unique } from './helpers.js'

type Agent = Awaited<ReturnType<typeof signIn>>

const BASE = '/api/modules/webinar'
const PUBLIC = '/api/public/webinar'

/** The WebM Cluster id, written as a latin1 string so test data stays readable. */
const CL = '\x1fC\xb6u'
const bytes = (text: string) => Buffer.from(text, 'latin1')

/** A viewer that records what it was sent (latin1, so binary markers survive). */
function fakeViewer(queued = 0) {
  const received: string[] = []
  let closed = 0
  const viewer: StreamViewer = {
    write(data) {
      received.push(data.toString('latin1'))
      return queued
    },
    close() {
      closed += 1
    },
  }
  return { viewer, received, closedCount: () => closed }
}

describe('StreamHub', () => {
  it('starts a late joiner at the latest Cluster, after the header', () => {
    const hub = new StreamHub()
    hub.push('w', bytes(`H${CL}a`), true)
    hub.push('w', bytes('b'), false)
    hub.push('w', bytes(`${CL}c`), false)
    hub.push('w', bytes('d'), false)

    const late = fakeViewer()
    hub.join('w', 'lead-1', late.viewer)
    expect(late.received.join('')).toBe(`H${CL}cd`)
  })

  it('gives a viewer who arrived early the header, then media from the first Cluster', () => {
    const hub = new StreamHub()
    const early = fakeViewer()
    hub.join('w', 'lead-1', early.viewer)
    expect(early.received).toEqual([])

    hub.push('w', bytes(`H${CL}a`), true)
    hub.push('w', bytes('b'), false)
    expect(early.received).toEqual(['H', `${CL}a`, 'b'])
  })

  it('holds a viewer back until a Cluster starts, even when it is split across chunks', () => {
    const hub = new StreamHub()
    hub.push('w', bytes('H'), true) // header only, no media yet
    hub.push('w', bytes('xx'), false)
    const viewer = fakeViewer()
    hub.join('w', 'lead-1', viewer.viewer)
    expect(viewer.received).toEqual(['H']) // nothing playable yet

    hub.push('w', bytes('yy\x1fC'), false) // first half of the id
    expect(viewer.received).toEqual(['H'])
    hub.push('w', bytes('\xb6uzz'), false) // second half
    expect(viewer.received).toEqual(['H', `${CL}zz`])
    hub.push('w', bytes('more'), false)
    expect(viewer.received.at(-1)).toBe('more')
  })

  it('stops waiting for a Cluster in a format that has none', () => {
    const hub = new StreamHub()
    hub.push('w', bytes('H'), true)
    const viewer = fakeViewer()
    hub.join('w', 'lead-1', viewer.viewer)
    for (let n = 1; n <= 7; n += 1) hub.push('w', bytes(`c${n}`), false)
    expect(viewer.received).toEqual(['H'])
    hub.push('w', bytes('c8'), false)
    expect(viewer.received).toEqual(['H', 'c8'])
  })

  it('refuses a chunk when the recording has no header yet', () => {
    const hub = new StreamHub()
    expect(hub.push('w', bytes('c1'), false)).toBe(false)
    expect(hub.push('w', bytes('H'), true)).toBe(true)
    expect(hub.push('w', bytes('c1'), false)).toBe(true)
  })

  it('closes viewers of the old recording when a new header arrives', () => {
    const hub = new StreamHub()
    hub.push('w', bytes(`H1${CL}a`), true)
    const playing = fakeViewer()
    hub.join('w', 'lead-1', playing.viewer)

    hub.push('w', bytes(`H2${CL}b`), true)
    expect(playing.closedCount()).toBe(1)
    expect(hub.viewerCount('w')).toBe(0)

    const next = fakeViewer()
    hub.join('w', 'lead-1', next.viewer)
    expect(next.received.join('')).toBe(`H2${CL}b`)
  })

  it('counts people, not connections', () => {
    const hub = new StreamHub()
    const first = fakeViewer()
    const second = fakeViewer()
    const leaveFirst = hub.join('w', 'lead-1', first.viewer)
    hub.join('w', 'lead-1', second.viewer)

    expect(first.closedCount()).toBe(1)
    expect(hub.viewerCount('w')).toBe(1)
    leaveFirst() // the replaced connection must not remove the one that replaced it
    expect(hub.viewerCount('w')).toBe(1)
  })

  it('drops a viewer that cannot keep up', () => {
    const hub = new StreamHub()
    hub.push('w', bytes(`H${CL}a`), true)
    const slow = fakeViewer(MAX_VIEWER_BACKLOG_BYTES + 1)
    hub.join('w', 'lead-1', slow.viewer)
    hub.push('w', bytes('c1'), false)

    expect(slow.closedCount()).toBe(1)
    expect(hub.viewerCount('w')).toBe(0)
  })

  it('keeps only a bounded history', () => {
    const hub = new StreamHub()
    hub.push('w', bytes(`H${CL}a`), true)
    for (let n = 0; n < 50; n += 1) hub.push('w', Buffer.alloc(100_000), false) // 5 MB, more than is kept
    const late = fakeViewer()
    hub.join('w', 'lead-1', late.viewer)
    // The Cluster start scrolled out of the window, so the joiner gets the header and waits for the next one.
    expect(late.received).toEqual(['H'])
  })

  it('reports stats, tracks the peak, and forgets everything when it ends', () => {
    const hub = new StreamHub()
    expect(hub.stats('w').broadcasting).toBe(false)
    hub.push('w', bytes('H'), true)
    const a = hub.join('w', 'a', fakeViewer().viewer)
    hub.join('w', 'b', fakeViewer().viewer)
    a()

    const stats = hub.stats('w')
    expect(stats).toMatchObject({ broadcasting: true, viewers: 1, peakViewers: 2, chunks: 1 })
    expect(hub.stats('w', Date.now() + 60_000).broadcasting).toBe(false) // signal lost

    const open = fakeViewer()
    hub.join('w', 'c', open.viewer)
    hub.end('w')
    expect(open.closedCount()).toBe(1)
    expect(hub.stats('w').viewers).toBe(0)
  })

  it('keeps waiting viewers across a restart but closes those still playing', () => {
    const hub = new StreamHub()
    const playing = fakeViewer()
    hub.join('w', 'playing', playing.viewer)
    hub.push('w', bytes(`H1${CL}a`), true) // `playing` now has the first recording
    const waiting = fakeViewer()
    hub.start('w') // a new broadcast: the old one is thrown away
    expect(playing.closedCount()).toBe(1)

    hub.join('w', 'waiting', waiting.viewer)
    hub.push('w', bytes(`H2${CL}z`), true)
    expect(waiting.received).toEqual(['H2', `${CL}z`])
  })
})

// A tiny WebM writer: just enough structure for the hub to tell keyframe Clusters from the rest.
const vint = (n: number) => Buffer.from([0x01, 0, 0, 0, 0, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff])
const UNKNOWN_SIZE = Buffer.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
const el = (id: number[], ...payload: Buffer[]) => {
  const body = Buffer.concat(payload)
  return Buffer.concat([Buffer.from(id), vint(body.length), body])
}
const trackEntry = (number: number, type: number) => el([0xae], el([0xd7], Buffer.from([number])), el([0x83], Buffer.from([type])))
const simpleBlock = (track: number, key: boolean, size = 50) =>
  el([0xa3], Buffer.from([0x80 | track, 0, 0, key ? 0x80 : 0]), Buffer.alloc(size, 7))

/** EBML header, Segment of unknown size, and Tracks (audio listed first, as Chrome does). */
const webmHeader = () =>
  Buffer.concat([
    el([0x1a, 0x45, 0xdf, 0xa3], el([0x42, 0x82], Buffer.from('webm'))),
    Buffer.from([0x18, 0x53, 0x80, 0x67]),
    UNKNOWN_SIZE,
    el([0x16, 0x54, 0xae, 0x6b], trackEntry(2, 2), trackEntry(1, 1)),
  ])

/** A Cluster of unknown size that, like MediaRecorder's, starts with an audio block. */
const webmCluster = (key: boolean, size = 50) =>
  Buffer.concat([Buffer.from([0x1f, 0x43, 0xb6, 0x75]), UNKNOWN_SIZE, el([0xe7], Buffer.from([0])), simpleBlock(2, true, 10), simpleBlock(1, key, size)])

describe('WebM reading', () => {
  it('finds the video track whatever the track order', () => {
    expect(findVideoTrack(webmHeader())).toBe(1)
  })

  it('returns nothing for bytes that are not a WebM header', () => {
    expect(findVideoTrack(bytes('H'))).toBeNull()
    expect(findVideoTrack(Buffer.alloc(0))).toBeNull()
    expect(findVideoTrack(Buffer.alloc(40, 0xff))).toBeNull()
  })

  it('tells a keyframe Cluster from a delta one, and says when it cannot tell yet', () => {
    expect(clusterStartsWithKeyframe(webmCluster(true), 0, 1)).toBe(true)
    expect(clusterStartsWithKeyframe(webmCluster(false), 0, 1)).toBe(false)
    const whole = webmCluster(true)
    expect(clusterStartsWithKeyframe(whole.subarray(0, whole.length - 60), 0, 1)).toBeNull()
  })
})

describe('StreamHub with a real WebM stream', () => {
  const header = webmHeader()
  const media = (...clusters: Buffer[]) => Buffer.concat(clusters)

  it('starts a late joiner at the latest keyframe, not the latest Cluster', () => {
    const hub = new StreamHub()
    const keyframe = webmCluster(true, 60)
    hub.push('w', Buffer.concat([header, webmCluster(true, 40)]), true)
    hub.push('w', webmCluster(false), false)
    hub.push('w', keyframe, false)
    hub.push('w', webmCluster(false), false)
    hub.push('w', webmCluster(false), false)

    const late = fakeViewer()
    hub.join('w', 'lead-1', late.viewer)
    const sent = Buffer.from(late.received.join(''), 'latin1')
    expect(sent.subarray(0, header.length).equals(header)).toBe(true)
    const body = sent.subarray(header.length)
    expect(body.subarray(0, keyframe.length).equals(keyframe)).toBe(true)
    expect(body.length).toBe(keyframe.length + 2 * webmCluster(false).length)
  })

  it('keeps a viewer waiting through delta Clusters and starts them at the next keyframe', () => {
    const hub = new StreamHub()
    hub.push('w', header, true)
    const viewer = fakeViewer()
    hub.join('w', 'lead-1', viewer.viewer)
    expect(viewer.received).toHaveLength(1) // header only

    hub.push('w', media(webmCluster(false), webmCluster(false)), false)
    expect(viewer.received).toHaveLength(1) // nothing a decoder could start on

    const keyframe = webmCluster(true)
    hub.push('w', Buffer.concat([webmCluster(false), keyframe]), false)
    expect(viewer.received).toHaveLength(2)
    expect(Buffer.from(viewer.received[1], 'latin1').equals(keyframe)).toBe(true)

    const delta = webmCluster(false)
    hub.push('w', delta, false)
    expect(Buffer.from(viewer.received[2], 'latin1').equals(delta)).toBe(true)
  })

  it('waits for the rest of a Cluster whose first video frame has not fully arrived', () => {
    const hub = new StreamHub()
    hub.push('w', header, true)
    const viewer = fakeViewer()
    hub.join('w', 'lead-1', viewer.viewer)

    const keyframe = webmCluster(true, 20_000)
    const cut = 30
    hub.push('w', keyframe.subarray(0, cut), false) // just the start of the Cluster
    expect(viewer.received).toHaveLength(1)
    hub.push('w', keyframe.subarray(cut), false)
    expect(viewer.received).toHaveLength(2)
    expect(Buffer.from(viewer.received[1], 'latin1').equals(keyframe)).toBe(true)
  })

  it('finds a Cluster id that is split between two chunks', () => {
    const hub = new StreamHub()
    hub.push('w', header, true)
    const viewer = fakeViewer()
    hub.join('w', 'lead-1', viewer.viewer)
    const keyframe = webmCluster(true)
    hub.push('w', keyframe.subarray(0, 2), false)
    hub.push('w', keyframe.subarray(2), false)
    expect(Buffer.from(viewer.received.slice(1).join(''), 'latin1').equals(keyframe)).toBe(true)
  })

  it('gives up waiting for a keyframe only after a long while', () => {
    const hub = new StreamHub()
    hub.push('w', header, true)
    const viewer = fakeViewer()
    hub.join('w', 'lead-1', viewer.viewer)
    for (let n = 0; n < 39; n += 1) hub.push('w', webmCluster(false), false)
    expect(viewer.received).toHaveLength(1)
    hub.push('w', webmCluster(false), false)
    expect(viewer.received).toHaveLength(2)
  })
})

let admin: Agent
let customerId: string
let manager: Agent
let owner: Agent
let colleague: Agent
let outsider: Agent
let noModule: Agent

async function createCustomer(moduleIds = ['webinar']) {
  const response = await admin
    .post('/api/admin/customers')
    .send({ name: unique('Cliente Stream '), plan: 'Enterprise', status: 'active', moduleIds })
  expect(response.status).toBe(201)
  if (moduleIds.includes('webinar')) await grantWebinarPlan(admin, response.body.data.id)
  return response.body.data.id as string
}

async function createUser(customer: string, profile: 'customer_admin' | 'sdr_bdr', moduleIds = ['webinar']) {
  const username = unique('u')
  const response = await admin.post('/api/admin/users').send({
    customerId: customer,
    username,
    name: 'Usuário Stream',
    password: 'user-password',
    profile,
    moduleIds,
  })
  expect(response.status).toBe(201)
  return signIn(username, 'user-password')
}

const inHours = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString()

async function createWebinar() {
  const response = await owner.post(`${BASE}/webinars`).send({
    title: unique('Live '),
    scheduledAt: inHours(1),
    durationMinutes: 60,
    presenterName: 'Ana',
  })
  expect(response.status).toBe(201)
  return response.body.data.id as string
}

async function setStatus(agent: Agent, webinarId: string, status: string) {
  const response = await agent.post(`${BASE}/webinars/${webinarId}/status`).send({ status })
  expect(response.status).toBe(200)
}

async function registerLead(webinarId: string): Promise<string> {
  const code = await owner
    .post(`${BASE}/webinars/${webinarId}/access-codes`)
    .send({ scheduledAt: inHours(-1), expiresAt: inHours(48) })
  expect(code.status).toBe(201)
  const registered = await request(app)
    .post(`${PUBLIC}/register`)
    .send({ code: code.body.data.code, name: 'Maria', email: `${unique('l')}@example.com` })
  expect(registered.status).toBe(201)
  return registered.body.data.leadId as string
}

function chunk(agent: Agent, webinarId: string, data: Buffer | string, header = false) {
  return agent
    .post(`${BASE}/webinars/${webinarId}/stream/chunk${header ? '?header=1' : ''}`)
    .set('Content-Type', 'application/octet-stream')
    .send(Buffer.isBuffer(data) ? data : bytes(data))
}

beforeAll(async () => {
  const credentials = await createPlatformAdmin()
  admin = await signIn(credentials.username, credentials.password)
  customerId = await createCustomer()
  manager = await createUser(customerId, 'customer_admin')
  owner = await createUser(customerId, 'sdr_bdr')
  colleague = await createUser(customerId, 'sdr_bdr')
  outsider = await createUser(await createCustomer(), 'customer_admin')
  noModule = await createUser(await createCustomer(['bdr']), 'sdr_bdr', ['bdr'])
})

afterAll(async () => {
  await pool.end()
})

describe('sending the recording', () => {
  it('requires a session, the module and ownership', async () => {
    const id = await createWebinar()
    await setStatus(owner, id, 'live')

    expect((await request(app).post(`${BASE}/webinars/${id}/stream/chunk`).send('x')).status).toBe(401)
    expect((await chunk(noModule, id, 'x', true)).status).toBe(403)
    expect((await chunk(outsider, id, 'x', true)).status).toBe(404)
    const colleagueResponse = await chunk(colleague, id, 'x', true)
    expect(colleagueResponse.status).toBe(403)
    expect(colleagueResponse.body.error.code).toBe('FORBIDDEN')

    expect((await chunk(owner, id, 'H', true)).status).toBe(204)
    expect((await chunk(manager, id, 'c1')).status).toBe(204) // a customer administrator may run it too
  })

  it('only accepts video while the webinar is live', async () => {
    const id = await createWebinar()
    const early = await chunk(owner, id, 'H', true)
    expect(early.status).toBe(409)
    expect(early.body.error.code).toBe('NOT_LIVE')

    await setStatus(owner, id, 'live')
    expect((await chunk(owner, id, 'H', true)).status).toBe(204)
    await setStatus(owner, id, 'completed')
    expect((await chunk(owner, id, 'c1')).status).toBe(409)
  })

  it('rejects an empty body, other content types, and oversized chunks', async () => {
    const id = await createWebinar()
    await setStatus(owner, id, 'live')

    expect((await owner.post(`${BASE}/webinars/${id}/stream/chunk?header=1`).set('Content-Type', 'application/octet-stream')).status).toBe(400)
    expect((await owner.post(`${BASE}/webinars/${id}/stream/chunk?header=1`).send({ not: 'video' })).status).toBe(400)
    expect((await chunk(owner, id, Buffer.alloc(1024 * 1024 + 1), true)).status).toBe(413)
  })

  it('asks the presenter to restart when the server has no header (for instance after a restart)', async () => {
    const id = await createWebinar()
    await setStatus(owner, id, 'live')
    const response = await chunk(owner, id, 'c1')
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('STREAM_NEEDS_HEADER')
    expect((await chunk(owner, id, 'H', true)).status).toBe(204)
    expect((await chunk(owner, id, 'c1')).status).toBe(204)
  })

  it('shows the studio whether the signal is arriving', async () => {
    const id = await createWebinar()
    const idle = await owner.get(`${BASE}/webinars/${id}/stream`)
    expect(idle.status).toBe(200)
    expect(idle.body.data).toMatchObject({ broadcasting: false, viewers: 0, status: 'draft' })

    await setStatus(owner, id, 'live')
    await chunk(owner, id, 'H', true)
    await chunk(owner, id, 'c1')
    const live = await colleague.get(`${BASE}/webinars/${id}/stream`) // anyone with the module may look
    expect(live.body.data).toMatchObject({ broadcasting: true, chunks: 2, status: 'live' })

    expect((await outsider.get(`${BASE}/webinars/${id}/stream`)).status).toBe(404)
    expect((await request(app).get(`${BASE}/webinars/${id}/stream`)).status).toBe(401)
  })
})

describe('watching', () => {
  let server: http.Server
  let port: number

  beforeAll(async () => {
    server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  /** Opens the viewer stream; resolves with the response once headers arrive. */
  function watch(leadId: string) {
    return new Promise<{ response: http.IncomingMessage; body: () => string; closed: Promise<void> }>((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port, path: `${PUBLIC}/leads/${leadId}/stream` }, (response) => {
        let text = ''
        response.setEncoding('latin1')
        response.on('data', (piece: string) => (text += piece))
        const closed = new Promise<void>((done) => response.on('close', () => done()))
        resolve({ response, body: () => text, closed })
      })
      req.on('error', reject)
    })
  }

  const until = async (check: () => boolean, ms = 3000) => {
    const stop = Date.now() + ms
    while (!check()) {
      if (Date.now() > stop) throw new Error('timed out waiting')
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }

  it('refuses unknown visitors and webinars that are not live', async () => {
    expect((await request(app).get(`${PUBLIC}/leads/01UNKNOWNUNKNOWNUNKNOWN00/stream`)).status).toBe(404)

    const id = await createWebinar()
    const leadId = await registerLead(id)
    const waiting = await request(app).get(`${PUBLIC}/leads/${leadId}/stream`)
    expect(waiting.status).toBe(409)
    expect(waiting.body.error.code).toBe('NOT_LIVE')
  })

  it('streams the broadcast to a registered visitor and closes when it ends', async () => {
    const id = await createWebinar()
    const leadId = await registerLead(id)
    await setStatus(owner, id, 'live')
    await chunk(owner, id, `HEADER|${CL}one|`, true)
    await chunk(owner, id, 'two|')

    const viewer = await watch(leadId)
    expect(viewer.response.statusCode).toBe(200)
    expect(viewer.response.headers['content-type']).toBe('video/webm')
    expect(viewer.response.headers['cache-control']).toBe('no-store')
    await until(() => viewer.body() === `HEADER|${CL}one|two|`)

    await chunk(owner, id, 'three|')
    await until(() => viewer.body() === `HEADER|${CL}one|two|three|`)

    const state = await owner.get(`${BASE}/webinars/${id}/stream`)
    expect(state.body.data).toMatchObject({ viewers: 1, peakViewers: 1 })

    await setStatus(owner, id, 'completed')
    await viewer.closed
    expect((await owner.get(`${BASE}/webinars/${id}/stream`)).body.data.viewers).toBe(0)
  })

  it('lets a visitor open the page before the presenter has started recording', async () => {
    const id = await createWebinar()
    const leadId = await registerLead(id)
    await setStatus(owner, id, 'live')

    const viewer = await watch(leadId)
    expect(viewer.response.statusCode).toBe(200)
    expect(viewer.body()).toBe('')
    await chunk(owner, id, `HEADER|${CL}one|`, true)
    await until(() => viewer.body() === `HEADER|${CL}one|`)
    viewer.response.destroy()
    await viewer.closed.catch(() => undefined)
  })

  it('stops counting a visitor who leaves', async () => {
    const id = await createWebinar()
    const leadId = await registerLead(id)
    await setStatus(owner, id, 'live')
    await chunk(owner, id, `H${CL}a`, true)

    const viewer = await watch(leadId)
    await until(() => viewer.body() === `H${CL}a`)
    viewer.response.destroy()
    await viewer.closed.catch(() => undefined)

    const check = async () => (await owner.get(`${BASE}/webinars/${id}/stream`)).body.data.viewers as number
    const stop = Date.now() + 3000
    while ((await check()) !== 0) {
      if (Date.now() > stop) throw new Error('viewer was never removed')
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  })

  it('caps the audience but lets a viewer reconnect', async () => {
    const id = await createWebinar()
    await setStatus(owner, id, 'live')
    await chunk(owner, id, `H${CL}a`, true)

    const leads = [await registerLead(id), await registerLead(id), await registerLead(id), await registerLead(id)]
    const open = []
    for (const leadId of leads.slice(0, 3)) open.push(await watch(leadId))

    const rejected = await request(app).get(`${PUBLIC}/leads/${leads[3]}/stream`)
    expect(rejected.status).toBe(503)
    expect(rejected.body.error.code).toBe('STREAM_FULL')

    // The first visitor reconnecting is not a new person.
    const again = await watch(leads[0])
    expect(again.response.statusCode).toBe(200)
    await open[0].closed

    for (const entry of [...open, again]) entry.response.destroy()
  })

  it("does not let one webinar's visitor watch another webinar", async () => {
    const live = await createWebinar()
    const other = await createWebinar()
    const otherLead = await registerLead(other)
    await setStatus(owner, live, 'live')
    await chunk(owner, live, 'SECRET', true)

    // `other` is not live, and the lead is tied to it, so nothing from `live` can be reached.
    const response = await request(app).get(`${PUBLIC}/leads/${otherLead}/stream`)
    expect(response.status).toBe(409)
    expect(response.text).not.toContain('SECRET')
  })
})
