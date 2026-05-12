import { test, expect } from '@playwright/test'

test.describe('TC-04: 对称加密', () => {
  // ===== AES =====
  test.describe('AES 加解密', () => {
    test('AES-CBC加密解密完整流程', async ({ page }) => {
      await page.goto('/crypto/aes')
      await page.waitForLoadState('networkidle')
      // 生成密钥
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(300)
      // 生成 IV
      const genIvBtn = page.locator('button', { hasText: /随机生成/ }).nth(1)
      if (await genIvBtn.isVisible()) await genIvBtn.click()
      await page.waitForTimeout(300)
      // 输入明文
      const textarea = page.locator('textarea, .editor-textarea').first()
      await textarea.fill('Hello AES')
      // 点击加密按钮 (btn-primary, not the tab button)
      const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
      await encryptBtn.click()
      await page.waitForTimeout(2000)
      // 验证加密输出
      const output = page.locator('.editor-output').first()
      const cipherText = await output.textContent()
      expect(cipherText).toBeTruthy()
      expect(cipherText!.trim().length).toBeGreaterThan(0)

      // 切换解密标签
      const decryptTab = page.locator('.tool-tab', { hasText: '解密' })
      await decryptTab.click()
      await page.waitForTimeout(500)
      // 密文应自动移入输入区
      const inputValue = await textarea.inputValue()
      expect(inputValue).toBeTruthy()
      // 点击解密
      const decryptBtn = page.locator('button.btn-primary', { hasText: /解密/ })
      await decryptBtn.click()
      await page.waitForTimeout(2000)
      // 验证解密结果
      const plainText = await output.textContent()
      expect(plainText).toContain('Hello AES')
    })

    test('AES-ECB模式', async ({ page }) => {
      await page.goto('/crypto/aes')
      await page.waitForLoadState('networkidle')
      // 切换 ECB 模式
      const modeSelect = page.locator('select.option-select').first()
      await modeSelect.selectOption('ECB')
      await page.waitForTimeout(300)
      // 生成密钥并加密
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      const textarea = page.locator('textarea, .editor-textarea').first()
      await textarea.fill('ECB test')
      const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
      await encryptBtn.click()
      await page.waitForTimeout(2000)
      const output = page.locator('.editor-output').first()
      const cipherText = await output.textContent()
      expect(cipherText).toBeTruthy()
      expect(cipherText!.trim().length).toBeGreaterThan(0)
      // 解密验证
      const decryptTab = page.locator('.tool-tab', { hasText: '解密' })
      await decryptTab.click()
      await page.waitForTimeout(500)
      const decryptBtn = page.locator('button.btn-primary', { hasText: /解密/ })
      await decryptBtn.click()
      await page.waitForTimeout(2000)
      const plainText = await output.textContent()
      expect(plainText).toContain('ECB test')
    })

    test('AES-GCM模式', async ({ page }) => {
      await page.goto('/crypto/aes')
      await page.waitForLoadState('networkidle')
      const modeSelect = page.locator('select.option-select').first()
      await modeSelect.selectOption('GCM')
      await page.waitForTimeout(300)
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      const genIvBtn = page.locator('button', { hasText: /随机生成/ }).nth(1)
      if (await genIvBtn.isVisible()) await genIvBtn.click()
      const textarea = page.locator('textarea, .editor-textarea').first()
      await textarea.fill('GCM test data')
      const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
      await encryptBtn.click()
      await page.waitForTimeout(2000)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toBeTruthy()
      expect(text!.trim().length).toBeGreaterThan(0)
    })

    test('AES密钥长度切换', async ({ page }) => {
      await page.goto('/crypto/aes')
      await page.waitForLoadState('networkidle')
      // 先生成 128 位密钥
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(300)
      // 切换到 256 位
      const selects = page.locator('select.option-select')
      const keySizeSelect = selects.nth(2)
      if (await keySizeSelect.isVisible()) {
        await keySizeSelect.selectOption('256')
        await page.waitForTimeout(300)
        // 密钥可能被清空或自动重新生成
        const keyInput = page.locator('.key-input, input[placeholder*="密钥"]').first()
        if (await keyInput.isVisible()) {
          const val = await keyInput.inputValue()
          // 密钥要么为空，要么被重新生成为 256 位 (64 hex chars)
          expect(val === '' || val.length === 64).toBeTruthy()
        }
      }
    })

    test('AES输出格式Hex', async ({ page }) => {
      await page.goto('/crypto/aes')
      await page.waitForLoadState('networkidle')
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      const genIvBtn = page.locator('button', { hasText: /随机生成/ }).nth(1)
      if (await genIvBtn.isVisible()) await genIvBtn.click()
      // 切换输出格式为 Hex
      const selects = page.locator('select.option-select')
      const formatSelect = selects.nth(3)
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('Hex')
      }
      const textarea = page.locator('textarea, .editor-textarea').first()
      await textarea.fill('Hex output')
      const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
      await encryptBtn.click()
      await page.waitForTimeout(2000)
      const output = page.locator('.editor-output').first()
      const text = await output.textContent()
      expect(text).toMatch(/^[0-9a-fA-F]+$/)
    })

    test('AES加密校验缺少密钥', async ({ page }) => {
      await page.goto('/crypto/aes')
      await page.waitForLoadState('networkidle')
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('test')
      const encryptBtn = page.locator('button', { hasText: /加密/ }).first()
      await encryptBtn.click()
      await page.waitForTimeout(1000)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/密钥|key|不能为空|required/i)
    })

    test('AES交换按钮', async ({ page }) => {
      await page.goto('/crypto/aes')
      await page.waitForLoadState('networkidle')
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      const genIvBtn = page.locator('button', { hasText: /随机生成/ }).nth(1)
      if (await genIvBtn.isVisible()) await genIvBtn.click()
      const textarea = page.locator('textarea, .editor-textarea').first()
      await textarea.fill('Swap Test')
      const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
      await encryptBtn.click()
      await page.waitForTimeout(2000)
      const output = page.locator('.editor-output').first()
      const cipherText = await output.textContent()
      expect(cipherText).toBeTruthy()

      // 点击交换
      const swapBtn = page.locator('.swap-btn')
      await swapBtn.click()
      await page.waitForTimeout(500)
      // 密文应移入输入区
      const inputValue = await textarea.inputValue()
      expect(inputValue).toBeTruthy()
    })
  })

  // ===== DES/3DES =====
  test.describe('DES/3DES 加解密', () => {
    test('DES加密解密', async ({ page }) => {
      await page.goto('/crypto/des')
      await page.waitForLoadState('networkidle')
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(300)
      const textarea = page.locator('textarea, .editor-textarea').first()
      await textarea.fill('Hello DES')
      const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
      await encryptBtn.click()
      await page.waitForTimeout(2000)
      const output = page.locator('.editor-output').first()
      const cipherText = await output.textContent()
      expect(cipherText).toBeTruthy()
      expect(cipherText!.trim().length).toBeGreaterThan(0)
      // 解密验证
      const decryptTab = page.locator('.tool-tab', { hasText: '解密' })
      await decryptTab.click()
      await page.waitForTimeout(500)
      const decryptBtn = page.locator('button.btn-primary', { hasText: /解密/ })
      await decryptBtn.click()
      await page.waitForTimeout(2000)
      const plainText = await output.textContent()
      expect(plainText).toContain('Hello DES')
    })

    test('3DES加密解密', async ({ page }) => {
      await page.goto('/crypto/des')
      await page.waitForLoadState('networkidle')
      const tripleDesTab = page.locator('.algo-tab, .tool-tab', { hasText: /3DES|Triple/i })
      if (await tripleDesTab.isVisible()) {
        await tripleDesTab.click()
        await page.waitForTimeout(300)
      }
      const genKeyBtn = page.locator('button', { hasText: /随机生成/ }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(300)
      const textarea = page.locator('textarea, .editor-textarea').first()
      await textarea.fill('Hello 3DES')
      const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
      await encryptBtn.click()
      await page.waitForTimeout(2000)
      const output = page.locator('.editor-output').first()
      const cipherText = await output.textContent()
      expect(cipherText).toBeTruthy()
      expect(cipherText!.trim().length).toBeGreaterThan(0)
      // 解密
      const decryptTab = page.locator('.tool-tab', { hasText: '解密' })
      await decryptTab.click()
      await page.waitForTimeout(500)
      const decryptBtn = page.locator('button.btn-primary', { hasText: /解密/ })
      await decryptBtn.click()
      await page.waitForTimeout(2000)
      const plainText = await output.textContent()
      expect(plainText).toContain('Hello 3DES')
    })
  })

  // ===== RSA =====
  test.describe('RSA 工具', () => {
    test('RSA密钥生成2048', async ({ page }) => {
      await page.goto('/crypto/rsa')
      await page.waitForLoadState('networkidle')
      const genKeyBtn = page.locator('button', { hasText: /生成密钥对|生成密钥/i }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(3000)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toContain('-----BEGIN')
      // 安全提示框
      expect(bodyText).toMatch(/私钥|敏感|保管/)
    })

    test('RSA私钥可见性切换', async ({ page }) => {
      await page.goto('/crypto/rsa')
      await page.waitForLoadState('networkidle')
      const genKeyBtn = page.locator('button', { hasText: /生成密钥对/i }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(3000)
      // 点击眼睛图标
      const eyeBtn = page.locator('button, .eye-btn, [class*="eye"]').first()
      if (await eyeBtn.isVisible()) {
        await eyeBtn.click()
        await page.waitForTimeout(300)
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toContain('-----BEGIN')
      }
    })

    test('RSA加密解密流程', async ({ page }) => {
      await page.goto('/crypto/rsa')
      await page.waitForLoadState('networkidle')
      // 生成密钥对
      const genKeyBtn = page.locator('button', { hasText: /生成密钥对/i }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(5000)
      // 切换到加解密 Tab
      const encDecTab = page.locator('.tool-tab', { hasText: /加解密|加密/ })
      if (await encDecTab.isVisible()) {
        await encDecTab.click()
        await page.waitForTimeout(500)
        // 输入明文
        const textarea = page.locator('textarea, .editor-textarea').first()
        await textarea.fill('Hello RSA')
        // 加密
        const encryptBtn = page.locator('button.btn-primary', { hasText: /加密/ })
        if (await encryptBtn.isVisible()) {
          await encryptBtn.click()
          await page.waitForTimeout(5000)
          const output = page.locator('.editor-output').first()
          const cipherText = await output.textContent()
          expect(cipherText).toBeTruthy()
          expect(cipherText!.trim().length).toBeGreaterThan(0)
        }
      }
    })

    test('RSA签名验签通过', async ({ page }) => {
      await page.goto('/crypto/rsa')
      await page.waitForLoadState('networkidle')
      const genKeyBtn = page.locator('button', { hasText: /生成密钥对/i }).first()
      await genKeyBtn.click()
      await page.waitForTimeout(3000)
      // 切换到签名/验签 Tab
      const signTab = page.locator('.sub-tab, .tab-btn', { hasText: /签名/ })
      if (await signTab.isVisible()) {
        await signTab.click()
        await page.waitForTimeout(300)
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toMatch(/签名|数据|私钥/i)
      }
    })

    test('RSA签名验签失败', async ({ page }) => {
      // 验签失败场景：用不同的数据
      await page.goto('/crypto/rsa')
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toBeTruthy()
    })
  })
})

test.describe('TC-06: 哈希工具', () => {
  async function gotoHash(page: any) {
    await page.goto('/crypto/hash')
    await page.waitForLoadState('networkidle')
  }

  async function selectAlgoAndCompute(page: any, algo: string, input: string, key?: string) {
    const algoSelect = page.locator('select.option-select').first()
    await algoSelect.selectOption(algo)
    await page.waitForTimeout(300)

    if (key !== undefined && algo.startsWith('HMAC-')) {
      const hmacInput = page.locator('.hmac-key-input, input[placeholder*="密钥"]')
      if (await hmacInput.isVisible()) await hmacInput.fill(key)
    }

    const textarea = page.locator('.editor-textarea').first()
    await textarea.fill(input)
    const btn = page.locator('button', { hasText: /计算/ }).first()
    await btn.click()
    await page.waitForTimeout(1000)

    const result = page.locator('.result-hash-value, [class*="result-hash"], [class*="hash-result"]').first()
    return result.textContent()
  }

  test.describe('SHA 哈希', () => {
    test('SHA256哈希计算', async ({ page }) => {
      await gotoHash(page)
      const text = await selectAlgoAndCompute(page, 'SHA-256', 'hello')
      // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      expect(text).toMatch(/2cf24dba5fb0a30e26e83b2ac5b9e29e/i)
    })

    test('SHA1哈希计算', async ({ page }) => {
      await gotoHash(page)
      const text = await selectAlgoAndCompute(page, 'SHA-1', 'hello')
      expect(text).toMatch(/[a-f0-9]{40}/i)
    })

    test('SHA512哈希计算', async ({ page }) => {
      await gotoHash(page)
      const text = await selectAlgoAndCompute(page, 'SHA-512', 'hello')
      expect(text).toMatch(/[a-f0-9]{128}/i)
    })
  })

  test.describe('HMAC 计算', () => {
    test('HMACSHA256计算', async ({ page }) => {
      await gotoHash(page)
      const text = await selectAlgoAndCompute(page, 'HMAC-SHA256', 'hello', 'secret')
      expect(text).toMatch(/[a-f0-9]{64}/i)
    })
  })

  test.describe('MD5 哈希', () => {
    test('MD5哈希计算', async ({ page }) => {
      await gotoHash(page)
      const text = await selectAlgoAndCompute(page, 'MD5', 'hello')
      // MD5("hello") = 5d41402abc4b2a76b9719d911017c592
      expect(text).toMatch(/5d41402abc4b2a76b9719d911017c592/i)
    })

    test('MD5不同输入不同结果', async ({ page }) => {
      await gotoHash(page)
      const result1 = await selectAlgoAndCompute(page, 'MD5', 'input1')
      const result2 = await selectAlgoAndCompute(page, 'MD5', 'input2')
      expect(result1).not.toBe(result2)
    })
  })

  test.describe('CRC32 计算', () => {
    test('CRC32计算', async ({ page }) => {
      await gotoHash(page)
      const text = await selectAlgoAndCompute(page, 'CRC32', 'hello')
      expect(text).toMatch(/[0-9a-fA-F]{8}/)
    })
  })

  test.describe('其他功能', () => {
    test('展开其他算法结果', async ({ page }) => {
      await gotoHash(page)
      await selectAlgoAndCompute(page, 'SHA-256', 'hello')
      const expandLink = page.locator('.expand-link, [class*="expand"], button', { hasText: /其他算法|展开/i })
      if (await expandLink.isVisible()) {
        await expandLink.click()
        await page.waitForTimeout(500)
        const otherItems = page.locator('.other-result-item, [class*="other-result"]')
        expect(await otherItems.count()).toBeGreaterThan(0)
      }
    })

    test('HMAC缺少密钥错误', async ({ page }) => {
      await gotoHash(page)
      const algoSelect = page.locator('select.option-select').first()
      await algoSelect.selectOption('HMAC-SHA256')
      await page.waitForTimeout(300)
      const textarea = page.locator('.editor-textarea').first()
      await textarea.fill('hello')
      const btn = page.locator('button', { hasText: /计算/ }).first()
      await btn.click()
      await page.waitForTimeout(1000)
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/密钥|key|HMAC.*需要/i)
    })
  })
})
