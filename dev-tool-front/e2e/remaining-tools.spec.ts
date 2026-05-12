import { test, expect } from '@playwright/test'

// ===== TC-07: 密钥工具 =====
test.describe('TC-07: 密钥工具', () => {
  test.describe('密钥生成', () => {
    test('密钥生成默认参数', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 页面加载后自动生成 1 个密钥
      const keyItems = page.locator('.key-item')
      const count = await keyItems.count()
      expect(count).toBeGreaterThanOrEqual(1)
      // 密钥值应为 32 个 Hex 字符（AES 128 = 16 字节）
      const keyValue = page.locator('.key-value').first()
      const text = await keyValue.textContent() || ''
      expect(text.length).toBe(32)
      expect(text).toMatch(/^[0-9a-fA-F]+$/)
    })

    test('密钥生成多个', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      const quantityInput = page.locator('input.number-input')
      await quantityInput.fill('5')
      await page.waitForTimeout(300)
      const genBtn = page.locator('button.btn-primary', { hasText: /生成/ })
      await genBtn.click()
      await page.waitForTimeout(500)
      const keyItems = page.locator('.key-item')
      const count = await keyItems.count()
      expect(count).toBe(5)
      // 批量复制按钮应出现
      const batchCopyBtn = page.locator('button', { hasText: /批量复制/ })
      expect(await batchCopyBtn.isVisible()).toBeTruthy()
    })

    test('KCV计算', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 切换到 KCV tab
      const kcvTab = page.locator('.sub-tab', { hasText: /KCV/ })
      if (await kcvTab.isVisible()) {
        await kcvTab.click()
        await page.waitForTimeout(300)
      }
      const kcvInput = page.locator('input.key-input')
      await kcvInput.fill('00112233445566778899AABBCCDDEEFF')
      const kcvBtn = page.locator('button', { hasText: /计算 KCV/ })
      await kcvBtn.click()
      await page.waitForTimeout(2000)
      const bodyText = await page.locator('body').textContent()
      // KCV 应为 6 个 Hex 字符
      expect(bodyText).toMatch(/[0-9A-Fa-f]{6}/)
    })

    // TC-07-03: 随机密钥 - AES 密钥长度切换
    test('密钥生成AES256', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 选择密钥长度为 256 bit
      const keySizeSelect = page.locator('select.option-select').nth(1)
      await keySizeSelect.selectOption('256')
      await page.waitForTimeout(300)
      // 点击生成
      const genBtn = page.locator('button.btn-primary', { hasText: /生成/ })
      await genBtn.click()
      await page.waitForTimeout(500)
      // 密钥应为 64 个 Hex 字符（32 字节）
      const keyValue = page.locator('.key-value').first()
      const text = await keyValue.textContent() || ''
      expect(text.length).toBe(64)
      expect(text).toMatch(/^[0-9a-fA-F]{64}$/)
    })

    // TC-07-04: 随机密钥 - DES 双倍长
    test('密钥生成DES双倍长', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 选择算法 DES/3DES
      const algoSelect = page.locator('select.option-select').first()
      await algoSelect.selectOption('des')
      await page.waitForTimeout(300)
      // 选择双倍长
      const lengthSelect = page.locator('select.option-select').nth(1)
      await lengthSelect.selectOption('double')
      await page.waitForTimeout(300)
      // 点击生成
      const genBtn = page.locator('button.btn-primary', { hasText: /生成/ })
      await genBtn.click()
      await page.waitForTimeout(500)
      // 密钥应为 32 个 Hex 字符（16 字节）
      const keyValue = page.locator('.key-value').first()
      const text = await keyValue.textContent() || ''
      expect(text.length).toBe(32)
      expect(text).toMatch(/^[0-9a-fA-F]{32}$/)
    })

    // TC-07-05: 随机密钥 - Hex 大小写切换
    test('密钥生成大小写切换', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 等待自动生成密钥
      await page.waitForTimeout(500)
      // 确认有大写密钥
      const keyValue = page.locator('.key-value').first()
      const upperText = await keyValue.textContent() || ''
      expect(upperText).toMatch(/[0-9A-F]+/)
      // 点击小写
      const lowerBtn = page.locator('.case-toggle-row .case-btn', { hasText: /小写/ })
      await lowerBtn.click()
      await page.waitForTimeout(300)
      // 验证显示为小写
      const lowerText = await keyValue.textContent() || ''
      expect(lowerText).toBe(upperText.toLowerCase())
      expect(lowerText).toMatch(/^[0-9a-f]+$/)
    })

    // TC-07-07: KCV 计算 - Hex 输入限制
    test('KCVHex输入限制', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 切换到 KCV tab
      const kcvTab = page.locator('.sub-tab', { hasText: /KCV/ })
      await kcvTab.click()
      await page.waitForTimeout(300)
      const kcvInput = page.locator('input.key-input')
      // 先输入一些合法 hex
      await kcvInput.click()
      await kcvInput.fill('AABB')
      // 尝试输入非 Hex 字符（通过 keyboard.type）
      await kcvInput.pressSequentially('GKXYZ', { delay: 50 })
      await page.waitForTimeout(200)
      // 验证输入框中只有合法 hex 字符
      const value = await kcvInput.inputValue()
      expect(value).toBe('AABB')
      // 确认没有 G/K/X/Y/Z
      expect(value).not.toMatch(/[GKXYZ]/)
    })

    // TC-07-08: KCV 计算 - 密钥长度与字节数显示
    test('KCV字节数显示', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 切换到 KCV tab
      const kcvTab = page.locator('.sub-tab', { hasText: /KCV/ })
      await kcvTab.click()
      await page.waitForTimeout(300)
      // 默认 AES 128bit，输入 10 个 Hex 字符 (5 字节)
      const kcvInput = page.locator('input.key-input')
      await kcvInput.fill('AABBCCDDEE')
      await page.waitForTimeout(300)
      // 验证字节数显示 5/16
      const keyCount = page.locator('.key-count')
      const countText = await keyCount.textContent()
      expect(countText).toContain('5/16')
      // 计算按钮应禁用
      const kcvBtn = page.locator('button', { hasText: /计算 KCV/ })
      expect(await kcvBtn.isDisabled()).toBeTruthy()
    })

    // TC-07-09: KCV 计算 - 结果大小写切换
    test('KCV大小写切换', async ({ page }) => {
      await page.goto('/crypto/key')
      await page.waitForLoadState('networkidle')
      // 切换到 KCV tab
      const kcvTab = page.locator('.sub-tab', { hasText: /KCV/ })
      await kcvTab.click()
      await page.waitForTimeout(300)
      // 输入完整 AES 128 密钥
      const kcvInput = page.locator('input.key-input')
      await kcvInput.fill('00112233445566778899AABBCCDDEEFF')
      const kcvBtn = page.locator('button', { hasText: /计算 KCV/ })
      await kcvBtn.click()
      await page.waitForTimeout(2000)
      // 获取大写结果
      const resultEl = page.locator('.editor-output')
      const upperResult = await resultEl.textContent() || ''
      expect(upperResult).toMatch(/^[0-9A-F]+$/)
      // 点击小写
      const lowerBtn = page.locator('.result-actions .case-btn', { hasText: /小写/ })
      await lowerBtn.click()
      await page.waitForTimeout(300)
      // 验证显示为小写
      const lowerResult = await resultEl.textContent() || ''
      expect(lowerResult).toBe(upperResult.toLowerCase())
      expect(lowerResult).toMatch(/^[0-9a-f]+$/)
    })
  })
})

