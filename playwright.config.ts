import { defineConfig, devices } from '@playwright/test'

// Point at a running app. Locally the dev server uses PORT=3100 (see .env); override
// with E2E_BASE_URL if you run elsewhere. Requires PostgreSQL up and `npm run db:seed`.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3100'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // Shared seeded document means tests touch common state — run them serially.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  }
})
