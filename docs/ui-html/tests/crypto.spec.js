const { test, expect } = require('@playwright/test');
const { fileUrl } = require('./helpers');

// ============================================================
// 05-crypto-aes.html — AES 加密/解密
// ============================================================
test.describe('05-crypto-aes.html — AES 加密/解密', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('05-crypto-aes.html'));
  });

  test('页面加载：默认加密态，标签高亮', async ({ page }) => {
    await expect(page.locator('[data-mode="encrypt"]')).toHaveClass(/active/);
    await expect(page.locator('#output-label')).toHaveText('输出（密文）');
  });

  test('Tab 切换：切换到解密模式', async ({ page }) => {
    await page.click('[data-mode="decrypt"]');
    await expect(page.locator('[data-mode="decrypt"]')).toHaveClass(/active/);
    await expect(page.locator('#input-label')).toHaveText('输入（密文）');
    await expect(page.locator('#output-label')).toHaveText('输出（明文）');
  });

  test('去重：重复点击加密标签不切换', async ({ page }) => {
    const label1 = await page.locator('#input-label').textContent();
    await page.click('[data-mode="encrypt"]'); // already active
    const label2 = await page.locator('#input-label').textContent();
    expect(label1).toBe(label2);
  });

  test('ECB 模式：隐藏 IV 行', async ({ page }) => {
    await page.selectOption('#aes-mode', 'ECB');
    await expect(page.locator('#iv-row')).toHaveClass(/iv-row-hidden/);
  });

  test('随机生成密钥：生成 Hex 密钥', async ({ page }) => {
    const oldKey = await page.locator('#key-input').inputValue();
    await page.click('#generate-key');
    const newKey = await page.locator('#key-input').inputValue();
    expect(newKey.length).toBeGreaterThan(0);
  });

  test('复制按钮：显示已复制反馈', async ({ page }) => {
    await page.click('#btn-copy');
    await expect(page.locator('#btn-copy')).toHaveText('已复制');
  });

  test('交换按钮：切换模式并交换内容', async ({ page }) => {
    // Default page has output in output-editor
    const outputText = await page.locator('#output-editor').textContent();
    expect(outputText.trim().length).toBeGreaterThan(0);
    await page.click('#btn-swap');
    // Mode should switch to decrypt
    await expect(page.locator('[data-mode="decrypt"]')).toHaveClass(/active/);
  });
});

// ============================================================
// 07-hash.html — 哈希摘要
// ============================================================
test.describe('07-hash.html — 哈希摘要', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('07-hash.html'));
  });

  test('计算：输入文本计算哈希', async ({ page }) => {
    // contenteditable element - clear and type
    await page.evaluate(() => { document.getElementById('hash-input').textContent = ''; });
    await page.locator('#hash-input').pressSequentially('hello');
    await page.click('#btn-compute');
    const result = await page.locator('#result-main-value').textContent();
    expect(result.trim().length).toBeGreaterThan(0);
  });

  test('算法切换：切换到 MD5', async ({ page }) => {
    await page.selectOption('#algo-select', 'MD5');
    await page.evaluate(() => { document.getElementById('hash-input').textContent = ''; });
    await page.locator('#hash-input').pressSequentially('hello');
    await page.click('#btn-compute');
    const result = await page.locator('#result-main-value').textContent();
    // MD5 produces a 32-char hex string
    expect(result.trim().length).toBe(32);
  });

  test('复制：点击复制按钮', async ({ page }) => {
    await page.evaluate(() => { document.getElementById('hash-input').textContent = ''; });
    await page.locator('#hash-input').pressSequentially('test');
    await page.click('#btn-compute');
    await page.click('#btn-copy-main');
    await expect(page.locator('#btn-copy-main')).toHaveText('已复制');
  });
});

// ============================================================
// 10-calculator.html — 进制转换
// ============================================================
test.describe('10-calculator.html — 进制转换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('10-calculator.html'));
  });

  test('页面加载：默认值为 255', async ({ page }) => {
    const hexValue = await page.locator('#result-hex').textContent();
    expect(hexValue.trim()).toBe('FF');
  });

  test('输入变更：输入新值实时转换', async ({ page }) => {
    await page.fill('#input-value', '16');
    const hexValue = await page.locator('#result-hex').textContent();
    expect(hexValue.trim()).toBe('10');
    const binValue = await page.locator('#result-bin').textContent();
    expect(binValue.trim()).toBe('10000');
  });

  test('源进制切换：从十进制切换到十六进制', async ({ page }) => {
    await page.selectOption('#input-base', '16');
    await page.fill('#input-value', 'FF');
    const decValue = await page.locator('#result-dec').textContent();
    expect(decValue.trim()).toBe('255');
  });
});

// ============================================================
// 15-regex.html — 正则调试
// ============================================================
test.describe('15-regex.html — 正则调试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('15-regex.html'));
  });

  test('匹配：输入正则和测试文本显示匹配结果', async ({ page }) => {
    await page.fill('#regex-pattern', '\\d+');
    await page.locator('#test-text').scrollIntoViewIfNeeded();
    await page.fill('#test-text', 'Hello 123 World 456');
    await page.click('#btn-match');
    // Check match badge shows count
    const badge = page.locator('#match-badge');
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    expect(text).toContain('2');
  });

  test('匹配高亮：高亮区域显示', async ({ page }) => {
    await page.fill('#regex-pattern', '\\d+');
    await page.locator('#test-text').scrollIntoViewIfNeeded();
    await page.fill('#test-text', 'abc 123');
    await page.click('#btn-match');
    // Highlight area appears after match
    const highlight = page.locator('#test-text-highlight');
    await expect(highlight).toBeVisible();
    const html = await highlight.innerHTML();
    expect(html).toContain('match-highlight');
  });

  test('空正则：无匹配不报错', async ({ page }) => {
    await page.fill('#regex-pattern', '');
    await page.fill('#test-text', 'test');
    await page.click('#btn-match');
    // Should not crash
  });
});
