import { defineConfig } from '@playwright/test'
import path from 'path'

const projectRoot = '/home/zhipeng/workspace/desktop-soft/developer-tools/dev-tool-front'

export default defineConfig({
  testDir: path.join(projectRoot, 'e2e/visual'),
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    },
  },
  use: {
    baseURL: 'http://localhost:1421',
    headless: true,
    screenshot: 'on',
    viewport: { width: 1440, height: 900 },
  },
  snapshotDir: path.join(projectRoot, 'e2e/visual/__snapshots__'),
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testName}{ext}',
  projects: [
    {
      name: 'setup',
      testMatch: /setup-visual\.ts/,
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: path.join(projectRoot, 'e2e/.visual-state.json'),
      },
      dependencies: ['setup'],
    },
  ],
})
