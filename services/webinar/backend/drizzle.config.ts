import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { mysqlSslOptions } from './src/db/ssl.ts'

const ssl = mysqlSslOptions()

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'imp',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'imp_webinar',
    ...(ssl ? { ssl } : {}),
  },
})
