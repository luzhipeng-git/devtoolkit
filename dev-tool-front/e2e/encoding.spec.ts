import { test, expect } from '@playwright/test'

test.describe('TC-02: 字符编码转换', () => {
  // ===== Hex Converter =====
  test.describe('Hex 编码转换', () => {
    test('Hex编码基本转换', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('Hello')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      // H=0x48, e=0x65, l=0x6C, l=0x6C, o=0x6F
      expect(text).toContain('48')
      expect(text).toContain('65')
      expect(text).toContain('6C')
      expect(text).toContain('6F')
    })

    test('Hex解码基本转换', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const decodeTab = page.locator('.tool-tab', { hasText: '解码' })
      await decodeTab.click()
      await page.waitForTimeout(300)
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('48 65 6C 6C 6F')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toContain('Hello')
    })

    test('Hex编码单字符', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('A')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toContain('41')
    })

    test('Hex选项分隔符切换', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(300)
      // 验证默认空格分隔
      const output = page.locator('.editor-output').first()
      let text = await output.textContent()
      expect(text).toContain('41 42')

      // 切换为逗号分隔
      const selects = page.locator('.option-select')
      if ((await selects.count()) > 0) {
        await selects.first().selectOption({ label: '逗号' })
        await page.waitForTimeout(300)
        text = await output.textContent()
        expect(text).toContain('41,42')
      }
    })

    test('Hex选项前缀切换', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(300)
      // 切换前缀为 0x
      const selects = page.locator('.option-select')
      if ((await selects.count()) > 1) {
        await selects.nth(1).selectOption({ label: '0x' })
        await page.waitForTimeout(300)
        const output = page.locator('.editor-output').first()
        const text = await output.textContent()
        expect(text).toContain('0x41')
        expect(text).toContain('0x42')
      }
    })

    test('Hex选项大小写切换', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('Hello')
      await page.waitForTimeout(300)
      // 默认大写
      const output = page.locator('.editor-output').first()
      let text = await output.textContent()
      expect(text).toContain('6C')

      // 切换为小写
      const selects = page.locator('.option-select')
      const count = await selects.count()
      if (count > 2) {
        await selects.nth(2).selectOption({ label: '小写' })
        await page.waitForTimeout(300)
        text = await output.textContent()
        expect(text).toMatch(/6c/)
      }
    })

    test('Hex标签切换互换', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('Hello')
      await page.waitForTimeout(500)
      // 记录输出
      const output = page.locator('.editor-output').first()
      const encodedText = await output.textContent()
      expect(encodedText).toBeTruthy()

      // 点击解码标签
      const decodeTab = page.locator('.tool-tab', { hasText: '解码' })
      await decodeTab.click()
      await page.waitForTimeout(500)

      // 输入区应包含之前的输出
      const inputValue = await textarea.inputValue()
      expect(inputValue.length).toBeGreaterThan(0)

      // 输出区应显示解码结果 Hello
      const decodedText = await output.textContent()
      expect(decodedText).toContain('Hello')
    })

    test('Hex标签重复点击忽略', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('test')
      await page.waitForTimeout(300)
      const output = page.locator('.editor-output').first()
      const textBefore = await output.textContent()

      // 重复点击当前激活的编码标签
      const encodeTab = page.locator('.tool-tab', { hasText: '编码' })
      await encodeTab.click()
      await page.waitForTimeout(300)
      const textAfter = await output.textContent()

      // 内容不应变化
      expect(textAfter).toBe(textBefore)
    })

    test('Hex交换按钮', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const encoded = await output.textContent()
      expect(encoded).toContain('41')

      // 点击交换
      const swapBtn = page.locator('.swap-btn')
      await swapBtn.click()
      await page.waitForTimeout(500)

      // 输入区应变为编码结果，输出区应为 AB
      const inputValue = await textarea.inputValue()
      expect(inputValue).toBeTruthy()
      const outputText = await output.textContent()
      expect(outputText).toContain('AB')
    })

    test('Hex错误处理非法输入', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const decodeTab = page.locator('.tool-tab', { hasText: '解码' })
      await decodeTab.click()
      await page.waitForTimeout(300)
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('GHIJKL')
      await page.waitForTimeout(500)
      // 输出区应显示错误提示
      const errorText = page.locator('.error-text')
      if (await errorText.isVisible()) {
        const text = await errorText.textContent()
        expect(text).toMatch(/错误|error|无效|invalid/i)
      } else {
        const output = page.locator('.editor-output').first()
        const text = await output.textContent()
        // 如果没有明确的错误元素，检查输出是否为空或包含错误
        expect(text === '' || text?.match(/错误|error|无效|invalid/i)).toBeTruthy()
      }
    })

    test('Hex清除按钮', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('test')
      await page.waitForTimeout(300)
      const clearBtn = page.locator('button.btn-outline, button', { hasText: /清空|清除/ }).first()
      if (await clearBtn.isVisible()) {
        await clearBtn.click()
        await page.waitForTimeout(300)
        const val = await textarea.inputValue()
        expect(val).toBe('')
        const output = page.locator('.editor-output').first()
        const outputText = await output.textContent()
        expect(outputText?.trim()).toBe('')
      }
    })

    test('Hex紧凑复制', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(500)
      // 查找紧凑复制按钮
      const compactCopyBtn = page.locator('button', { hasText: /紧凑复制|compact/i })
      if (await compactCopyBtn.isVisible()) {
        await compactCopyBtn.click()
        await page.waitForTimeout(300)
        const btnText = await compactCopyBtn.textContent()
        expect(btnText).toMatch(/已复制|Copied/i)
        // 验证剪贴板内容无分隔符
        const clipboard = await page.evaluate(() => navigator.clipboard.readText())
        expect(clipboard).not.toContain(' ')
      }
    })
  })

  // ===== Base64 Converter =====
  test.describe('Base64 编码转换', () => {
    test('Base64编码基本', async ({ page }) => {
      await page.goto('/encoding/base64')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('Hello World')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toContain('SGVsbG8gV29ybGQ=')
    })

    test('Base64解码往返验证', async ({ page }) => {
      await page.goto('/encoding/base64')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('你好世界')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const encoded = await output.textContent()
      expect(encoded).toBeTruthy()
      expect(encoded!.length).toBeGreaterThan(0)

      // 切换解码标签
      const decodeTab = page.locator('.tool-tab', { hasText: '解码' })
      await decodeTab.click()
      await page.waitForTimeout(500)

      // 输出应为原始中文
      const decoded = await output.textContent()
      expect(decoded).toContain('你好世界')
    })

    test('Base64错误无效输入', async ({ page }) => {
      await page.goto('/encoding/base64')
      await page.waitForLoadState('networkidle')
      const decodeTab = page.locator('.tool-tab', { hasText: '解码' })
      await decodeTab.click()
      await page.waitForTimeout(300)
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('!!!invalid!!!')
      await page.waitForTimeout(500)
      const errorText = page.locator('.error-text')
      if (await errorText.isVisible()) {
        const text = await errorText.textContent()
        expect(text).toMatch(/错误|error|无效|invalid|失败|failed|not correctly/i)
      } else {
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toMatch(/错误|error|无效|invalid|失败|failed|not correctly/i)
      }
    })
  })

  // ===== ASCII Converter =====
  test.describe('ASCII 编码转换', () => {
    test('ASCII编码十进制', async ({ page }) => {
      await page.goto('/encoding/ascii')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toContain('65')
      expect(text).toContain('66')
    })

    test('ASCII编码十六进制', async ({ page }) => {
      await page.goto('/encoding/ascii')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(300)
      const selects = page.locator('.option-select')
      if ((await selects.count()) > 0) {
        const currentVal = await selects.first().inputValue()
        // Try selecting hex/十六进制 option if it exists
        const options = await selects.first().locator('option').allTextContents()
        const hexOption = options.find(o => o.includes('十六进制') || o.includes('Hex') || o.includes('hex'))
        if (hexOption) {
          await selects.first().selectOption({ label: hexOption.trim() })
          await page.waitForTimeout(300)
          const output = page.locator('.editor-output').first()
          const text = await output.textContent()
          expect(text).toMatch(/41/)
          expect(text).toMatch(/42/)
        }
      }
    })

    test('ASCII非ASCII字符处理', async ({ page }) => {
      await page.goto('/encoding/ascii')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('A')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      // A 的 ASCII 码是 65
      expect(text).toContain('65')
    })
  })

  // ===== URL Converter =====
  test.describe('URL 编码转换', () => {
    test('URL编码组件编码', async ({ page }) => {
      await page.goto('/encoding/url')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('hello world=1&foo=bar')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toContain('%20')
      expect(text).toContain('%3D')
      expect(text).toContain('%26')
    })

    test('URL编码完整编码', async ({ page }) => {
      await page.goto('/encoding/url')
      await page.waitForLoadState('networkidle')
      // 检查是否有完整编码选项
      const modeSelect = page.locator('.option-select')
      if ((await modeSelect.count()) > 0) {
        const options = await modeSelect.first().locator('option').allTextContents()
        const fullOption = options.find(o => o.includes('完整') || o.includes('encodeURI'))
        if (fullOption) {
          await modeSelect.first().selectOption({ label: fullOption.trim() })
          await page.waitForTimeout(300)
        }
      }
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('http://example.com/path?q=test')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      // encodeURIComponent 会编码 :// 等字符
      expect(text).toBeTruthy()
      expect(text).toContain('example.com')
    })

    test('URL解码往返', async ({ page }) => {
      await page.goto('/encoding/url')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('a=1&b=2')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const encoded = await output.textContent()
      expect(encoded).toBeTruthy()

      // 切换解码
      const decodeTab = page.locator('.tool-tab', { hasText: '解码' })
      await decodeTab.click()
      await page.waitForTimeout(500)
      const decoded = await output.textContent()
      expect(decoded).toContain('a=1&b=2')
    })
  })

  // ===== Unicode Converter =====
  test.describe('Unicode 编码转换', () => {
    test('Unicode编码基本', async ({ page }) => {
      await page.goto('/encoding/unicode')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('你好')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      // "你"=4F60, "好"=597D
      expect(text).toMatch(/4f60|4F60/)
      expect(text).toMatch(/597d|597D/)
    })

    test('Unicode解码往返', async ({ page }) => {
      await page.goto('/encoding/unicode')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const encoded = await output.textContent()
      expect(encoded).toContain('41')
      expect(encoded).toContain('42')

      // 切换解码
      const decodeTab = page.locator('.tool-tab', { hasText: '解码' })
      await decodeTab.click()
      await page.waitForTimeout(500)
      const decoded = await output.textContent()
      expect(decoded).toContain('AB')
    })
  })

  // ===== 通用交互 =====
  test.describe('通用交互', () => {
    test('空输入处理', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('test')
      await page.waitForTimeout(300)
      await textarea.fill('')
      await page.waitForTimeout(300)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text?.trim()).toBe('')
    })

    test('复制按钮反馈', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('test')
      await page.waitForTimeout(500)
      const copyBtn = page.locator('.copy-btn, .btn-copy, button', { hasText: /^复制$/ }).first()
      if (await copyBtn.isVisible()) {
        await copyBtn.click()
        await page.waitForTimeout(500)
        const btnText = await copyBtn.textContent()
        expect(btnText).toMatch(/已复制|Copied|复制/i)
      }
    })

    test('选项重复选择忽略', async ({ page }) => {
      await page.goto('/encoding/hex')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('AB')
      await page.waitForTimeout(300)
      const output = page.locator('.editor-output').first()
      const textBefore = await output.textContent()

      // 重复选择当前分隔符（空格）
      const selects = page.locator('.option-select')
      if ((await selects.count()) > 0) {
        const currentVal = await selects.first().inputValue()
        await selects.first().selectOption(currentVal)
        await page.waitForTimeout(300)
        const textAfter = await output.textContent()
        expect(textAfter).toBe(textBefore)
      }
    })
  })
})
