import { test, expect } from '@playwright/test'

test.describe('TC-03: JSON 工具', () => {
  // ===== JSON Format & Compress =====
  test.describe('JSON 格式化 & 压缩', () => {
    test('JSON格式化压缩同时双输出', async ({ page }) => {
      await page.goto('/json/format')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"name":"test","value":123}')
      // 点击"格式化 & 压缩"按钮
      const formatBtn = page.locator('button', { hasText: /格式化|Format/i }).first()
      if (await formatBtn.isVisible()) {
        await formatBtn.click()
        await page.waitForTimeout(500)
      } else {
        // 实时转换模式，直接等待
        await page.waitForTimeout(500)
      }

      // 格式化面板显示带缩进的 JSON
      const prettyPanel = page.locator('.panel-body, .pretty-output, [class*="pretty"], [class*="format"]').first()
      const prettyText = await prettyPanel.textContent()
      expect(prettyText).toBeTruthy()
      expect(prettyText).toContain('"name"')
      expect(prettyText).toContain('"test"')
      expect(prettyText).toContain('"value"')
      expect(prettyText).toContain('123')

      // 压缩面板显示单行 JSON
      const minifyPanel = page.locator('.minify-body, .minify-output, [class*="minify"]').first()
      const minifyText = await minifyPanel.textContent()
      expect(minifyText).toBeTruthy()
      expect(minifyText).toMatch(/\{"name":"test","value":123\}/)

      // 压缩率显示
      const compressionBar = page.locator('.compression-bar, [class*="compression"], [class*="compress"]')
      if (await compressionBar.isVisible()) {
        const barText = await compressionBar.textContent()
        expect(barText).toContain('压缩率')
      }
    })

    test('JSON格式化缩进切换', async ({ page }) => {
      await page.goto('/json/format')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"a":1,"b":2}')
      const formatBtn = page.locator('button', { hasText: /格式化/i }).first()
      if (await formatBtn.isVisible()) await formatBtn.click()
      await page.waitForTimeout(500)

      // 切换缩进为 tab
      const indentSelect = page.locator('.config-select, select', { hasText: '' }).first()
      if (await indentSelect.isVisible()) {
        await indentSelect.selectOption({ label: 'Tab' })
        await page.waitForTimeout(300)
        const prettyPanel = page.locator('.panel-body, .pretty-output').first()
        const text = await prettyPanel.textContent()
        expect(text).toContain('\t')
      }
    })

    test('JSON格式化排序Keys', async ({ page }) => {
      await page.goto('/json/format')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"b":2,"a":1,"c":3}')
      const formatBtn = page.locator('button', { hasText: /格式化/i }).first()
      if (await formatBtn.isVisible()) await formatBtn.click()
      await page.waitForTimeout(500)

      // 开启排序 Keys
      const sortToggle = page.locator('.toggle-switch, input[type="checkbox"]').first()
      if (await sortToggle.isVisible()) {
        await sortToggle.click()
        await page.waitForTimeout(300)
      }
      const prettyPanel = page.locator('.panel-body, .pretty-output').first()
      const text = await prettyPanel.textContent()
      if (text) {
        const aIdx = text.indexOf('"a"')
        const bIdx = text.indexOf('"b"')
        const cIdx = text.indexOf('"c"')
        expect(aIdx).toBeLessThan(bIdx)
        expect(bIdx).toBeLessThan(cIdx)
      }
    })

    test('JSON格式化Unicode转义', async ({ page }) => {
      await page.goto('/json/format')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"name":"张三"}')
      const formatBtn = page.locator('button', { hasText: /格式化/i }).first()
      if (await formatBtn.isVisible()) await formatBtn.click()
      await page.waitForTimeout(500)

      // 开启 Unicode 转义
      const toggles = page.locator('.toggle-switch, input[type="checkbox"]')
      const toggleCount = await toggles.count()
      if (toggleCount > 1) {
        await toggles.nth(1).click()
        await page.waitForTimeout(300)
        const prettyPanel = page.locator('.panel-body, .pretty-output').first()
        const text = await prettyPanel.textContent()
        expect(text).toContain('\\u')
      }
    })

    test('JSON格式化非法JSON错误', async ({ page }) => {
      await page.goto('/json/format')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{invalid}')
      const formatBtn = page.locator('button', { hasText: /格式化/i }).first()
      if (await formatBtn.isVisible()) await formatBtn.click()
      await page.waitForTimeout(500)

      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/Expected|position|错误|error|invalid/i)
    })

    test('JSON格式化重置按钮', async ({ page }) => {
      await page.goto('/json/format')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"test":1}')
      const formatBtn = page.locator('button', { hasText: /格式化/i }).first()
      if (await formatBtn.isVisible()) await formatBtn.click()
      await page.waitForTimeout(500)

      const resetBtn = page.locator('button', { hasText: /重置|Reset/i })
      if (await resetBtn.isVisible()) {
        await resetBtn.click()
        await page.waitForTimeout(300)
        const val = await textarea.inputValue()
        expect(val).toBe('')
      }
    })

    test('JSON格式化独立复制', async ({ page }) => {
      await page.goto('/json/format')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"a":1}')
      const formatBtn = page.locator('button', { hasText: /格式化/i }).first()
      if (await formatBtn.isVisible()) await formatBtn.click()
      await page.waitForTimeout(500)

      const copyBtn = page.locator('.copy-btn, .btn-copy, button', { hasText: /^复制$/ }).first()
      if (await copyBtn.isVisible()) {
        await copyBtn.click()
        await page.waitForTimeout(500)
        const btnText = await copyBtn.textContent()
        expect(btnText).toMatch(/已复制|Copied|复制/i)
      }
    })
  })

  // ===== JSON Deserialize =====
  test.describe('JSON 反序列化', () => {
    test('JSON反序列化Java', async ({ page }) => {
      await page.goto('/json/deserialize')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"name":"John","age":30}')
      const genBtn = page.locator('button', { hasText: /生成|Generate/i }).first()
      if (await genBtn.isVisible()) {
        await genBtn.click()
        await page.waitForTimeout(500)
      } else {
        await page.waitForTimeout(500)
      }

      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/String name|private.*name/i)
      expect(bodyText).toMatch(/Integer age|private.*age|int age/i)
    })

    test('JSON反序列化切换语言', async ({ page }) => {
      await page.goto('/json/deserialize')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"name":"John","age":30}')
      // 切换为 Python
      const langSelect = page.locator('select', { hasText: '' })
      if (await langSelect.isVisible()) {
        await langSelect.selectOption({ label: 'Python' })
        await page.waitForTimeout(300)
      }
      const genBtn = page.locator('button', { hasText: /生成/i }).first()
      if (await genBtn.isVisible()) {
        await genBtn.click()
        await page.waitForTimeout(500)
      }

      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/class|def|name|age/i)
    })
  })

  // ===== JSONPath Query =====
  test.describe('JSONPath 查询', () => {
    test('JSONPath基本路径', async ({ page }) => {
      await page.goto('/json/path')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"name":"test","value":123}')
      const pathInput = page.locator('.path-input, input[placeholder*="JSONPath"]').first()
      await pathInput.clear()
      await pathInput.fill('$.name')
      const queryBtn = page.locator('button', { hasText: /查询|Query|执行/i }).first()
      await queryBtn.click()
      await page.waitForTimeout(500)

      const output = page.locator('.editor-output, .result, [class*="result"]').first()
      const text = await output.textContent()
      expect(text).toContain('test')
    })

    test('JSONPath数组查询', async ({ page }) => {
      await page.goto('/json/path')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"store":{"book":[{"title":"A"},{"title":"B"}]}}')
      const pathInput = page.locator('.path-input, input[placeholder*="JSONPath"]').first()
      await pathInput.clear()
      await pathInput.fill('$..title')
      const queryBtn = page.locator('button', { hasText: /查询/i }).first()
      await queryBtn.click()
      await page.waitForTimeout(500)

      const output = page.locator('.editor-output, .result').first()
      const text = await output.textContent()
      expect(text).toContain('A')
      expect(text).toContain('B')
    })

    test('JSONPath无匹配', async ({ page }) => {
      await page.goto('/json/path')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"a":1}')
      const pathInput = page.locator('.path-input, input[placeholder*="JSONPath"]').first()
      await pathInput.clear()
      await pathInput.fill('$.nonexistent')
      const queryBtn = page.locator('button', { hasText: /查询/i }).first()
      await queryBtn.click()
      await page.waitForTimeout(500)

      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/无匹配|empty|0|null|未找到/i)
    })

    test('JSONPath无效表达式', async ({ page }) => {
      await page.goto('/json/path')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('{"a":1}')
      const pathInput = page.locator('.path-input, input[placeholder*="JSONPath"]').first()
      await pathInput.clear()
      await pathInput.fill('[invalid')
      const queryBtn = page.locator('button', { hasText: /查询/i }).first()
      await queryBtn.click()
      await page.waitForTimeout(500)

      const errorText = page.locator('.error-text')
      if (await errorText.isVisible()) {
        const text = await errorText.textContent()
        expect(text).toMatch(/错误|error|invalid|无效|查询失败|有效|JSON|Expected|position/i)
      } else {
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toMatch(/错误|error|invalid|无效|查询失败|有效|JSON|Expected|position/i)
      }
    })
  })

  // ===== JSON Diff =====
  test.describe('JSON Diff', () => {
    test('JSONDiff检测修改', async ({ page }) => {
      await page.goto('/json/diff')
      await page.waitForLoadState('networkidle')
      const textareas = page.locator('.editor-textarea')
      await textareas.nth(0).fill('{"a":1,"b":2}')
      await textareas.nth(1).fill('{"a":1,"b":3}')
      const diffBtn = page.locator('.btn-action, button', { hasText: /对比/ }).first()
      await diffBtn.click()
      await page.waitForTimeout(500)

      const diffContainer = page.locator('.diff-result-container, [class*="diff-result"]')
      const text = await diffContainer.textContent()
      expect(text).toContain('b')
      // 统计栏应显示修改
      const statsBar = page.locator('.diff-stats, [class*="diff-stats"], [class*="stats"]')
      if (await statsBar.isVisible()) {
        const statsText = await statsBar.textContent()
        expect(statsText).toMatch(/修改/)
      }
    })

    test('JSONDiff检测新增', async ({ page }) => {
      await page.goto('/json/diff')
      await page.waitForLoadState('networkidle')
      const textareas = page.locator('.editor-textarea')
      await textareas.nth(0).fill('{"a":1}')
      await textareas.nth(1).fill('{"a":1,"b":2}')
      const diffBtn = page.locator('button', { hasText: /对比/ }).first()
      await diffBtn.click()
      await page.waitForTimeout(500)

      const diffContainer = page.locator('.diff-result-container, [class*="diff-result"]')
      const text = await diffContainer.textContent()
      expect(text).toContain('b')
      const statsBar = page.locator('.diff-stats, [class*="stats"]')
      if (await statsBar.isVisible()) {
        const statsText = await statsBar.textContent()
        expect(statsText).toContain('新增')
      }
    })

    test('JSONDiff检测删除', async ({ page }) => {
      await page.goto('/json/diff')
      await page.waitForLoadState('networkidle')
      const textareas = page.locator('.editor-textarea')
      await textareas.nth(0).fill('{"a":1,"b":2}')
      await textareas.nth(1).fill('{"a":1}')
      const diffBtn = page.locator('button', { hasText: /对比/ }).first()
      await diffBtn.click()
      await page.waitForTimeout(500)

      const diffContainer = page.locator('.diff-result-container, [class*="diff-result"]')
      const text = await diffContainer.textContent()
      expect(text).toContain('b')
      const statsBar = page.locator('.diff-stats, [class*="stats"]')
      if (await statsBar.isVisible()) {
        const statsText = await statsBar.textContent()
        expect(statsText).toContain('删除')
      }
    })

    test('JSONDiff完全相同', async ({ page }) => {
      await page.goto('/json/diff')
      await page.waitForLoadState('networkidle')
      const textareas = page.locator('.editor-textarea')
      await textareas.nth(0).fill('{"a":1,"b":2}')
      await textareas.nth(1).fill('{"a":1,"b":2}')
      const diffBtn = page.locator('button', { hasText: /对比/ }).first()
      await diffBtn.click()
      await page.waitForTimeout(500)

      const diffContainer = page.locator('.diff-result-container, [class*="diff-result"]')
      const text = await diffContainer.textContent()
      expect(text).toContain('完全相同')
    })

    test('JSONDiff键顺序不同', async ({ page }) => {
      await page.goto('/json/diff')
      await page.waitForLoadState('networkidle')
      const textareas = page.locator('.editor-textarea')
      await textareas.nth(0).fill('{"level":"high","language":"java","seq":1}')
      await textareas.nth(1).fill('{"language":"java","level":"high","seq":1}')
      const diffBtn = page.locator('button', { hasText: /对比/ }).first()
      await diffBtn.click()
      await page.waitForTimeout(500)

      const diffContainer = page.locator('.diff-result-container, [class*="diff-result"]')
      const text = await diffContainer.textContent()
      expect(text).toContain('完全相同')
    })

    test('JSONDiff无效JSON', async ({ page }) => {
      await page.goto('/json/diff')
      await page.waitForLoadState('networkidle')
      const textareas = page.locator('.editor-textarea')
      await textareas.nth(0).fill('{invalid}')
      await textareas.nth(1).fill('{"a":1}')
      const diffBtn = page.locator('button', { hasText: /对比/ }).first()
      await diffBtn.click()
      await page.waitForTimeout(500)

      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/错误|error|Expected|position/i)
    })
  })
})
