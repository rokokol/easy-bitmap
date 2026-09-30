import { defineConfig, devices } from '@playwright/test'

// Chromium, Firefox and WebKit, the engine of Safari. CI installs Playwright's own builds;
// NixOS cannot run those, and PLAYWRIGHT_BROWSERS_PATH points at nixpkgs'
// playwright-driver.browsers of the same version instead
export default defineConfig({
  testDir: 'test/e2e',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173/' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
  },
})
