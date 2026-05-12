import { defineConfig } from '@playwright/test'
import path from 'path'

const projectRoot = '/home/zhipeng/workspace/desktop-soft/developer-tools/dev-tool-front'

export default defineConfig({
  testDir: path.join(projectRoot, 'e2e'),
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  reporter: [
    ['html', { open: 'never', outputFolder: path.join(projectRoot, 'e2e-report/html') }],
    ['json', { outputFile: path.join(projectRoot, 'e2e-report/test-results.json') }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:1420',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npx vite --port 1420',
    port: 1420,
    cwd: projectRoot,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
