import { test, expect } from '@playwright/test'

test.describe('Visual Regression - Layout', () => {
  test('home page layout', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tool-card-link')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('home-page.png', { fullPage: false, maxDiffPixelRatio: 0.01 })
  })

  test('sidebar layout', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.sidebar')
    await page.waitForTimeout(300)
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toHaveScreenshot('sidebar.png', { maxDiffPixelRatio: 0.01 })
  })
})

test.describe('Visual Regression - Tool Pages', () => {
  const toolPages = [
    { name: 'unicode-encoder', path: '/encoding/unicode', label: 'Unicode' },
    { name: 'hex-converter', path: '/encoding/hex', label: 'Hex' },
    { name: 'json-formatter', path: '/json/format', label: 'JSON' },
    { name: 'aes-crypto', path: '/crypto/aes', label: 'AES' },
  ]

  for (const tool of toolPages) {
    test(`${tool.label} tool page`, async ({ page }) => {
      await page.goto(tool.path)
      await page.waitForSelector('.tool-card')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot(`tool-${tool.name}.png`, { fullPage: false, maxDiffPixelRatio: 0.01 })
    })
  }
})

test.describe('Visual Regression - Components', () => {
  test('options panel with toggle', async ({ page }) => {
    await page.goto('/encoding/unicode')
    await page.waitForSelector('.options-panel')
    const panel = page.locator('.options-panel')
    await expect(panel).toHaveScreenshot('options-panel.png', { maxDiffPixelRatio: 0.01 })
  })

  test('editor area', async ({ page }) => {
    await page.goto('/encoding/hex')
    await page.waitForSelector('.editor-header')
    const editor = page.locator('.editor-header').first()
    await expect(editor).toHaveScreenshot('editor-header.png', { maxDiffPixelRatio: 0.01 })
  })
})
