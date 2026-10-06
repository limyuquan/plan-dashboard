import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['server/**/*.test.ts', 'web/**/*.test.ts', 'shared/**/*.test.ts'] },
})
