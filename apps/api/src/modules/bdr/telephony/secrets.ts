import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { config } from '../../../core/config.js'
import { AppError } from '../../../core/errors.js'

function key(): Buffer {
  if (!config.TELEPHONY_SECRET_KEY) {
    throw new AppError(500, 'TELEPHONY_SECRET_MISSING', 'TELEPHONY_SECRET_KEY is not configured')
  }
  return createHash('sha256').update(config.TELEPHONY_SECRET_KEY).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), tag.toString('base64'), body.toString('base64')].join(':')
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, body] = stored.split(':')
  if (version !== 'v1' || !iv || !tag || !body) {
    throw new AppError(500, 'TELEPHONY_SECRET_INVALID', 'Stored telephony secret is unreadable')
  }
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8')
}
