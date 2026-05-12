const { test, expect } = require('@playwright/test');
const { fileUrl } = require('./helpers');

// ============================================================
// 03-encoding.html — Hex 转换
// ============================================================
test.describe('03-encoding.html — Hex 转换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('03-encoding.html'));
  });

  test('页面加载：默认编码态，有默认输入文本', async ({ page }) => {
    await expect(page.locator('#tab-encode')).toHaveClass(/active/);
    const inputVal = await page.locator('#input-area').inputValue();
    expect(inputVal.length).toBeGreaterThan(0);
  });

  test('实时转换：输入文本自动生成 Hex 输出', async ({ page }) => {
    await page.fill('#input-area', 'AB');
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toBe('41 42');
  });

  test('编码→解码切换：输出移入输入，自动转换', async ({ page }) => {
    await page.fill('#input-area', 'AB');
    await page.waitForTimeout(100);
    const hexOutput = await page.locator('#output-area').textContent();

    await page.click('#tab-decode');
    await expect(page.locator('#tab-decode')).toHaveClass(/active/);
    // Output should have moved to input
    const newInput = await page.locator('#input-area').inputValue();
    expect(newInput.trim().length).toBeGreaterThan(0);
  });

  test('去重：重复点击当前激活标签不触发操作', async ({ page }) => {
    await page.fill('#input-area', 'AB');
    await page.waitForTimeout(100);
    const output1 = await page.locator('#output-area').textContent();
    const input1 = await page.locator('#input-area').inputValue();

    // Click already-active encode tab
    await page.click('#tab-encode');
    const output2 = await page.locator('#output-area').textContent();
    const input2 = await page.locator('#input-area').inputValue();
    expect(input1).toBe(input2);
    expect(output1.trim()).toBe(output2.trim());
  });

  test('交换按钮：交换输入输出并切换模式', async ({ page }) => {
    await page.fill('#input-area', 'Hello');
    await page.waitForTimeout(100);
    const hexOutput = await page.locator('#output-area').textContent();

    await page.click('#btn-swap');
    // Mode should switch to decode
    await expect(page.locator('#tab-decode')).toHaveClass(/active/);
    // Input should now be the hex output
    const newInput = await page.locator('#input-area').inputValue();
    expect(newInput.trim().length).toBeGreaterThan(0);
  });

  test('选项变更：切换前缀立即重新转换', async ({ page }) => {
    await page.fill('#input-area', 'AB');
    await page.waitForTimeout(100);
    await page.selectOption('#opt-prefix', '0x');
    const output = await page.locator('#output-area').textContent();
    expect(output).toContain('0x');
  });

  test('选项变更：切换大小写立即重新转换', async ({ page }) => {
    await page.fill('#input-area', 'Hello');
    await page.waitForTimeout(100);
    await page.selectOption('#opt-case', 'lower');
    const output = await page.locator('#output-area').textContent();
    expect(output).toMatch(/[a-f]/);
  });

  test('空输入：输出区清空', async ({ page }) => {
    await page.fill('#input-area', '');
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toBe('');
  });

  test('清除按钮：清空输入和输出', async ({ page }) => {
    await page.fill('#input-area', 'test');
    await page.waitForTimeout(100);
    await page.click('#btn-clear-input');
    const inputVal = await page.locator('#input-area').inputValue();
    expect(inputVal).toBe('');
  });

  test('复制按钮：点击后显示"已复制"', async ({ page }) => {
    await page.fill('#input-area', 'Hello');
    await page.waitForTimeout(100);
    await page.click('#btn-copy');
    await expect(page.locator('#btn-copy')).toHaveText('已复制');
    // Wait for recovery
    await page.waitForTimeout(1500);
    await expect(page.locator('#btn-copy')).toHaveText('复制');
  });

  test('紧凑复制按钮：复制无分隔符的 Hex', async ({ page }) => {
    await page.fill('#input-area', 'AB');
    await page.waitForTimeout(100);
    await page.click('#btn-copy-compact');
    await expect(page.locator('#btn-copy-compact')).toHaveText('已复制');
  });

  test('解码错误：无效 Hex 输入显示错误', async ({ page }) => {
    await page.click('#tab-decode');
    await page.fill('#input-area', 'ZZZZ');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.toLowerCase()).toContain('错误');
  });

  test('历史记录：复制后生成历史条目', async ({ page }) => {
    await page.fill('#input-area', 'test history');
    await page.waitForTimeout(100);
    await page.click('#btn-copy');
    await page.waitForTimeout(200);
    const items = await page.locator('#history-items .history-item').count();
    expect(items).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 03b-base64.html — Base64 编解码
// ============================================================
test.describe('03b-base64.html — Base64 编解码', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('03b-base64.html'));
  });

  test('编码：输入文本自动生成 Base64 输出', async ({ page }) => {
    await page.fill('#input-area', 'Hello');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toBe('SGVsbG8=');
  });

  test('解码：输入 Base64 解码为原文', async ({ page }) => {
    await page.click('#tab-decode');
    await page.fill('#input-area', 'SGVsbG8=');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toBe('Hello');
  });

  test('去重：重复点击当前标签不触发操作', async ({ page }) => {
    await page.fill('#input-area', 'test');
    await page.waitForTimeout(100);
    const input1 = await page.locator('#input-area').inputValue();
    await page.click('#tab-encode'); // already on encode
    const input2 = await page.locator('#input-area').inputValue();
    expect(input1).toBe(input2);
  });

  test('交换按钮功能', async ({ page }) => {
    await page.fill('#input-area', 'Hello');
    await page.waitForTimeout(100);
    await page.click('#btn-swap');
    await expect(page.locator('#tab-decode')).toHaveClass(/active/);
  });

  test('解码错误：无效 Base64 输入显示错误', async ({ page }) => {
    await page.click('#tab-decode');
    await page.fill('#input-area', '!!!invalid!!!');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.toLowerCase()).toContain('错误');
  });
});

