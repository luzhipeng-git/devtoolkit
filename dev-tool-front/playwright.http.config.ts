import { defineConfig } from '@playwright/test'
import path from 'path'

const projectRoot = '/home/zhipeng/workspace/desktop-soft/developer-tools/dev-tool-front'

export default defineConfig({
  testDir: path.join(projectRoot, 'e2e'),
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:1420',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --port 1420',
    port: 1420,
    cwd: projectRoot,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /setup-http-backend\.ts/,
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: path.join(projectRoot, 'e2e/.http-backend-state.json'),
      },
      dependencies: ['setup'],
    },
  ],
})
