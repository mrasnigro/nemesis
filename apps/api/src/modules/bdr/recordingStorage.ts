import path from 'node:path'
import { config } from '../../core/config.js'

const recordingsRoot = path.resolve(config.RECORDINGS_DIR)

/** Resolves a stored recording path (as saved on the attempt) inside the recordings folder. */
export function recordingAbsolutePath(relative: string) {
  const absolute = path.resolve(recordingsRoot, relative)
  if (!absolute.startsWith(recordingsRoot + path.sep)) throw new Error('Recording path escapes storage root')
  return absolute
}

export function recordingContentType(relative: string) {
  switch (path.extname(relative).toLowerCase()) {
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    default:
      throw new Error('Unsupported stored recording format')
  }
}
