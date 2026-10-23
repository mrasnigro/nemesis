import { EventEmitter } from 'node:events'
import type WebSocket from 'ws'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  asteriskProviderConfigured,
  closeAsteriskSessions,
  createAsteriskProvider,
} from '../src/modules/bdr/telephony/asterisk.js'

class FakeSocket extends EventEmitter {
  readyState = 1

  constructor() {
    super()
    setTimeout(() => this.emit('open'), 0)
  }

  event(message: unknown) {
    this.emit('message', Buffer.from(JSON.stringify(message)))
  }

  close() {
    this.readyState = 3
    this.emit('close')
  }
}

const target = {
  attemptId: '01ARIEVENTTESTATTEMPTID000',
  phone: '4140001234',
  extension: '1001',
  startedAt: new Date(),
  providerCallId: null,
}

function createLeaseStore() {
  const leases = new Map<
    string,
    {
      customerId: string
      attemptId: string
      trunkKey: string
      phone: string
      extension: string
      startedAt: Date
      wasAnswered: boolean
      providerCallId: string | null
    }
  >()
  return {
    leases,
    async acquire(customerId: string, attemptId: string, trunkKey: string, maxChannels: number) {
      const active = [...leases.values()].filter((lease) => lease.trunkKey === trunkKey).length
      if (active >= maxChannels) return false
      leases.set(attemptId, { ...target, customerId, attemptId, trunkKey, wasAnswered: false })
      return true
    },
    async release(_customerId: string, attemptId: string) {
      leases.delete(attemptId)
    },
    async list(customerId: string) {
      return [...leases.values()].filter((lease) => lease.customerId === customerId)
    },
  }
}

afterEach(async () => {
  await closeAsteriskSessions()
})