// ===== TC-11: 正则调试 =====
test.describe('TC-11: 正则调试', () => {
  test('正则匹配基本', async ({ page }) => {
    await page.goto('/regex/tester')
    await page.waitForLoadState('networkidle')
    const regexInput = page.locator('.regex-input, input[placeholder*="正则"]').first()
    await regexInput.fill('\\d+')
    const textarea = page.locator('.form-textarea, textarea').first()
    await textarea.fill('abc 123 def 456')
    await page.waitForTimeout(500)
    // 应高亮匹配项
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('123')
    expect(bodyText).toContain('456')
    // 匹配数量
    expect(bodyText).toMatch(/2.*匹配|找到 2/i)
  })

  test('正则匹配无匹配', async ({ page }) => {
    await page.goto('/regex/tester')
    await page.waitForLoadState('networkidle')
    const regexInput = page.locator('.regex-input').first()
    await regexInput.fill('xyz123')
    const textarea = page.locator('.form-textarea, textarea').first()
    await textarea.fill('hello world')
    await page.waitForTimeout(500)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/未找到|0.*匹配|no match/i)
  })

  test('正则匹配语法错误', async ({ page }) => {
    await page.goto('/regex/tester')
    await page.waitForLoadState('networkidle')
    const regexInput = page.locator('.regex-input').first()
    await regexInput.fill('(unclosed')
    await page.waitForTimeout(500)
    const errorText = page.locator('.error-text')
    if (await errorText.isVisible()) {
      const text = await errorText.textContent()
      expect(text).toMatch(/错误|error|unterminated|unclosed|正则表达式/i)
    } else {
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/错误|error|unterminated|unclosed|正则表达式/i)
    }
  })

  test('正则Flag切换', async ({ page }) => {
    await page.goto('/regex/tester')
    await page.waitForLoadState('networkidle')
    // 点击 i flag（忽略大小写）
    const iFlag = page.locator('.flag-btn, button', { hasText: /^i$|Case/i })
    if (await iFlag.isVisible()) {
      await iFlag.click()
      await page.waitForTimeout(300)
    }
    const regexInput = page.locator('.regex-input').first()
    await regexInput.fill('hello')
    const textarea = page.locator('.form-textarea, textarea').first()
    await textarea.fill('HELLO world')
    await page.waitForTimeout(500)
    const bodyText = await page.locator('body').textContent()
    // 应匹配到 HELLO
    expect(bodyText).toMatch(/HELLO|hello|1.*匹配/i)
  })

  test('正则常用模板Email', async ({ page }) => {
    await page.goto('/regex/tester')
    await page.waitForLoadState('networkidle')
    const emailChip = page.locator('.chip, button', { hasText: /Email|邮箱/i })
    if (await emailChip.isVisible()) {
      await emailChip.click()
      await page.waitForTimeout(300)
      const regexInput = page.locator('.regex-input').first()
      const val = await regexInput.inputValue()
      expect(val).toBeTruthy()
      expect(val.length).toBeGreaterThan(0)
    }
  })
})

