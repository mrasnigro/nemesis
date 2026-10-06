/**
 * In-memory relay for live webinars, one room per `webinarId`.
 *
 * The presenter's browser records WebM with MediaRecorder and posts a chunk about every second.
 * Viewers hold an HTTP response open and receive the same bytes.
 *
 * A WebM stream is a header (EBML + Segment info + Tracks) followed by Clusters. A player can only
 * start on a video keyframe, and MediaRecorder opens a new Cluster at each keyframe (every few
 * seconds). So a viewer who joins late is sent the header and then everything from the most recent
 * Cluster that opens with a keyframe; chunk edges do not line up with Clusters, so the hub finds
 * Clusters inside the bytes instead of trusting chunk boundaries.
 *
 * Everything lives in this process: with more than one API instance the presenter and the viewers
 * would have to land on the same one. That is why the audience per webinar is capped (each viewer is
 * an open connection fed from here), and why a CDN/SFU is the next step for large audiences.
 */

import { CLUSTER_ID, clusterStartsWithKeyframe, findVideoTrack } from './webm.js'

/** Media kept for late joiners. Keyframes arrive every few seconds, so this always holds several. */
const MAX_HELD_BYTES = 4 * 1024 * 1024
/** Bytes read from a Cluster's start to see whether its first video frame is a keyframe. */
const PEEK_BYTES = 8 * 1024
/** A viewer waits this many chunks for a keyframe before being sent data as it comes. */
const SEEK_GIVE_UP_CHUNKS = 40
/** …or this many when the stream has no recognisable video track (another container format). */
const SEEK_GIVE_UP_UNKNOWN_CHUNKS = 8
/** A viewer that falls this far behind (bytes queued on its socket) is dropped; its player reconnects. */
export const MAX_VIEWER_BACKLOG_BYTES = 2 * 1024 * 1024
/** No chunk for this long and the broadcast is reported as interrupted. */
const STALE_AFTER_MS = 8_000

export interface StreamViewer {
  /** Writes bytes to the viewer; returns how many bytes are still queued for it. */
  write(data: Buffer): number
  /** Closes the viewer's response; its player reconnects or shows the end screen. */
  close(): void
}

type ViewerEntry = {
  viewer: StreamViewer
  /** waiting: no header yet. seeking: header sent, waiting for a keyframe. playing: receiving everything. */
  state: 'waiting' | 'seeking' | 'playing'
  skipped: number
}

type Held = { start: number; data: Buffer }

interface Room {
  /** Start of the current recording (everything before the first Cluster). */
  header: Buffer | null
  videoTrack: number | null
  /** Media since the header, oldest first. `start` counts bytes from the first one ever kept. */
  held: Held[]
  heldBytes: number
  total: number
  /** Last bytes of the previous chunk, so a Cluster id split across two chunks is still found. */
  tail: Buffer
  /** Offsets of Clusters not yet classified (their first video frame was not in the bytes yet). */
  pending: number[]
  /** Offsets of Clusters that open with a video keyframe. */
  keyframes: number[]
  viewers: Map<string, ViewerEntry>
  peak: number
  chunks: number
  bytes: number
  startedAt: Date
  lastChunkAt: Date | null
}

export type StreamStats = {
  /** A header has been received and chunks are still arriving. */
  broadcasting: boolean
  viewers: number
  peakViewers: number
  chunks: number
  bytes: number
  startedAt: string | null
  lastChunkAt: string | null
}

function freshRoom(): Room {
  return {
    header: null,
    videoTrack: null,
    held: [],
    heldBytes: 0,
    total: 0,
    tail: Buffer.alloc(0),
    pending: [],
    keyframes: [],
    viewers: new Map(),
    peak: 0,
    chunks: 0,
    bytes: 0,
    startedAt: new Date(),
    lastChunkAt: null,
  }
}

