/**
 * Just enough of Matroska/WebM to relay a live recording: find the video track in the header, and tell
 * whether a Cluster starts with a video keyframe.
 *
 * Why it matters: a player that starts on a delta frame cannot decode until the next keyframe and
 * usually fails outright. MediaRecorder writes keyframes every few seconds and starts a new Cluster
 * at each one, so a viewer who joins late must be started at a Cluster that opens with a keyframe.
 */

export const CLUSTER_ID = Buffer.from([0x1f, 0x43, 0xb6, 0x75])

const ID_SEGMENT = 0x18538067
const ID_TRACKS = 0x1654ae6b
const ID_TRACK_ENTRY = 0xae
const ID_TRACK_NUMBER = 0xd7
const ID_TRACK_TYPE = 0x83
const ID_CLUSTER = 0x1f43b675
const ID_SIMPLE_BLOCK = 0xa3
const ID_BLOCK_GROUP = 0xa0
const ID_BLOCK = 0xa1
const ID_REFERENCE_BLOCK = 0xfb
const TRACK_TYPE_VIDEO = 1

type Vint = { value: number; length: number; unknown: boolean }

/** Reads an EBML variable-length integer. `keepMarker` keeps the length bits (used for element ids). */
function readVint(buf: Buffer, at: number, keepMarker = false): Vint | null {
  if (at >= buf.length) return null
  const first = buf[at]
  let length = 1
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length += 1
  if (length > 8 || at + length > buf.length) return null
  let value = keepMarker ? first : first & (0xff >> length)
  let allOnes = (first & (0xff >> length)) === 0xff >> length
  for (let i = 1; i < length; i += 1) {
    value = value * 256 + buf[at + i]
    if (buf[at + i] !== 0xff) allOnes = false
  }
  return { value, length, unknown: !keepMarker && allOnes }
}

type Element = { id: number; dataAt: number; size: number; unknown: boolean }

function readElement(buf: Buffer, at: number): Element | null {
  const id = readVint(buf, at, true)
  if (!id) return null
  const size = readVint(buf, at + id.length)
  if (!size) return null
  return { id: id.value, dataAt: at + id.length + size.length, size: size.value, unknown: size.unknown }
}

function readUint(buf: Buffer, at: number, length: number): number {
  let value = 0
  for (let i = 0; i < length; i += 1) value = value * 256 + buf[at + i]
  return value
}

/** Number of the first video track declared in the stream header, or null if there is none. */
export function findVideoTrack(header: Buffer): number | null {
  let at = 0
  // EBML header, then the Segment (usually of unknown size in a live recording).
  while (at < header.length) {
    const element = readElement(header, at)
    if (!element) return null
    if (element.id === ID_SEGMENT) {
      at = element.dataAt
      break
    }
    if (element.unknown) return null
    at = element.dataAt + element.size
  }

  while (at < header.length) {
    const element = readElement(header, at)
    if (!element) return null
    if (element.id === ID_TRACKS) return videoTrackIn(header, element.dataAt, Math.min(header.length, element.dataAt + element.size))
    if (element.unknown) return null
    at = element.dataAt + element.size
  }
  return null
}

function videoTrackIn(buf: Buffer, start: number, end: number): number | null {
  let at = start
  while (at < end) {
    const entry = readElement(buf, at)
    if (!entry || entry.unknown) return null
    if (entry.id === ID_TRACK_ENTRY) {
      let number: number | null = null
      let type: number | null = null
      let p = entry.dataAt
      const entryEnd = Math.min(end, entry.dataAt + entry.size)
      while (p < entryEnd) {
        const field = readElement(buf, p)
        if (!field || field.unknown) break
        if (field.id === ID_TRACK_NUMBER) number = readUint(buf, field.dataAt, field.size)
        if (field.id === ID_TRACK_TYPE) type = readUint(buf, field.dataAt, field.size)
        p = field.dataAt + field.size
      }
      if (type === TRACK_TYPE_VIDEO && number !== null) return number
    }
    at = entry.dataAt + entry.size
  }
  return null
}

/**
 * Does the Cluster that starts at `buf[at]` open with a video keyframe?
 * Returns null when `buf` ends before the first video frame is reached (ask again with more bytes).
 */
export function clusterStartsWithKeyframe(buf: Buffer, at: number, videoTrack: number): boolean | null {
  const cluster = readElement(buf, at)
  if (!cluster) return null
  if (cluster.id !== ID_CLUSTER) return false

  let p = cluster.dataAt
  for (let scanned = 0; scanned < 64; scanned += 1) {
    const element = readElement(buf, p)
    if (!element) return null
    if (element.unknown) return false
    if (element.id === ID_CLUSTER) return false // the next Cluster arrived without a video frame

    if (element.id === ID_SIMPLE_BLOCK) {
      const track = readVint(buf, element.dataAt)
      if (!track || element.dataAt + track.length + 3 > buf.length) return null
      if (track.value === videoTrack) return Boolean(buf[element.dataAt + track.length + 2] & 0x80)
    } else if (element.id === ID_BLOCK_GROUP) {
      // A frame wrapped in a BlockGroup is a keyframe when it has no ReferenceBlock.
      const end = element.dataAt + element.size
      if (end > buf.length) return null
      let track: number | null = null
      let referenced = false
      let q = element.dataAt
      while (q < end) {
        const field = readElement(buf, q)
        if (!field || field.unknown) break
        if (field.id === ID_BLOCK) track = readVint(buf, field.dataAt)?.value ?? null
        if (field.id === ID_REFERENCE_BLOCK) referenced = true
        q = field.dataAt + field.size
      }
      if (track === videoTrack) return !referenced
    }
    p = element.dataAt + element.size
  }
  return false
}