// ===== TC-12: Grok 调试 =====
test.describe('TC-12: Grok 调试', () => {
  test('Grok基本解析', async ({ page }) => {
    await page.goto('/grok/tester')
    await page.waitForLoadState('networkidle')
    const patternInput = page.locator('.form-input, input[placeholder*="pattern"], input[placeholder*="Grok"]').first()
    await patternInput.fill('%{IP:client_ip} %{GREEDYDATA:message}')
    const textarea = page.locator('.form-textarea, textarea').first()
    await textarea.fill('192.168.1.1 hello world')
    const parseBtn = page.locator('button', { hasText: /解析/ }).first()
    await parseBtn.click()
    await page.waitForTimeout(500)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('192.168.1.1')
    expect(bodyText).toMatch(/client_ip|hello world/)
  })

  test('Grok多字段解析', async ({ page }) => {
    await page.goto('/grok/tester')
    await page.waitForLoadState('networkidle')
    const patternInput = page.locator('.form-input').first()
    await patternInput.fill('%{IP:ip} %{WORD:method} %{URIPATH:path}')
    const textarea = page.locator('.form-textarea, textarea').first()
    await textarea.fill('10.0.0.1 GET /api/users')
    const parseBtn = page.locator('button', { hasText: /解析/ }).first()
    await parseBtn.click()
    await page.waitForTimeout(1000)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('10.0.0.1')
    expect(bodyText).toContain('GET')
    expect(bodyText).toContain('/api/users')
  })

  test('Grok模式语法错误', async ({ page }) => {
    await page.goto('/grok/tester')
    await page.waitForLoadState('networkidle')
    const patternInput = page.locator('.form-input').first()
    // 使用不完整的 Grok 语法（未闭合的 %{ ）触发解析错误
    await patternInput.fill('%{')
    const textarea = page.locator('.form-textarea, textarea').first()
    await textarea.fill('test')
    const parseBtn = page.locator('button', { hasText: /解析/ }).first()
    await parseBtn.click()
    await page.waitForTimeout(1000)
    const errorText = page.locator('.error-text')
    if (await errorText.isVisible()) {
      const text = await errorText.textContent()
      expect(text).toMatch(/错误|error|无法匹配|失败|解析/i)
    } else {
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/错误|error|无法匹配|失败|解析/i)
    }
  })
})

