import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
<<<<<<< HEAD
    include: ['tests/asteriskProvider.test.ts'],
=======
    include: ['tests/asteriskProvider.test.ts', 'tests/callAi.test.ts'],
>>>>>>> module/bdr
    setupFiles: ['tests/asteriskSetup.ts'],
  },
})
