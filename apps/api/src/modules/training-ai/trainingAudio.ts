import { mkdir, writeFile } from 'node:fs/promises'
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