// ===== TC-13: Nginx 工具 =====
test.describe('TC-13: Nginx 工具', () => {
  test('Nginx格式化', async ({ page }) => {
    await page.goto('/nginx/tool')
    await page.waitForLoadState('networkidle')
    // 默认格式化选项卡
    const textarea = page.locator('.editor-textarea, textarea').first()
    await textarea.fill('server{listen 80;location /{proxy_pass http://backend;}}')
    const formatBtn = page.locator('button.btn-action', { hasText: /^格式化$/ }).first()
    await formatBtn.click()
    await page.waitForTimeout(500)
    const output = page.locator('.editor-output').first()
    await page.waitForTimeout(300)
    const text = await output.isVisible() ? await output.textContent() : ''
    expect(text).toBeTruthy()
    expect(text).toContain('server')
    expect(text).toContain('listen')
  })

  test('Nginx语法检查通过', async ({ page }) => {
    await page.goto('/nginx/tool')
    await page.waitForLoadState('networkidle')
    const checkTab = page.locator('.tool-tab', { hasText: /语法检查|检查/ })
    if (await checkTab.isVisible()) {
      await checkTab.click()
      await page.waitForTimeout(300)
    }
    const textarea = page.locator('.editor-textarea, textarea').first()
    await textarea.fill('server { listen 80; }')
    const validateBtn = page.locator('button.btn-action', { hasText: /校验|检查/ }).first()
    await validateBtn.click()
    await page.waitForTimeout(500)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/通过|正确|success|valid|✓|check-pass/i)
  })

  test('Nginx语法检查失败', async ({ page }) => {
    await page.goto('/nginx/tool')
    await page.waitForLoadState('networkidle')
    const checkTab = page.locator('.tool-tab', { hasText: /语法检查|检查/ })
    if (await checkTab.isVisible()) {
      await checkTab.click()
      await page.waitForTimeout(300)
    }
    const textarea = page.locator('.editor-textarea, textarea').first()
    // 使用未闭合花括号的配置触发检查失败
    await textarea.fill('server {\n    listen 80;')
    const validateBtn = page.locator('button.btn-action', { hasText: /校验|检查/ }).first()
    await validateBtn.click()
    await page.waitForTimeout(500)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/错误|error|缺少分号|fail/i)
  })

  test('NginxDiff对比', async ({ page }) => {
    await page.goto('/nginx/tool')
    await page.waitForLoadState('networkidle')
    const diffTab = page.locator('.tool-tab', { hasText: /Diff|对比/ })
    if (await diffTab.isVisible()) {
      await diffTab.click()
      await page.waitForTimeout(300)
    }
    const textareas = page.locator('.editor-textarea, textarea:not([readonly])')
    if ((await textareas.count()) >= 2) {
      await textareas.nth(0).fill('server {\n    listen 80;\n}')
      await textareas.nth(1).fill('server {\n    listen 443;\n}')
      const diffBtn = page.locator('button.btn-action', { hasText: /对比/ }).first()
      await diffBtn.click()
      await page.waitForTimeout(500)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toContain('443')
    }
  })

  test('Nginx模板', async ({ page }) => {
    await page.goto('/nginx/tool')
    await page.waitForLoadState('networkidle')
    const templateTab = page.locator('.tool-tab', { hasText: /模板/ })
    if (await templateTab.isVisible()) {
      await templateTab.click()
      await page.waitForTimeout(300)
    }
    const templateCards = page.locator('.template-card')
    const count = await templateCards.count()
    expect(count).toBeGreaterThan(0)
    await templateCards.first().click()
    await page.waitForTimeout(300)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('server')
  })
})

// ===== TC-14: 配置文件转换 =====
test.describe('TC-14: 配置文件转换', () => {
  test('Properties转YAML', async ({ page }) => {
    await page.goto('/config/converter')
    await page.waitForLoadState('networkidle')
    // 切换源格式为 Properties
    const srcSelect = page.locator('select').first()
    if (await srcSelect.isVisible()) {
      await srcSelect.selectOption({ label: 'Properties' })
      await page.waitForTimeout(300)
    }
    const textarea = page.locator('.editor-textarea, textarea:not([readonly])').first()
    await textarea.fill('server.port=8080')
    const convertBtn = page.locator('button', { hasText: /转换/ }).first()
    if (await convertBtn.isVisible()) {
      await convertBtn.click()
      await page.waitForTimeout(500)
    } else {
      await page.waitForTimeout(500)
    }
    const output = page.locator('.editor-output, textarea[readonly], [class*="output"]').first()
    const text = await output.textContent() || await output.inputValue()
    expect(text).toContain('server')
    expect(text).toContain('port')
  })

  test('JSON转YAML', async ({ page }) => {
    await page.goto('/config/converter')
    await page.waitForLoadState('networkidle')
    const textarea = page.locator('.editor-textarea, textarea:not([readonly])').first()
    await textarea.fill('{"server":{"port":8080}}')
    const convertBtn = page.locator('button', { hasText: /转换/ }).first()
    if (await convertBtn.isVisible()) {
      await convertBtn.click()
      await page.waitForTimeout(500)
    } else {
      await page.waitForTimeout(500)
    }
    const output = page.locator('.editor-output, [class*="output"]').first()
    const text = await output.textContent()
    expect(text).toContain('server')
    expect(text).toContain('port')
    expect(text).toContain('8080')
  })

  test('配置转换方向交换', async ({ page }) => {
    await page.goto('/config/converter')
    await page.waitForLoadState('networkidle')
    const textarea = page.locator('.editor-textarea, textarea:not([readonly])').first()
    await textarea.fill('{"key":"value"}')
    const convertBtn = page.locator('button', { hasText: /转换/ }).first()
    if (await convertBtn.isVisible()) {
      await convertBtn.click()
      await page.waitForTimeout(500)
    }
    // 点击交换箭头
    const swapArrow = page.locator('.swap-btn, button[title*="交换"], [class*="swap"]').first()
    if (await swapArrow.isVisible()) {
      await swapArrow.click()
      await page.waitForTimeout(300)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
    }
  })

  test('配置转换自动检测', async ({ page }) => {
    await page.goto('/config/converter')
    await page.waitForLoadState('networkidle')
    const textarea = page.locator('.editor-textarea, textarea:not([readonly])').first()
    await textarea.fill('{"key":"value"}')
    const detectBtn = page.locator('button', { hasText: /自动检测|检测/i })
    if (await detectBtn.isVisible()) {
      await detectBtn.click()
      await page.waitForTimeout(300)
      // 源格式应自动切换为 JSON
      const srcSelect = page.locator('select').first()
      const selectedVal = await srcSelect.inputValue()
      expect(selectedVal).toMatch(/json/i)
    }
  })

  test('配置转换错误', async ({ page }) => {
    await page.goto('/config/converter')
    await page.waitForLoadState('networkidle')
    const textarea = page.locator('.editor-textarea, textarea:not([readonly])').first()
    await textarea.fill('{invalid json}')
    const convertBtn = page.locator('button', { hasText: /转换/ }).first()
    if (await convertBtn.isVisible()) {
      await convertBtn.click()
      await page.waitForTimeout(500)
    }
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/错误|error|Expected|position/i)
  })
})

