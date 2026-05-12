import { test as setup } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const authFile = path.join(__dirname, '.http-backend-state.json')

setup('configure http backend', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('dev-backend', 'http')
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.context().storageState({ path: authFile })
})
