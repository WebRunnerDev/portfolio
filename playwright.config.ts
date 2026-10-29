import { defineConfig, devices } from "@playwright/test"

const port = 4173
// The Admin against the real Worker: `vite dev`, fresh local D1 and R2,
// Access passed as in local dev (scripts/e2e-dev.mjs).
const devPort = 5174
const devSpecs = /admin-editor\.spec\.ts/
// axe and the keyboard pass on the production build with content
// (scripts/audit/server.mjs), which serves the dist/ built for `port` over
// HTTPS with a self-signed certificate.
const auditPort = 4175
const auditSpecs = /a11y\.spec\.ts/

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [devSpecs, auditSpecs],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "dev",
      testMatch: devSpecs,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${devPort}`,
      },
    },
    {
      name: "audit",
      testMatch: auditSpecs,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `https://localhost:${auditPort}`,
        ignoreHTTPSErrors: true,
      },
    },
  ],
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `node scripts/e2e-dev.mjs ${devPort}`,
      url: `http://localhost:${devPort}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    // After the first server: it needs that build.
    {
      command: `node scripts/audit/server.mjs ${auditPort}`,
      url: `https://localhost:${auditPort}/api/health`,
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