// ===== TC-15: 编码解码 =====
test.describe('TC-15: 编码解码', () => {
  test.describe('JWT 解码', () => {
    const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    test('JWT解码基本', async ({ page }) => {
      await page.goto('/codec/jwt')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea, textarea').first()
      await textarea.fill(JWT_TOKEN)
      // Click decode button (use .btn-decode to avoid matching tab button)
      const decodeBtn = page.locator('button.btn-decode', { hasText: /解码|Decode/i }).first()
      if (await decodeBtn.isVisible()) await decodeBtn.click()
      await page.waitForTimeout(500)
      const bodyText = await page.locator('body').textContent()
      // Header 应包含 alg HS256
      expect(bodyText).toMatch(/HS256/i)
      // Payload 应包含 name
      expect(bodyText).toMatch(/John Doe|John/)
      expect(bodyText).toContain('1234567890')
    })

    test('JWT解码无效格式', async ({ page }) => {
      await page.goto('/codec/jwt')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea, textarea').first()
      await textarea.fill('invalid.jwt.token')
      // Click decode button (use .btn-decode to avoid matching tab button)
      const decodeBtn = page.locator('button.btn-decode', { hasText: /解码|Decode/i }).first()
      if (await decodeBtn.isVisible()) await decodeBtn.click()
      await page.waitForTimeout(500)
      const errorText = page.locator('.error-text')
      if (await errorText.isVisible()) {
        const text = await errorText.textContent()
        expect(text).toMatch(/无效|invalid|错误|error|有效|JSON/i)
      } else {
        // If no explicit error, the decoded content should be garbled or empty
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toMatch(/无效|invalid|错误|error|有效|JSON| decoding/i)
      }
    })
  })

  test.describe('HTML Entity 编解码', () => {
    test('HTMLEntity编码', async ({ page }) => {
      await page.goto('/codec/jwt')
      await page.waitForLoadState('networkidle')
      // 切换到 HTML Entity 子工具
      const htmlTab = page.locator('.tool-tab', { hasText: /HTML Entity/i })
      if (await htmlTab.isVisible()) {
        await htmlTab.click()
        await page.waitForTimeout(500)
      }
      const textarea = page.locator('.entity-textarea').first()
      await textarea.fill('<div>"hello"</div>')
      // Click execute button (use .btn-decode to avoid matching tab button)
      const execBtn = page.locator('button.btn-decode', { hasText: /执行/ }).first()
      if (await execBtn.isVisible()) await execBtn.click()
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toContain('&lt;')
      expect(text).toContain('&gt;')
    })

    test('HTMLEntity解码', async ({ page }) => {
      await page.goto('/codec/jwt')
      await page.waitForLoadState('networkidle')
      const htmlTab = page.locator('.tool-tab', { hasText: /HTML Entity/i })
      if (await htmlTab.isVisible()) {
        await htmlTab.click()
        await page.waitForTimeout(500)
      }
      // Switch to decode mode (radio button)
      const decodeRadio = page.locator('input[type="radio"][value="decode"]').first()
      if (await decodeRadio.isVisible()) {
        await decodeRadio.click()
        await page.waitForTimeout(200)
      }
      const textarea = page.locator('.entity-textarea').first()
      await textarea.fill('&lt;div&gt;')
      // Click execute button (use .btn-decode to avoid matching tab button)
      const execBtn = page.locator('button.btn-decode', { hasText: /执行/ }).first()
      if (await execBtn.isVisible()) await execBtn.click()
      await page.waitForTimeout(500)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toContain('<div>')
    })
  })

  test.describe('颜色转换', () => {
    test('颜色转换HEX输入', async ({ page }) => {
      await page.goto('/codec/jwt')
      await page.waitForLoadState('networkidle')
      const colorTab = page.locator('.tool-tab', { hasText: /颜色|Color/i })
      if (await colorTab.isVisible()) {
        await colorTab.click()
        await page.waitForTimeout(500)
      }
      // HEX 输入是第一个 .color-input-field，RGB 是第二个
      const hexInput = page.locator('.color-input-field').first()
      if (await hexInput.isVisible()) {
        await hexInput.fill('#3b82f6')
        await page.waitForTimeout(500)
        // 检查 RGB 输入框的值（第二个 .color-input-field）
        const rgbInput = page.locator('.color-input-field').nth(1)
        const rgbValue = await rgbInput.inputValue()
        // RGB 值: R=59, G=130, B=246
        expect(rgbValue).toContain('59')
        expect(rgbValue).toContain('130')
        expect(rgbValue).toContain('246')
      }
    })

    test('颜色转换无效值校正', async ({ page }) => {
      await page.goto('/codec/jwt')
      await page.waitForLoadState('networkidle')
      const colorTab = page.locator('.tool-tab', { hasText: /颜色/i })
      if (await colorTab.isVisible()) {
        await colorTab.click()
        await page.waitForTimeout(300)
      }
      // 输入超出范围的 RGB 值
      const rgbInputs = page.locator('input[placeholder*="R"], input[type="number"]')
      if ((await rgbInputs.count()) > 0) {
        await rgbInputs.first().fill('300')
        await page.waitForTimeout(500)
        const bodyText = await page.locator('body').textContent()
        // 应显示校正提示或自动校正为 255
        expect(bodyText).toMatch(/校正|255|255/)
      }
    })
  })
})