/** Bytes from absolute offset `from` to the end of what is held (or at most `limit` of them). */
function bytesFrom(room: Room, from: number, limit = Infinity): Buffer {
  const parts: Buffer[] = []
  let size = 0
  for (const piece of room.held) {
    const end = piece.start + piece.data.length
    if (end <= from) continue
    const part = from > piece.start ? piece.data.subarray(from - piece.start) : piece.data
    parts.push(part)
    size += part.length
    if (size >= limit) break
  }
  return Buffer.concat(parts).subarray(0, limit)
}

export class StreamHub {
  private readonly rooms = new Map<string, Room>()

  private room(webinarId: string): Room {
    let room = this.rooms.get(webinarId)
    if (!room) {
      room = freshRoom()
      this.rooms.set(webinarId, room)
    }
    return room
  }

  /**
   * A new broadcast: forget the last one. Viewers still playing it are closed (their player
   * reconnects); viewers already waiting for a broadcast to begin stay and get the new header.
   */
  start(webinarId: string): void {
    const old = this.rooms.get(webinarId)
    if (!old) return
    const waiting = [...old.viewers].filter(([, entry]) => entry.state === 'waiting')
    for (const [, entry] of [...old.viewers]) if (entry.state !== 'waiting') entry.viewer.close()
    this.rooms.delete(webinarId)
    if (waiting.length > 0) this.room(webinarId).viewers = new Map(waiting)
  }

  /** The broadcast is over: close every viewer and forget the room. */
  end(webinarId: string): void {
    const room = this.rooms.get(webinarId)
    if (!room) return
    this.rooms.delete(webinarId)
    for (const { viewer } of [...room.viewers.values()]) viewer.close()
  }

  /**
   * Accepts a chunk from the presenter. `header` marks the first chunk of a recording (the recorder
   * was started or restarted): the bytes before the first Cluster become the header and the rest is
   * the first media. Viewers still on the old recording are closed so their player reconnects and
   * picks up the new header. Returns false when a non-header chunk arrives with no header to follow,
   * which means the presenter must restart the recording.
   */
  push(webinarId: string, data: Buffer, header: boolean): boolean {
    const room = this.room(webinarId)
    if (!header && !room.header) return false

    room.chunks += 1
    room.bytes += data.length
    room.lastChunkAt = new Date()

    let media = data
    if (header) {
      const split = data.indexOf(CLUSTER_ID)
      room.header = split >= 0 ? data.subarray(0, split) : data
      room.videoTrack = findVideoTrack(room.header)
      media = split >= 0 ? data.subarray(split) : Buffer.alloc(0)
      room.held = []
      room.heldBytes = 0
      room.total = 0
      room.tail = Buffer.alloc(0)
      room.pending = []
      room.keyframes = []
      for (const [id, entry] of [...room.viewers]) {
        if (entry.state === 'waiting') {
          entry.viewer.write(room.header)
          entry.state = 'seeking'
          entry.skipped = 0
        } else {
          room.viewers.delete(id)
          entry.viewer.close()
        }
      }
    }

    if (media.length > 0) this.deliver(room, media)
    return true
  }

  private deliver(room: Room, media: Buffer): void {
    // Looking in tail + media finds a Cluster id that straddles two chunks.
    const window = Buffer.concat([room.tail, media])
    const windowStart = room.total - room.tail.length
    for (let at = window.indexOf(CLUSTER_ID); at !== -1; at = window.indexOf(CLUSTER_ID, at + CLUSTER_ID.length)) {
      room.pending.push(windowStart + at)
    }

    room.held.push({ start: room.total, data: media })
    room.heldBytes += media.length
    room.total += media.length
    room.tail = window.subarray(Math.max(0, window.length - (CLUSTER_ID.length - 1)))
    this.trim(room)

    // Viewers who were already playing get the new bytes as they are.
    for (const [id, entry] of [...room.viewers]) {
      if (entry.state !== 'playing') continue
      if (entry.viewer.write(media) > MAX_VIEWER_BACKLOG_BYTES) {
        room.viewers.delete(id)
        entry.viewer.close()
      }
    }

    this.classify(room)

    // Then anyone waiting for a keyframe is started at the newest one.
    const newest = room.keyframes.at(-1)
    for (const [id, entry] of [...room.viewers]) {
      if (entry.state !== 'seeking') continue
      const giveUp = room.videoTrack === null ? SEEK_GIVE_UP_UNKNOWN_CHUNKS : SEEK_GIVE_UP_CHUNKS
      let from: number | null = null
      if (newest !== undefined) from = newest
      else if (++entry.skipped >= giveUp) from = room.total - media.length
      if (from === null) continue

      entry.state = 'playing'
      if (entry.viewer.write(bytesFrom(room, from)) > MAX_VIEWER_BACKLOG_BYTES) {
        room.viewers.delete(id)
        entry.viewer.close()
      }
    }
  }

