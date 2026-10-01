import { defineConfig } from 'vitest/config'

// Integration tests run against a real MySQL database (never the dev one). CI provides these via env.
const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USER: 'imp',
  DB_PASSWORD: 'imp',
  DB_NAME: 'imp_test',
  JWT_SECRET: 'test-secret-that-is-long-enough',
  CORS_ORIGINS: 'http://localhost:5173',
  ALLOW_DEV_AUTH: 'false',
  LOGIN_RATE_LIMIT_MAX: '1000',
  TELEPHONY_DEFAULT_PROVIDER: 'simulated',
  TELEPHONY_SECRET_KEY: 'test-only-telephony-secret-key-0123456789',
  TRAINING_AI_PROVIDER: 'builtin',
}

// Only the MySQL connection may come from the outer environment (CI service containers);
// everything else is pinned so a developer shell cannot change what the tests exercise.
const overridable = new Set(['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'])

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = overridable.has(key) ? (process.env[key] ?? value) : (process.env[`TEST_${key}`] ?? value)
}
for (const key of ['WEBINAR_API_URL', 'WEBINAR_HANDOFF_SHARED_KEY', 'TRUST_PROXY', 'TRAINING_AI_API_KEY', 'TRAINING_AI_BASE_URL', 'TRAINING_AI_MAX_TURNS']) {
  delete process.env[key]
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