describe('Asterisk ARI provider', () => {
  it('requires all server-side ARI and trunk settings', () => {
    expect(
      asteriskProviderConfigured({
        baseUrl: 'http://127.0.0.1:8088/ari',
        username: 'imp',
        password: 'secret',
        trunkEndpoint: 'vono',
      }),
    ).toBe(true)
    expect(asteriskProviderConfigured({ baseUrl: 'http://127.0.0.1:8088/ari', username: 'imp' })).toBe(false)
  })

  it('originates through the trunk, rings the operator after answer, bridges, and reports hangup outcomes', async () => {
    const requests: { method: string; url: URL; authorization: string | undefined }[] = []
    const socket = new FakeSocket()
    const leaseStore = createLeaseStore()
    const provider = createAsteriskProvider({
      customerId: 'customer-1',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '0',
      callerId: null,
      maxChannels: 1,
      leaseStore,
      socketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input, init) => {
        const url = new URL(String(input))
        const method = init?.method ?? 'GET'
        requests.push({
          method,
          url,
          authorization: new Headers(init?.headers).get('Authorization') ?? undefined,
        })
        if (method === 'POST' && url.pathname.endsWith('/bridges')) {
          return Response.json({ id: 'bridge-1' })
        }
        if (method === 'POST' && url.pathname.endsWith('/channels')) {
          return Response.json({ id: url.searchParams.get('channelId') })
        }
        return new Response(null, { status: 204 })
      },
    })

    await provider.originate(target)
    expect(requests[0].url.searchParams.get('endpoint')).toBe('PJSIP/04140001234@vono-trunk')
    const externalId = requests[0].url.searchParams.get('channelId')!
    expect(requests[0].url.searchParams.get('callerId')).toBeNull()
    expect(requests[0].url.searchParams.get('appArgs')).toBe(`${target.attemptId},external`)
    expect(requests[0].authorization).toBe(`Basic ${Buffer.from('ari-user:ari-password').toString('base64')}`)
    expect(requests[0].url.toString()).not.toContain('ari-password')
    expect(await provider.liveState(target)).toMatchObject({ state: 'ringing', providerCallId: externalId })
    await expect(
      provider.originate({ ...target, attemptId: '01ARISECONDCALLTEST0000000' }),
    ).rejects.toMatchObject({ code: 'TELEPHONY_CHANNEL_LIMIT' })

    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-test',
      args: [target.attemptId, 'external'],
      channel: { id: externalId },
    })
    await vi.waitFor(() => {
      expect(requests.some(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')).toBe(true)
    })
    expect(await provider.liveState(target)).toMatchObject({ state: 'ringing' })

    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-test',
      args: [target.attemptId, 'operator'],
      channel: { id: requests.find(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')!.url.searchParams.get('channelId')! },
    })
    await vi.waitFor(async () => {
      await expect(provider.liveState(target)).resolves.toMatchObject({ state: 'talking' })
    })
    expect(requests.some(({ url }) => url.pathname.endsWith('/bridges/bridge-1/addChannel'))).toBe(true)

    socket.event({
      type: 'ChannelDestroyed',
      cause: 16,
      channel: { id: requests.find(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')!.url.searchParams.get('channelId')! },
    })
    await vi.waitFor(async () => {
      await expect(provider.liveState(target)).resolves.toMatchObject({ state: 'gone' })
    })
    await expect(provider.finalOutcome(target)).resolves.toBe('abandoned')
  })

  it('hangs up active channels and marks a cancelled attempt', async () => {
    const requests: { method: string; url: URL }[] = []
    const socket = new FakeSocket()
    const leaseStore = createLeaseStore()
    const provider = createAsteriskProvider({
      customerId: 'customer-1',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-cancel-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '',
      callerId: null,
      maxChannels: 5,
      leaseStore,
      socketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input, init) => {
        const url = new URL(String(input))
        requests.push({ method: init?.method ?? 'GET', url })
        return Response.json({ id: url.searchParams.get('channelId') })
      },
    })

    await provider.originate(target)
    await provider.hangup(target)
    expect(requests.some(({ method, url }) => method === 'DELETE' && url.pathname.endsWith(`/channels/imp-${target.attemptId}-external`))).toBe(
      true,
    )
    await expect(provider.finalOutcome(target)).resolves.toBe('cancelled')
    expect(leaseStore.leases.size).toBe(0)
  })

  it('recovers an active call and its distributed channel lease after an API process restart', async () => {
    const leaseStore = createLeaseStore()
    let channels: { id: string; state: string }[] = []
    let bridges: { id: string; channels: string[] }[] = []
    const makeProvider = (socket: FakeSocket) =>
      createAsteriskProvider({
        customerId: 'customer-1',
        baseUrl: 'http://asterisk.test:8088/ari',
        username: 'ari-user',
        password: 'ari-password',
        app: 'imp-bdr-recovery-test',
        trunkEndpoint: 'vono-trunk',
        dialPrefix: '',
        callerId: null,
        maxChannels: 2,
        leaseStore,
        socketFactory: () => socket as unknown as WebSocket,
        fetchImpl: async (input, init) => {
          const url = new URL(String(input))
          if ((init?.method ?? 'GET') === 'GET' && url.pathname.endsWith('/channels')) {
            return Response.json(channels)
          }
          if ((init?.method ?? 'GET') === 'GET' && url.pathname.endsWith('/bridges')) {
            return Response.json(bridges)
          }
          if (url.pathname.endsWith('/bridges') && init?.method === 'POST') {
            bridges = [{ id: 'bridge-recovered', channels: [] }]
            return Response.json({ id: 'bridge-recovered' })
          }
          if (url.pathname.endsWith('/addChannel')) {
            const bridge = bridges[0]
            const channelId = url.searchParams.get('channel')!
            bridge.channels.push(channelId)
            return new Response(null, { status: 204 })
          }
          if (init?.method === 'POST' && url.pathname.endsWith('/channels')) {
            const id = url.searchParams.get('channelId')!
            channels.push({ id, state: 'Up' })
            return Response.json({ id })
          }
          return new Response(null, { status: 204 })
        },
      })

    const firstProvider = makeProvider(new FakeSocket())
    await firstProvider.originate(target)
    const externalId = `imp-${target.attemptId}-external`
    const operatorId = `imp-${target.attemptId}-operator`
    channels = [
      { id: externalId, state: 'Up' },
      { id: operatorId, state: 'Up' },
    ]
    bridges = [{ id: 'bridge-recovered', channels: [externalId, operatorId] }]
    await closeAsteriskSessions()

    const restartedProvider = makeProvider(new FakeSocket())
    await restartedProvider.recoverActive()
    await expect(restartedProvider.liveState(target)).resolves.toMatchObject({
      state: 'talking',
      providerCallId: externalId,
    })
    expect(leaseStore.leases.size).toBe(1)
    await expect(
      restartedProvider.originate({ ...target, attemptId: '01ARISECONDCALLTEST0000000' }),
    ).resolves.toBeUndefined()
    expect(leaseStore.leases.size).toBe(2)
  })

  it('enforces one shared trunk cap across separate customer providers', async () => {
    const leaseStore = createLeaseStore()
    const socketFactory = () => new FakeSocket() as unknown as WebSocket
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input))
      if ((init?.method ?? 'GET') === 'POST' && url.pathname.endsWith('/channels')) {
        return Response.json({ id: url.searchParams.get('channelId') })
      }
      return new Response(null, { status: 204 })
    }
    const shared = {
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-fleet-test',
      trunkEndpoint: 'shared-vono-trunk',
      dialPrefix: '',
      callerId: null,
      maxChannels: 1,
      leaseStore,
      socketFactory,
      fetchImpl,
    }
    const first = createAsteriskProvider({ ...shared, customerId: 'customer-1' })
    const second = createAsteriskProvider({ ...shared, customerId: 'customer-2' })
    await first.originate(target)
    await expect(second.originate({ ...target, attemptId: '01ARISECONDCALLTEST0000000' })).rejects.toMatchObject({
      code: 'TELEPHONY_CHANNEL_LIMIT',
    })
    expect(leaseStore.leases.size).toBe(1)
  })
})
