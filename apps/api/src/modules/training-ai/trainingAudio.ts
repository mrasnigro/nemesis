import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from '../../core/config.js'
import { AppError } from '../../core/errors.js'

function rootDir() {
  return path.resolve(config.RECORDINGS_DIR, 'training')
}

export function trainingAudioAbsolute(relative: string) {
  const root = rootDir()
  const absolute = path.resolve(root, relative)
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new AppError(400, 'INVALID_PATH', 'Caminho de áudio inválido')
  }
  return absolute
}

export async function writeTrainingAudio(customerId: string, sessionId: string, audio: Buffer, extension: string) {
  const relative = path.join(customerId, `${sessionId}.${extension}`)
  const absolute = trainingAudioAbsolute(relative)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, audio)
  return relative.replace(/\\/g, '/')
}

export async function removeTrainingAudioFiles(customerId: string, sessionId: string) {
  const safeSessionId = safeId(sessionId)
  const customerDir = trainingAudioAbsolute(customerId)
  let names: string[] = []
  try {
    names = await readdir(customerDir)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }
  await Promise.all(
    names
      .filter((name) => name.startsWith(`${safeSessionId}.`))
      .map((name) => rm(path.join(customerDir, name), { force: true })),
  )
  await rm(clipDir(customerId, sessionId), { recursive: true, force: true })
}

// ---------------------------------------------------------------- one clip per spoken message

const CLIP_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
}

/** File extension for an upload's content type (parameters such as `;codecs=opus` are ignored). */
export function clipExtension(contentType: string): string {
  const type = contentType.toLowerCase()
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3'
  if (type.includes('wav')) return 'wav'
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('mp4') || type.includes('aac') || type.includes('m4a')) return 'm4a'
  return 'webm'
}

export function clipContentType(extension: string): string {
  return CLIP_TYPES[extension] ?? 'application/octet-stream'
}

function clipDir(customerId: string, sessionId: string) {
  return trainingAudioAbsolute(path.join(customerId, sessionId))
}

/** Message ids and extensions can come from a URL: only plain id characters may reach the file system. The folder is checked to stay inside the recordings root. */
function safeId(value: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new AppError(400, 'INVALID_PATH', 'Identificador inválido')
  return value
}

/** The recording of one message of the call: what the trainee said, or what the persona said. */
export async function writeMessageClip(
  customerId: string,
  sessionId: string,
  messageId: string,
  audio: Buffer,
  extension: string,
) {
  const dir = clipDir(customerId, sessionId)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, `${safeId(messageId)}.${extension}`), audio)
}

/** Which messages of a session have a recording, with the file extension of each. */
export async function listMessageClips(customerId: string, sessionId: string): Promise<Map<string, string>> {
  const clips = new Map<string, string>()
  let names: string[] = []
  try {
    names = await readdir(clipDir(customerId, sessionId))
  } catch {
    return clips // no folder: nothing was recorded
  }
  for (const name of names) {
    const dot = name.lastIndexOf('.')
    if (dot > 0) clips.set(name.slice(0, dot), name.slice(dot + 1))
  }
  return clips
}

export function messageClipPath(customerId: string, sessionId: string, messageId: string, extension: string) {
  return path.join(clipDir(customerId, sessionId), `${safeId(messageId)}.${safeId(extension)}`)
}
