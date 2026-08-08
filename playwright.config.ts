import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the *real* API, unlike the functional suite,
 * which answers requests from MSW. They are therefore the only tests that prove
 * the contract as implemented — and the only ones that need the Docker stack up.
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:8092'
const apiBaseURL = process.env['VITE_API_BASE_URL'] ?? 'http://localhost:8084'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: process.env['CI'] === 'true',
  retries: process.env['CI'] === 'true' ? 1 : 0,
  workers: 1,
  reporter: process.env['CI'] === 'true' ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  metadata: { apiBaseURL },
})
