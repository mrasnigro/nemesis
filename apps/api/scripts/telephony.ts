import { parseArgs } from 'node:util'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../src/core/db.js'
import {
  getTelephonySettings,
  saveTelephonySettings,
  setOperatorExtension,
  type TelephonySettingsInput,
} from '../src/modules/bdr/telephony/settings.js'

/**
 * Configure the dialer for the customer of --user, and optionally that user's extension.
 *
 *   npm run telephony -- --user imp --provider falevono --base-url https://vono.me \
 *     --token <API_TOKEN> --key <API_KEY> --device 12
 *   npm run telephony -- --user bdr1 --extension 1001
 *   npm run telephony -- --user imp --provider simulated --extension 1001
 */
const { values } = parseArgs({
  options: {
    user: { type: 'string' },
    provider: { type: 'string' },
    'base-url': { type: 'string' },
    token: { type: 'string' },
    key: { type: 'string' },
    device: { type: 'string' },
    'dial-prefix': { type: 'string' },
    'ring-timeout': { type: 'string' },
    'max-attempts': { type: 'string' },
    extension: { type: 'string' },
  },
})

async function main() {
  if (!values.user) throw new Error('--user is required')
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, customer_id FROM users WHERE username = :username LIMIT 1',
    { username: values.user.trim().toLowerCase() },
  )
  const user = rows[0]
  if (!user?.customer_id) throw new Error(`User ${values.user} not found or not bound to a customer`)
  const customerId = String(user.customer_id)

  const input: TelephonySettingsInput = {}
  if (values.provider) input.provider = values.provider as TelephonySettingsInput['provider']
  if (values['base-url']) input.baseUrl = values['base-url']
  if (values.token) input.apiToken = values.token
  if (values.key) input.apiKey = values.key
  if (values.device) input.deviceId = values.device
  if (values['dial-prefix'] != null) input.dialPrefix = values['dial-prefix']
  if (values['ring-timeout']) input.ringTimeoutSeconds = Number(values['ring-timeout'])
  if (values['max-attempts']) input.maxAttempts = Number(values['max-attempts'])

  if (Object.keys(input).length > 0) await saveTelephonySettings(customerId, input)
  if (values.extension) await setOperatorExtension(customerId, String(user.id), values.extension.trim())

  console.log(JSON.stringify(await getTelephonySettings(customerId), null, 2))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error)
  await pool.end().catch(() => null)
  process.exit(1)
})