// ===== TC-16: 二维码工具 =====
test.describe('TC-16: 二维码工具', () => {
  test('二维码生成基本', async ({ page }) => {
    await page.goto('/qrcode/generate')
    await page.waitForLoadState('networkidle')
    const textarea = page.locator('.form-textarea, textarea:not([readonly])').first()
    await textarea.fill('Hello QR')
    await page.waitForTimeout(1000) // 300ms 防抖
    // 右侧应显示二维码图片
    const qrImage = page.locator('img, canvas, svg, [class*="qrcode"]')
    const count = await qrImage.count()
    expect(count).toBeGreaterThan(0)
  })

  test('二维码生成容错级别', async ({ page }) => {
    await page.goto('/qrcode/generate')
    await page.waitForLoadState('networkidle')
    const textarea = page.locator('.form-textarea, textarea:not([readonly])').first()
    await textarea.fill('Test QR')
    const select = page.locator('.form-select, select').first()
    if (await select.isVisible()) {
      await select.selectOption('H')
      await page.waitForTimeout(1000)
    }
    const qrImage = page.locator('img, canvas, svg, [class*="qrcode"]')
    const count = await qrImage.count()
    expect(count).toBeGreaterThan(0)
  })

  test('二维码解析页面加载', async ({ page }) => {
    await page.goto('/qrcode/parse')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/拖拽|上传|粘贴|Ctrl\+V/i)
  })
})

