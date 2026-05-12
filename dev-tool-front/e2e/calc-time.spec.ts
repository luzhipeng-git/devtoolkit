import { test, expect } from '@playwright/test'

test.describe('TC-08: 计算器工具', () => {
  test.describe('进制转换', () => {
    test('进制转换十进制转其他', async ({ page }) => {
      await page.goto('/calculator/base')
      await page.waitForLoadState('networkidle')
      const input = page.locator('.calc-input').first()
      await input.fill('255')
      await page.waitForTimeout(500)
      const bodyText = await page.locator('body').textContent()
      // 十六进制 FF
      expect(bodyText).toMatch(/FF|ff/)
      // 二进制 11111111
      expect(bodyText).toContain('11111111')
      // 八进制 377
      expect(bodyText).toContain('377')
    })

    test('进制转换十六进制输入', async ({ page }) => {
      await page.goto('/calculator/base')
      await page.waitForLoadState('networkidle')
      const select = page.locator('.option-select').first()
      await select.selectOption('16')
      await page.waitForTimeout(300)
      const input = page.locator('.calc-input').first()
      await input.fill('FF')
      await page.waitForTimeout(500)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toContain('255')
    })

    test('进制转换无效字符', async ({ page }) => {
      await page.goto('/calculator/base')
      await page.waitForLoadState('networkidle')
      // 切换源进制为二进制
      const select = page.locator('.option-select').first()
      await select.selectOption('2')
      await page.waitForTimeout(300)
      // 输入非法字符 zz（二进制不允许，parseInt 返回 NaN）
      const input = page.locator('.calc-input').first()
      await input.fill('zz')
      await page.waitForTimeout(500)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/无效|invalid|错误|error/i)
    })
  })
})

test.describe('TC-09: 时间工具', () => {
  test.describe('时间戳转换', () => {
    test('时间戳转换秒级', async ({ page }) => {
      await page.goto('/time/timestamp')
      await page.waitForLoadState('networkidle')
      // 切换单位为秒（默认是毫秒）
      const secRadio = page.locator('.radio-item input[type="radio"][value="s"]').first()
      if (await secRadio.isVisible()) {
        await secRadio.click()
        await page.waitForTimeout(200)
      }
      const input = page.locator('.input-field.wide').first()
      await input.click()
      await input.clear()
      await input.fill('1609459200')
      // 点击转换按钮
      const convertBtn = page.locator('button.btn-convert').first()
      await convertBtn.click()
      await page.waitForTimeout(500)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/2021/)
    })

    test('时间戳转换毫秒级', async ({ page }) => {
      await page.goto('/time/timestamp')
      await page.waitForLoadState('networkidle')
      // 切换单位为毫秒
      const msRadio = page.locator('input[type="radio"][value="ms"]')
      if (await msRadio.isVisible()) {
        await msRadio.click()
        await page.waitForTimeout(200)
      }
      const input = page.locator('.input-field.wide').first()
      await input.click()
      await input.clear()
      await input.fill('1609459200000')
      await input.press('Enter')
      await page.waitForTimeout(500)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/2021/)
      expect(bodyText).toMatch(/毫秒/)
    })

    test('时间戳当前时间按钮', async ({ page }) => {
      await page.goto('/time/timestamp')
      await page.waitForLoadState('networkidle')
      const nowBtn = page.locator('button', { hasText: /当前/ }).first()
      if (await nowBtn.isVisible()) {
        await nowBtn.click()
        await page.waitForTimeout(300)
        const input = page.locator('.input-field.wide').first()
        const val = await input.inputValue()
        expect(val).toMatch(/^\d{10,13}$/)
      }
    })
  })

  test.describe('时间推算', () => {
    test('时间推算', async ({ page }) => {
      await page.goto('/time/timestamp')
      await page.waitForLoadState('networkidle')
      // 切换到时间推算 tab（如果存在）
      const calcTab = page.locator('.tool-tab, .sub-tab', { hasText: /时间推算|推算/ })
      if (await calcTab.isVisible()) {
        await calcTab.click()
        await page.waitForTimeout(300)
      }
      // 填入基准时间
      const baseInput = page.locator('.calc-input, .input-field').first()
      await baseInput.fill('2024-01-01 00:00:00')
      // 设置加 1 天
      const offsetInputs = page.locator('.offset-input, input[type="number"], input[placeholder*="天"]')
      if ((await offsetInputs.count()) > 0) {
        await offsetInputs.first().fill('1')
        await page.waitForTimeout(500)
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toContain('2024-01-02')
      }
    })
  })
})

test.describe('TC-10: Cron 表达式', () => {
  test.describe('Cron 编辑器', () => {
    test('Cron默认表达式解析', async ({ page }) => {
      await page.goto('/cron/editor')
      await page.waitForLoadState('networkidle')
      // 默认表达式 */5 * * * * 应有中文描述
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/每.*5.*分|每5分钟/i)
      // 应显示执行时间列表
      const timeItems = page.locator('.td-time, .preview-table td, [class*="time"]')
      const count = await timeItems.count()
      expect(count).toBeGreaterThan(0)
    })

    test('Cron手动输入表达式', async ({ page }) => {
      await page.goto('/cron/editor')
      await page.waitForLoadState('networkidle')
      const input = page.locator('.cron-input, input[placeholder*="Cron"], input[placeholder*="cron"]').first()
      await input.clear()
      await input.fill('0 0 * * *')
      await page.waitForTimeout(1000)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/每天|00:00/i)
    })

    test('Cron预设模板', async ({ page }) => {
      await page.goto('/cron/editor')
      await page.waitForLoadState('networkidle')
      const presetBtn = page.locator('.preset-chip, .preset-name, [class*="preset"]')
      const count = await presetBtn.count()
      expect(count).toBeGreaterThan(0)
      // 点击第一个预设
      await presetBtn.first().click()
      await page.waitForTimeout(500)
      const input = page.locator('.cron-input').first()
      const value = await input.inputValue()
      expect(value).toBeTruthy()
      expect(value.length).toBeGreaterThan(0)
    })

    test('Cron非法表达式', async ({ page }) => {
      await page.goto('/cron/editor')
      await page.waitForLoadState('networkidle')
      const input = page.locator('.cron-input').first()
      await input.clear()
      await input.fill('99 99 99 99 99')
      await page.waitForTimeout(1000)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/错误|error|无效|invalid/i)
    })
  })
})