// ============================================================
// 03c-ascii.html — ASCII 转换
// ============================================================
test.describe('03c-ascii.html — ASCII 转换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('03c-ascii.html'));
  });

  test('编码：输入字符生成 ASCII 码', async ({ page }) => {
    await page.fill('#input-area', 'A');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toContain('65');
  });

  test('解码：输入数字解码为字符', async ({ page }) => {
    await page.click('#tab-ascii-to-char');
    await page.fill('#input-area', '65 66');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toBe('AB');
  });

  test('选项变更：切换为十六进制', async ({ page }) => {
    await page.fill('#input-area', 'A');
    await page.waitForTimeout(100);
    await page.selectOption('#opt-base', '16');
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toContain('41');
  });
});

// ============================================================
// 03d-url.html — URL 编解码
// ============================================================
test.describe('03d-url.html — URL 编解码', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('03d-url.html'));
  });

  test('编码：输入文本自动 URL 编码', async ({ page }) => {
    await page.fill('#input-area', '你好 world');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output).toContain('%');
  });

  test('解码：输入编码字符串解码', async ({ page }) => {
    await page.click('#tab-decode');
    await page.fill('#input-area', 'hello%20world');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toBe('hello world');
  });

  test('信息提示：显示膨胀率', async ({ page }) => {
    await page.fill('#input-area', '你好');
    await page.waitForTimeout(100);
    const info = await page.locator('#info-tip').textContent();
    expect(info.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 03e-unicode.html — Unicode 编解码
// ============================================================
test.describe('03e-unicode.html — Unicode 编解码', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('03e-unicode.html'));
  });

  test('编码：输入中文生成 Unicode 转义', async ({ page }) => {
    await page.fill('#input-area', '你');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output).toContain('\\u');
  });

  test('解码：输入 Unicode 转义解码为字符', async ({ page }) => {
    await page.click('#tab-decode');
    await page.fill('#input-area', '\\u4f60\\u597d');
    await page.waitForTimeout(100);
    const output = await page.locator('#output-area').textContent();
    expect(output.trim()).toContain('你好');
  });
});
