import { EventEmitter } from 'node:events'
import type WebSocket from 'ws'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  asteriskProviderConfigured,
  closeAsteriskSessions,
  createAsteriskProvider,
} from '../src/modules/bdr/telephony/asterisk.js'
<<<<<<< HEAD
=======
import { withinCallingHours } from '../src/modules/bdr/telephony/callingHours.js'
>>>>>>> module/bdr

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
<<<<<<< HEAD
=======
      slots: number
>>>>>>> module/bdr
    }
  >()
  return {
    leases,
<<<<<<< HEAD
    async acquire(customerId: string, attemptId: string, trunkKey: string, maxChannels: number) {
      const active = [...leases.values()].filter((lease) => lease.trunkKey === trunkKey).length
      if (active >= maxChannels) return false
      leases.set(attemptId, { ...target, customerId, attemptId, trunkKey, wasAnswered: false })
=======
    async acquire(customerId: string, attemptId: string, trunkKey: string, maxChannels: number, slots = 1) {
      const active = [...leases.values()]
        .filter((lease) => lease.trunkKey === trunkKey)
        .reduce((sum, lease) => sum + lease.slots, 0)
      if (active + slots > maxChannels) return false
      leases.set(attemptId, { ...target, customerId, attemptId, trunkKey, wasAnswered: false, slots })
>>>>>>> module/bdr
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
<<<<<<< HEAD
=======
    let recordingActive = false
    const wav = Buffer.from('RIFF....WAVEfmt ')
>>>>>>> module/bdr
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
<<<<<<< HEAD
=======
        if (method === 'GET' && url.pathname.includes('/recordings/live/')) {
          return recordingActive
            ? Response.json({ name: `imp-${target.attemptId}`, state: 'recording' })
            : Response.json({ message: 'Recording not found' }, { status: 404 })
        }
        if (method === 'POST' && url.pathname.endsWith('/bridges/bridge-1/record')) {
          recordingActive = true
          return Response.json({ name: url.searchParams.get('name'), state: 'recording' })
        }
        if (method === 'GET' && url.pathname.includes('/recordings/stored/')) {
          return new Response(wav, { headers: { 'Content-Type': 'audio/wav' } })
        }
>>>>>>> module/bdr
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
<<<<<<< HEAD
=======
    const startRecording = requests.find(
      ({ method, url }) => method === 'POST' && url.pathname.endsWith('/bridges/bridge-1/record'),
    )
    expect(startRecording).toBeDefined()
    expect(startRecording?.url.searchParams.get('format')).toBe('wav')
    expect(startRecording?.url.searchParams.get('name')).toBe(`imp-${target.attemptId}`)
>>>>>>> module/bdr

    socket.event({
      type: 'ChannelDestroyed',
      cause: 16,
      channel: { id: requests.find(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')!.url.searchParams.get('channelId')! },
    })
    await vi.waitFor(async () => {
      await expect(provider.liveState(target)).resolves.toMatchObject({ state: 'gone' })
    })
    await expect(provider.finalOutcome(target)).resolves.toBe('abandoned')
<<<<<<< HEAD
=======
    await expect(provider.fetchRecording(target)).resolves.toEqual({ audio: wav, format: 'wav' })
>>>>>>> module/bdr
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
<<<<<<< HEAD
=======

  it('classifies Asterisk AMD machine results as voicemail and sends non-machine results to the operator', async () => {
    const requests: { method: string; url: URL }[] = []
    const socket = new FakeSocket()
    const leaseStore = createLeaseStore()
    let bridgeNumber = 0
    const provider = createAsteriskProvider({
      customerId: 'customer-amd',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-amd-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '',
      callerId: null,
      maxChannels: 2,
      amdEnabled: true,
      leaseStore,
      socketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input, init) => {
        const url = new URL(String(input))
        const method = init?.method ?? 'GET'
        requests.push({ method, url })
        if (method === 'POST' && url.pathname.endsWith('/bridges')) {
          bridgeNumber += 1
          return Response.json({ id: `amd-bridge-${bridgeNumber}` })
        }
        if (method === 'GET' && url.pathname.includes('/recordings/live/')) {
          return Response.json({ message: 'Recording not found' }, { status: 404 })
        }
        if (method === 'POST' && url.pathname.endsWith('/channels')) {
          return Response.json({ id: url.searchParams.get('channelId') })
        }
        return new Response(null, { status: 204 })
      },
    })

    const machineTarget = { ...target, attemptId: '01AMDRESULTMACHINETEST00001' }
    await provider.originate(machineTarget)
    const machineChannel = `imp-${machineTarget.attemptId}-external`
    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-amd-test',
      args: [machineTarget.attemptId, 'external'],
      channel: { id: machineChannel },
    })
    await vi.waitFor(() => {
      const continuation = requests.find(
        ({ method, url }) => method === 'POST' && url.pathname.endsWith(`/channels/${machineChannel}/continue`),
      )
      expect(continuation?.url.searchParams.get('context')).toBe('imp-bdr-amd')
    })
    expect(requests.some(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')).toBe(false)

    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-amd-test',
      args: [machineTarget.attemptId, 'amd', 'MACHINE', 'HUMAN'],
      channel: { id: machineChannel },
    })
    await vi.waitFor(async () => {
      await expect(provider.finalOutcome(machineTarget)).resolves.toBe('voicemail')
    })
    expect(leaseStore.leases.has(machineTarget.attemptId)).toBe(false)

    const humanTarget = { ...target, attemptId: '01AMDRESULTHUMANTEST000001' }
    await provider.originate(humanTarget)
    const humanChannel = `imp-${humanTarget.attemptId}-external`
    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-amd-test',
      args: [humanTarget.attemptId, 'external'],
      channel: { id: humanChannel },
    })
    await vi.waitFor(() => {
      expect(
        requests.some(
          ({ method, url }) => method === 'POST' && url.pathname.endsWith(`/channels/${humanChannel}/continue`),
        ),
      ).toBe(true)
    })
    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-amd-test',
      args: [humanTarget.attemptId, 'amd', 'HUMAN', 'HUMAN'],
      channel: { id: humanChannel },
    })
    await vi.waitFor(() => {
      expect(requests.some(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')).toBe(true)
    })
    expect(await provider.liveState(humanTarget)).toMatchObject({ state: 'ringing' })
  })

  it('classifies an unallocated number as invalid and does not retry it', async () => {
    const socket = new FakeSocket()
    const provider = createAsteriskProvider({
      customerId: 'customer-invalid',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-invalid-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '',
      callerId: null,
      maxChannels: 2,
      leaseStore: createLeaseStore(),
      socketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input) => Response.json({ id: new URL(String(input)).searchParams.get('channelId') }),
    })
    const invalidTarget = { ...target, attemptId: '01INVALIDNUMBERTEST0000001' }
    await provider.originate(invalidTarget)
    socket.event({
      type: 'ChannelDestroyed',
      cause: 1,
      channel: { id: `imp-${invalidTarget.attemptId}-external` },
    })
    await vi.waitFor(async () => {
      await expect(provider.finalOutcome(invalidTarget)).resolves.toBe('invalid')
    })
  })

  it('transfers a connected call to another extension and ignores the old operator hangup', async () => {
    const requests: { method: string; url: URL }[] = []
    const socket = new FakeSocket()
    let bridgeNumber = 0
    const provider = createAsteriskProvider({
      customerId: 'customer-transfer',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-transfer-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '',
      callerId: null,
      maxChannels: 2,
      recordCalls: false,
      leaseStore: createLeaseStore(),
      socketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input, init) => {
        const url = new URL(String(input))
        const method = init?.method ?? 'GET'
        requests.push({ method, url })
        if (method === 'POST' && url.pathname.endsWith('/bridges')) {
          bridgeNumber += 1
          return Response.json({ id: `transfer-bridge-${bridgeNumber}` })
        }
        if (method === 'POST' && url.pathname.endsWith('/channels')) {
          return Response.json({ id: url.searchParams.get('channelId') })
        }
        return new Response(null, { status: 204 })
      },
    })
    const transferTarget = { ...target, attemptId: '01TRANSFERCALLTEST00000001' }
    await provider.originate(transferTarget)
    const externalId = `imp-${transferTarget.attemptId}-external`
    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-transfer-test',
      args: [transferTarget.attemptId, 'external'],
      channel: { id: externalId },
    })
    await vi.waitFor(() => {
      expect(requests.some(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')).toBe(true)
    })
    const operatorId = `imp-${transferTarget.attemptId}-operator`
    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-transfer-test',
      args: [transferTarget.attemptId, 'operator'],
      channel: { id: operatorId },
    })
    await vi.waitFor(async () => {
      await expect(provider.liveState(transferTarget)).resolves.toMatchObject({ state: 'talking' })
    })
    expect(requests.some(({ url }) => url.pathname.includes('/record'))).toBe(false)

    await provider.transfer(transferTarget, '1002')
    expect(requests.some(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1002')).toBe(true)
    socket.event({ type: 'ChannelDestroyed', cause: 16, channel: { id: operatorId } })
    await vi.waitFor(async () => {
      await expect(provider.liveState(transferTarget)).resolves.toMatchObject({ state: 'ringing' })
    })
  })

  it('rings the inbound extension and logs the caller', async () => {
    const requests: { method: string; url: URL }[] = []
    const socket = new FakeSocket()
    const inbound: { phone?: string; extension?: string; outcome?: string } = {}
    const provider = createAsteriskProvider({
      customerId: 'customer-inbound',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-inbound-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '',
      callerId: null,
      maxChannels: 2,
      inboundExtension: '1001',
      recordCalls: false,
      leaseStore: createLeaseStore(),
      inboundStore: {
        async opened(call) {
          inbound.phone = call.phone
          inbound.extension = call.extension
        },
        async answered() {},
        async ended(_customerId, _attemptId, outcome) {
          inbound.outcome = outcome
        },
      },
      socketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input, init) => {
        const url = new URL(String(input))
        requests.push({ method: init?.method ?? 'GET', url })
        if ((init?.method ?? 'GET') === 'POST' && url.pathname.endsWith('/bridges')) {
          return Response.json({ id: 'inbound-bridge' })
        }
        if ((init?.method ?? 'GET') === 'POST' && url.pathname.endsWith('/channels')) {
          return Response.json({ id: url.searchParams.get('channelId') })
        }
        return new Response(null, { status: 204 })
      },
    })
    await provider.listen()
    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-inbound-test',
      args: ['inbound', '4130001234'],
      channel: { id: 'inbound-channel-1', caller: { number: '4130001234' } },
    })
    await vi.waitFor(() => {
      expect(requests.some(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/1001')).toBe(true)
    })
    expect(inbound).toMatchObject({ phone: '4130001234', extension: '1001' })
  })

  it('dials the second external number through the trunk when connecting two parties', async () => {
    const requests: { method: string; url: URL }[] = []
    const socket = new FakeSocket()
    const provider = createAsteriskProvider({
      customerId: 'customer-bridge',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-bridge-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '0',
      callerId: '4128880499',
      maxChannels: 2,
      recordCalls: false,
      leaseStore: createLeaseStore(),
      socketFactory: () => socket as unknown as WebSocket,
      fetchImpl: async (input, init) => {
        const url = new URL(String(input))
        requests.push({ method: init?.method ?? 'GET', url })
        if ((init?.method ?? 'GET') === 'POST' && url.pathname.endsWith('/bridges')) {
          return Response.json({ id: 'bridge-parties' })
        }
        if ((init?.method ?? 'GET') === 'POST' && url.pathname.endsWith('/channels')) {
          return Response.json({ id: url.searchParams.get('channelId') })
        }
        return new Response(null, { status: 204 })
      },
    })
    const bridgeTarget = {
      ...target,
      attemptId: '01BRIDGEPARTIESTEST0000001',
      phone: '41988887777',
      connectPhone: '4133334444',
    }
    await provider.originate(bridgeTarget)
    expect(requests[0].url.searchParams.get('endpoint')).toBe('PJSIP/041988887777@vono-trunk')
    expect(requests[0].url.searchParams.get('callerId')).toBe('4128880499')
    socket.event({
      type: 'StasisStart',
      application: 'imp-bdr-bridge-test',
      args: [bridgeTarget.attemptId, 'external'],
      channel: { id: `imp-${bridgeTarget.attemptId}-external` },
    })
    await vi.waitFor(() => {
      expect(requests.some(({ url }) => url.searchParams.get('endpoint') === 'PJSIP/04133334444@vono-trunk')).toBe(true)
    })
  })

  it('reserves two trunk slots for a two-number bridge', async () => {
    const provider = createAsteriskProvider({
      customerId: 'customer-bridge-cap',
      baseUrl: 'http://asterisk.test:8088/ari',
      username: 'ari-user',
      password: 'ari-password',
      app: 'imp-bdr-bridge-cap-test',
      trunkEndpoint: 'vono-trunk',
      dialPrefix: '',
      callerId: null,
      maxChannels: 1,
      leaseStore: createLeaseStore(),
      socketFactory: () => new FakeSocket() as unknown as WebSocket,
      fetchImpl: async (input) => Response.json({ id: new URL(String(input)).searchParams.get('channelId') }),
    })
    await expect(
      provider.originate({ ...target, attemptId: '01BRIDGECAPTEST00000000001', connectPhone: '4133334444' }),
    ).rejects.toMatchObject({ code: 'TELEPHONY_CHANNEL_LIMIT' })
  })
})

describe('calling hours', () => {
  const window = { callingStart: '09:00', callingEnd: '18:00', callingDays: '1,2,3,4,5' }

  it('allows a weekday inside the window and blocks Sunday and after hours', () => {
    expect(withinCallingHours(new Date('2026-10-19T15:00:00Z'), window, 'America/Sao_Paulo')).toBe(true)
    expect(withinCallingHours(new Date('2026-10-18T15:00:00Z'), window, 'America/Sao_Paulo')).toBe(false)
    expect(withinCallingHours(new Date('2026-10-19T23:30:00Z'), window, 'America/Sao_Paulo')).toBe(false)
  })

  it('treats an empty window as always open', () => {
    expect(
      withinCallingHours(new Date('2026-10-18T15:00:00Z'), { callingStart: null, callingEnd: null, callingDays: '' }, 'America/Sao_Paulo'),
    ).toBe(true)
  })
>>>>>>> module/bdr
})