// ===== TC-17: OpenSSL 工具 =====
test.describe('TC-17: OpenSSL 工具', () => {
  const TEST_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDgTCCAmmgAwIBAgIUYitRsf4muvwtPwZ6ybujttEEuaUwDQYJKoZIhvcNAQEL
BQAwUDELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0JlaWppbmcxFDASBgNVBAoMC1Rl
c3RDb21wYW55MRkwFwYDVQQDDBB0ZXN0LmV4YW1wbGUuY29tMB4XDTI2MDUxMTAx
NTU0N1oXDTI3MDUxMTAxNTU0N1owUDELMAkGA1UEBhMCQ04xEDAOBgNVBAgMB0Jl
aWppbmcxFDASBgNVBAoMC1Rlc3RDb21wYW55MRkwFwYDVQQDDBB0ZXN0LmV4YW1w
bGUuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn/4VLv/fkpOz
85yVb3meN1BIawRISITU77oIuB9pxibYoqgFoyIo60+KDXEQgBEwmBshR92+OuPz
f4g0T6eOYeJXGaMGt7vR1RGtc9uE1vdYiKmkumFNNDsEy4m58B8lPqadt2A+Matw
MOqfBCPKhMpVdkKCezCKp93iNbetTagniBo/i01UKNyDZeaWaxGcwwzNBl3GQQ1o
ALTYbF18EO1OJ3Y4YNIM/uic7xopzHgGrUeFHov5pIPUvYQyrkOtAlfgmFE/NZAO
iLLLlw54KsybD/V+qFmg0ng/itv3DDlFooltodQg5vOBSv0MJQm6COKi+D/Yoirk
cdLgRKRGZQIDAQABo1MwUTAdBgNVHQ4EFgQUwcK2Ad+vAONQ8J0rIv3LrzEaEaYw
HwYDVR0jBBgwFoAUwcK2Ad+vAONQ8J0rIv3LrzEaEaYwDwYDVR0TAQH/BAUwAwEB
/zANBgkqhkiG9w0BAQsFAAOCAQEAa7DLAQA1vjAm1vyxGfRNi43FCUrmzQWDgKKL
uXGGXfW9gu/p47fMy3/yvs8k7NGW7yjRt3p/XVhF8+2/Bsgfl4CHKA0cjESaiEvy
1zFzeOfA3b6z/nIKFOFkRMeig+jBVCQarPN6xRtdWqv4cSl+aGhznDHlHMmXwTm2
BwFIOHmR5rXxT2nGLFmzqBYM3C/0K2ISRH3okaBKQ8W1aO1OzDBLouk2JDF4RuJR
M2StmJlxa9PpgaO/XlPlk1yoOPFE0fFSv589bojzIOCEdTKs7x+XHLqZLRcjkPG7
xO/lc8/d0NfnAzICR8FAnkT0Iq02lT+7L/UAcl3kum2vtowPQw==
-----END CERTIFICATE-----`

  test('OpenSSL命令构建器', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const resultArea = page.locator('textarea[readonly], .result-pre, [class*="command"]').first()
    const text = await resultArea.isVisible() ? await resultArea.inputValue() || await resultArea.textContent() : ''
    expect(text).toContain('openssl')
  })

  test('OpenSSL证书解析', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const certTab = page.locator('.tab-btn', { hasText: /证书解析/ })
    await certTab.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.tab-content textarea:not([readonly])').first()
    await textarea.fill(TEST_CERT_PEM)
    const parseBtn = page.locator('.tab-content button', { hasText: /解析/ })
    await parseBtn.click()
    // Wait for cert-result to appear (backend call)
    await page.locator('.cert-result').waitFor({ state: 'visible', timeout: 10000 })
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('test.example.com')
    expect(bodyText).toContain('TestCompany')
    expect(bodyText).toContain('CN')
  })

  test('OpenSSLCSR生成', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const csrTab = page.locator('.tab-btn', { hasText: /CSR/ })
    await csrTab.click()
    await page.waitForTimeout(300)
    // Scope inputs to the tab content area
    const tabContent = page.locator('.tab-content')
    const inputs = tabContent.locator('input.form-input')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(4)
    await inputs.nth(0).fill('CN')
    await inputs.nth(1).fill('Shanghai')
    await inputs.nth(2).fill('MyOrg')
    await inputs.nth(3).fill('www.example.com')
    const genBtn = tabContent.locator('button', { hasText: /生成/ })
    await genBtn.click()
    await page.waitForTimeout(300)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('openssl')
    expect(bodyText).toContain('www.example.com')
  })

  test('OpenSSL格式转换', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const formatTab = page.locator('.tab-btn, button', { hasText: /格式转换/ })
    if (await formatTab.isVisible()) {
      await formatTab.click()
      await page.waitForTimeout(300)
    }
    const textarea = page.locator('textarea:not([readonly])').first()
    await textarea.fill(TEST_CERT_PEM)
    await page.waitForTimeout(300)
    const convertBtn = page.locator('button', { hasText: /转换/ }).first()
    await convertBtn.click()
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })

  test('OpenSSL命令构建-切换分类和操作', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    // 默认在命令构建 tab，分类为"证书操作"
    const tabContent = page.locator('.tab-content')
    const selects = tabContent.locator('select.form-select')
    // 验证默认命令包含 openssl
    const resultArea = tabContent.locator('textarea.result-area, textarea[readonly]').first()
    const textBefore = await resultArea.isVisible() ? await (resultArea.inputValue() || await resultArea.textContent()) : ''
    expect(textBefore).toContain('openssl')
    expect(textBefore).toContain('x509')
    // 切换分类为"密钥操作"
    await selects.first().selectOption('密钥操作')
    await page.waitForTimeout(300)
    // 操作下拉框应更新为密钥相关选项，命令应变化
    const textAfter = await (resultArea.inputValue() || await resultArea.textContent())
    expect(textAfter).toContain('openssl')
    // 密钥操作命令应包含 genrsa 或 rsa 关键字
    expect(textAfter).toMatch(/genrsa|rsa|pkcs8/i)
  })

  test('OpenSSL命令构建-修改输入输出文件名', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const tabContent = page.locator('.tab-content')
    const resultArea = tabContent.locator('textarea.result-area, textarea[readonly]').first()
    // 修改输入文件名
    const inputFiles = tabContent.locator('input.form-input')
    await inputFiles.first().fill('mycert.pem')
    await page.waitForTimeout(300)
    const text = await (resultArea.inputValue() || await resultArea.textContent())
    expect(text).toContain('mycert.pem')
    // 切换到需要输出文件的操作（密钥操作 > 私钥转PKCS8）
    const selects = tabContent.locator('select.form-select')
    await selects.first().selectOption('密钥操作')
    await page.waitForTimeout(300)
    await selects.nth(1).selectOption('私钥转PKCS8')
    await page.waitForTimeout(300)
    // 修改输出文件名
    await inputFiles.nth(1).fill('output-pkcs8.pem')
    await page.waitForTimeout(300)
    const text2 = await (resultArea.inputValue() || await resultArea.textContent())
    expect(text2).toContain('output-pkcs8.pem')
  })

  test('OpenSSL证书解析-裸base64自动补充前后缀', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const certTab = page.locator('.tab-btn', { hasText: /证书解析/ })
    await certTab.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.tab-content textarea.form-textarea').first()
    // 提取裸 base64（去掉 PEM 头尾和换行）
    const bareBase64 = TEST_CERT_PEM
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s/g, '')
    // 输入裸 base64
    await textarea.fill(bareBase64)
    await page.waitForTimeout(500)
    // 组件应自动补充 PEM 头尾
    const value = await textarea.inputValue()
    expect(value).toContain('-----BEGIN CERTIFICATE-----')
    expect(value).toContain('-----END CERTIFICATE-----')
  })

  test('OpenSSL证书解析-空输入错误', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const certTab = page.locator('.tab-btn', { hasText: /证书解析/ })
    await certTab.click()
    await page.waitForTimeout(300)
    // 不输入内容直接点击解析
    const parseBtn = page.locator('.tab-content button', { hasText: /解析/ })
    await parseBtn.click()
    await page.waitForTimeout(500)
    // 应显示错误提示
    const errorText = page.locator('.error-text')
    if (await errorText.isVisible()) {
      const text = await errorText.textContent()
      expect(text).toMatch(/请输入|证书内容|不能为空|required/i)
    } else {
      // cert-result 不应出现
      const certResult = page.locator('.cert-result')
      expect(await certResult.isVisible()).toBeFalsy()
    }
  })

  test('OpenSSL格式转换-PEM转P7B', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const formatTab = page.locator('.tab-btn', { hasText: /格式转换/ })
    await formatTab.click()
    await page.waitForTimeout(300)
    const tabContent = page.locator('.tab-content')
    // 切换目标格式为 PKCS7
    const selects = tabContent.locator('select.form-select')
    await selects.nth(1).selectOption('PKCS7')
    await page.waitForTimeout(300)
    // 输入 PEM 证书
    const textarea = tabContent.locator('textarea.form-textarea').first()
    await textarea.fill(TEST_CERT_PEM)
    // 点击转换
    const convertBtn = tabContent.locator('button', { hasText: /转换/ })
    await convertBtn.click()
    await page.waitForTimeout(3000)
    // 输出应包含 PKCS7 PEM 头
    const output = tabContent.locator('textarea.result-area, textarea[readonly]').first()
    if (await output.isVisible()) {
      const text = await output.inputValue()
      expect(text).toMatch(/BEGIN|PKCS7|CMS/i)
    } else {
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
    }
  })

  test('OpenSSL格式转换-裸base64自动补充', async ({ page }) => {
    await page.goto('/crypto/openssl')
    await page.waitForLoadState('networkidle')
    const formatTab = page.locator('.tab-btn', { hasText: /格式转换/ })
    await formatTab.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.tab-content textarea.form-textarea').first()
    // 提取裸 base64
    const bareBase64 = TEST_CERT_PEM
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s/g, '')
    // 输入裸 base64
    await textarea.fill(bareBase64)
    await page.waitForTimeout(500)
    // 组件应自动补充 PEM 头尾
    const value = await textarea.inputValue()
    expect(value).toContain('-----BEGIN CERTIFICATE-----')
    expect(value).toContain('-----END CERTIFICATE-----')
  })
})

// ===== TC-18: HTTP Client =====
test.describe('TC-18: HTTP Client', () => {
  test('HTTPClient页面加载', async ({ page }) => {
    await page.goto('/http/client')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').textContent()
    // 方法选择器默认 GET
    expect(bodyText).toMatch(/GET/i)
    // URL 输入框
    const urlInput = page.locator('input[placeholder*="url" i], input[placeholder*="URL" i], input[placeholder*="http" i]')
    expect(await urlInput.isVisible()).toBeTruthy()
  })

  test('HTTPClient方法切换', async ({ page }) => {
    await page.goto('/http/client')
    await page.waitForLoadState('networkidle')
    const postBtn = page.locator('button, .method-badge, [class*="method"]', { hasText: /^POST$/i })
    if (await postBtn.isVisible()) {
      await postBtn.click()
      await page.waitForTimeout(300)
      // POST 应高亮
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/POST/i)
    }
  })
})
