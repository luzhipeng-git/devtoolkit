import { test as base, expect } from '@playwright/test'

const setup = base.extend({})

setup('set backend to http', async ({ page }) => {
  await page.goto('http://localhost:1421')
  await page.evaluate(() => {
    localStorage.setItem('dev-backend', 'http')
  })
  await page.context().storageState({ path: '/home/zhipeng/workspace/desktop-soft/developer-tools/dev-tool-front/e2e/.visual-state.json' })
})

export default setup