  /** Works out which pending Clusters open with a keyframe, once enough of each has arrived. */
  private classify(room: Room): void {
    while (room.pending.length > 0) {
      const at = room.pending[0]
      if (at < (room.held[0]?.start ?? 0)) {
        room.pending.shift() // scrolled out of what we keep
        continue
      }
      if (room.videoTrack === null) {
        room.keyframes.push(at) // an unrecognised stream: every Cluster is a place to start
        room.pending.shift()
        continue
      }
      const bytes = bytesFrom(room, at, PEEK_BYTES)
      const result = clusterStartsWithKeyframe(bytes, 0, room.videoTrack)
      if (result === null && bytes.length < PEEK_BYTES) break // wait for more of this Cluster
      room.pending.shift()
      if (result) room.keyframes.push(at)
    }
  }

  private trim(room: Room): void {
    while (room.heldBytes > MAX_HELD_BYTES && room.held.length > 1) {
      room.heldBytes -= room.held.shift()!.data.length
    }
    const oldest = room.held[0]?.start ?? 0
    while (room.keyframes.length > 0 && room.keyframes[0] < oldest) room.keyframes.shift()
  }

  /**
   * Adds a viewer. The same person opening a second tab replaces the first connection, so the
   * audience counts people, not connections. Returns a function that removes the viewer.
   */
  join(webinarId: string, viewerId: string, viewer: StreamViewer): () => void {
    const room = this.room(webinarId)
    const previous = room.viewers.get(viewerId)
    if (previous) {
      room.viewers.delete(viewerId)
      previous.viewer.close()
    }

    const entry: ViewerEntry = { viewer, state: 'waiting', skipped: 0 }
    if (room.header) {
      // Header first, then everything from the newest keyframe Cluster we still hold.
      const from = room.keyframes.at(-1)
      viewer.write(from === undefined ? room.header : Buffer.concat([room.header, bytesFrom(room, from)]))
      entry.state = from === undefined ? 'seeking' : 'playing'
    }
    room.viewers.set(viewerId, entry)
    room.peak = Math.max(room.peak, room.viewers.size)

    return () => {
      // A replaced connection must not remove the one that replaced it.
      const current = this.rooms.get(webinarId)
      if (current?.viewers.get(viewerId) === entry) current.viewers.delete(viewerId)
    }
  }

  viewerCount(webinarId: string): number {
    return this.rooms.get(webinarId)?.viewers.size ?? 0
  }

  hasViewer(webinarId: string, viewerId: string): boolean {
    return this.rooms.get(webinarId)?.viewers.has(viewerId) ?? false
  }

  stats(webinarId: string, now = Date.now()): StreamStats {
    const room = this.rooms.get(webinarId)
    if (!room) {
      return { broadcasting: false, viewers: 0, peakViewers: 0, chunks: 0, bytes: 0, startedAt: null, lastChunkAt: null }
    }
    return {
      broadcasting: room.header !== null && room.lastChunkAt !== null && now - room.lastChunkAt.getTime() < STALE_AFTER_MS,
      viewers: room.viewers.size,
      peakViewers: room.peak,
      chunks: room.chunks,
      bytes: room.bytes,
      startedAt: room.startedAt.toISOString(),
      lastChunkAt: room.lastChunkAt?.toISOString() ?? null,
    }
  }
}

export const streamHub = new StreamHub()
