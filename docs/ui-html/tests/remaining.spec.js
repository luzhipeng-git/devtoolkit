const { test, expect } = require('@playwright/test');
const { fileUrl } = require('./helpers');

// ============================================================
// 13-time.html — 时间戳转换
// ============================================================
test.describe('13-time.html — 时间戳转换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('13-time.html'));
  });

  test('时间戳→日期：输入时间戳转换成功', async ({ page }) => {
    await page.fill('#ts2date-input', '1700000000000');
    await page.click('#ts2date-btn');
    await expect(page.locator('#ts2date-output')).toBeVisible();
    const result = await page.locator('#ts2date-main').textContent();
    expect(result.length).toBeGreaterThan(0);
  });

  test('当前时间戳：点击"当前时间戳"填入', async ({ page }) => {
    await page.click('#ts2date-now');
    const inputVal = await page.locator('#ts2date-input').inputValue();
    expect(inputVal.length).toBeGreaterThan(0);
  });

  test('日期→时间戳：输入日期转换', async ({ page }) => {
    await page.fill('#date2ts-date', '2024-01-01');
    await page.fill('#date2ts-time', '00:00:00');
    await page.click('#date2ts-btn');
    await expect(page.locator('#date2ts-output')).toBeVisible();
    const msValue = await page.locator('#date2ts-ms').textContent();
    expect(msValue.trim().length).toBeGreaterThan(0);
  });
});

// ============================================================
// 14-cron.html — Cron 表达式
// ============================================================
test.describe('14-cron.html — Cron 表达式', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('14-cron.html'));
  });

  test('页面加载：默认表达式和描述', async ({ page }) => {
    const inputVal = await page.locator('#cronInput').inputValue();
    expect(inputVal.length).toBeGreaterThan(0);
    const desc = await page.locator('#cronDesc').textContent();
    expect(desc.length).toBeGreaterThan(0);
  });

  test('编辑表达式：修改后描述更新', async ({ page }) => {
    await page.fill('#cronInput', '0 0 * * *');
    const desc = await page.locator('#cronDesc').textContent();
    expect(desc.length).toBeGreaterThan(0);
  });

  test('执行时间列表：显示未来执行时间', async ({ page }) => {
    const rows = await page.locator('#previewBody tr').count();
    expect(rows).toBeGreaterThan(0);
  });
});

// ============================================================
// 16-grok.html — Grok 调试
// ============================================================
test.describe('16-grok.html — Grok 调试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('16-grok.html'));
  });

  test('解析：输入 grok 模式和日志数据', async ({ page }) => {
    await page.fill('#patternInput', '%{IP:client} %{WORD:method}');
    await page.fill('#sampleData', '192.168.1.1 GET');
    await page.click('#btnParse');
    const results = await page.locator('#resultsBody').textContent();
    expect(results).toContain('client');
  });
});

// ============================================================
// 17-nginx.html — Nginx 工具
// ============================================================
test.describe('17-nginx.html — Nginx 工具', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('17-nginx.html'));
  });

  test('格式化 Tab：默认显示格式化', async ({ page }) => {
    await expect(page.locator('#tab-format')).toBeVisible();
    await expect(page.locator('#fmtInput')).toBeVisible();
  });

  test('格式化：输入 nginx 配置格式化', async ({ page }) => {
    // Make sure format tab is active
    await page.click('[data-tab="format"]');
    const fmtInput = page.locator('#fmtInput');
    await fmtInput.scrollIntoViewIfNeeded();
    await fmtInput.fill('server { listen 80; server_name example.com; }');
    await page.waitForTimeout(100);
    const btn = page.locator('#btnFormat');
    await expect(btn).toBeEnabled();
    await btn.click();
    // Wait for format to complete (300ms timeout in code)
    await page.waitForFunction(() => {
      const el = document.getElementById('fmtOutput');
      return el && !el.textContent.includes('格式化后的配置将显示在这里');
    }, { timeout: 5000 });
    const output = await page.locator('#fmtOutput').textContent();
    expect(output).toContain('server');
    expect(output).toContain('listen');
  });
});

// ============================================================
// 18-config-converter.html — 配置文件转换
// ============================================================
test.describe('18-config-converter.html — 配置文件转换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('18-config-converter.html'));
  });

  test('转换：JSON → YAML', async ({ page }) => {
    await page.selectOption('#srcFormat', 'json');
    await page.selectOption('#tgtFormat', 'yaml');
    const srcInput = page.locator('#srcInput');
    await srcInput.scrollIntoViewIfNeeded();
    await srcInput.fill('{"name": "test", "age": 25}');
    await page.waitForTimeout(100);
    const btn = page.locator('#btnConvert');
    await expect(btn).toBeEnabled();
    await btn.click();
    // Wait for conversion to complete (300ms timeout in code)
    await page.waitForFunction(() => {
      const el = document.getElementById('outputArea');
      return el && !el.textContent.includes('转换结果将显示在这里');
    }, { timeout: 5000 });
    const output = await page.locator('#outputArea').textContent();
    expect(output).toContain('name');
    expect(output).toContain('test');
  });

  test('错误处理：无效输入显示错误', async ({ page }) => {
    await page.selectOption('#srcFormat', 'json');
    await page.selectOption('#tgtFormat', 'yaml');
    const srcInput = page.locator('#srcInput');
    await srcInput.scrollIntoViewIfNeeded();
    await srcInput.fill('{invalid}');
    await page.waitForTimeout(100);
    const btn = page.locator('#btnConvert');
    await expect(btn).toBeEnabled();
    await btn.click();
    // Wait for conversion to complete
    await page.waitForFunction(() => {
      const el = document.getElementById('outputArea');
      return el && !el.textContent.includes('转换结果将显示在这里');
    }, { timeout: 5000 });
    const output = await page.locator('#outputArea').textContent();
    expect(output.toLowerCase()).toContain('错误');
  });
});

// ============================================================
// 19-codec.html — JWT/HTML Entity/颜色转换
// ============================================================
test.describe('19-codec.html — JWT 解码', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('19-codec.html'));
  });

  test('JWT 解码：点击解码按钮显示结果', async ({ page }) => {
    // Page loads with default JWT, click decode
    await page.click('#btn-decode');
    await expect(page.locator('#jwt-segments')).toBeVisible();
  });

  test('Tab 切换：切换到 HTML Entity', async ({ page }) => {
    await page.click('#tab-btn-html-entity');
    await expect(page.locator('#tab-html-entity')).toBeVisible();
    await expect(page.locator('#tab-jwt')).toBeHidden();
  });

  test('HTML Entity 编码', async ({ page }) => {
    await page.click('#tab-btn-html-entity');
    await page.fill('#html-entity-input', '<div>test</div>');
    // Select encode direction (default checked)
    await page.click('#btn-html-execute');
    const output = await page.locator('#html-entity-output').inputValue();
    expect(output).toContain('&lt;');
  });
});

// ============================================================
// 11-qrcode.html — 二维码生成
// ============================================================
test.describe('11-qrcode.html — 二维码生成', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('11-qrcode.html'));
  });

  test('生成：输入文本生成二维码预览', async ({ page }) => {
    await page.fill('#qrContent', 'https://example.com');
    await page.waitForTimeout(500); // debounce
    // Should have a canvas or img in the preview area
    const preview = page.locator('#qrPreview');
    const hasContent = await preview.locator('canvas, img').count();
    expect(hasContent).toBeGreaterThanOrEqual(1);
  });
});
