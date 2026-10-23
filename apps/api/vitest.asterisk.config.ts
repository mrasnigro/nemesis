import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/asteriskProvider.test.ts', 'tests/callAi.test.ts'],
    setupFiles: ['tests/asteriskSetup.ts'],
  },
})
