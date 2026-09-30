import { defineConfig, devices } from '@playwright/test'

// CHROMIUM points at a browser already on the machine (NixOS cannot run the one Playwright
// downloads); CI leaves it unset and installs Playwright's own
export default defineConfig({
  testDir: 'test/e2e',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    launchOptions: process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
  },
})
