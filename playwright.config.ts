import { defineConfig } from '@playwright/test'

// Browser tests against the built app (npm run build first). Each server gets a
// fresh copy of the demo folder, so tests may settle tasks and write files.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 30_000,
  use: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  webServer: [
    { command: 'node e2e/serve.mjs 4310 demo', url: 'http://localhost:4310', reuseExistingServer: false },
    { command: 'node e2e/serve.mjs 4311 empty', url: 'http://localhost:4311', reuseExistingServer: false },
  ],
})
