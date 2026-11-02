import { defineConfig, devices } from '@playwright/test';

// Accessibility tests run against the built site (astro preview), in CI on Chromium.
export default defineConfig({
  testDir: 'tests',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4321/portfolio/' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx astro preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/portfolio/',
    reuseExistingServer: !process.env['CI'],
  },
});
