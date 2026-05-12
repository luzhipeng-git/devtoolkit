const { test, expect } = require('@playwright/test');
const { fileUrl } = require('./helpers');

// ============================================================
// 04-json.html — JSON 格式化 & 压缩
// ============================================================
test.describe('04-json.html — JSON 格式化 & 压缩', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('04-json.html'));
  });

  test('格式化：有效 JSON 生成漂亮输出和压缩输出', async ({ page }) => {
    await page.fill('#jsonInput', '{"name":"test","age":25}');
    await page.click('#btnFormat');
    const pretty = await page.locator('#prettyOutput').textContent();
    const minify = await page.locator('#minifyOutput').textContent();
    expect(pretty).toContain('name');
    expect(minify).toContain('"name"');
  });

  test('错误处理：无效 JSON 显示错误信息', async ({ page }) => {
    await page.fill('#jsonInput', '{invalid json}');
    await page.click('#btnFormat');
    const errorEl = page.locator('#errorMsg');
    await expect(errorEl).toBeVisible();
    const errorText = await errorEl.textContent();
    expect(errorText.length).toBeGreaterThan(0);
  });

  test('重置按钮：清空输入和输出', async ({ page }) => {
    await page.fill('#jsonInput', '{"a":1}');
    await page.click('#btnFormat');
    await page.click('#btnReset');
    const inputVal = await page.locator('#jsonInput').inputValue();
    expect(inputVal).toBe('');
  });

  test('压缩率：显示压缩率信息', async ({ page }) => {
    await page.fill('#jsonInput', '{"name": "test", "age": 25}');
    await page.click('#btnFormat');
    await expect(page.locator('#compressionBar')).toBeVisible();
    const rate = await page.locator('#compressionRate').textContent();
    expect(rate.length).toBeGreaterThan(0);
  });

  test('复制按钮：格式化输出可复制', async ({ page }) => {
    await page.fill('#jsonInput', '{"a":1}');
    await page.click('#btnFormat');
    await page.click('#btnCopyPretty');
    await expect(page.locator('#btnCopyPretty')).toHaveClass(/copied/);
  });

  test('复制按钮：压缩输出可复制', async ({ page }) => {
    await page.fill('#jsonInput', '{"a":1}');
    await page.click('#btnFormat');
    await page.click('#btnCopyMinify');
    await expect(page.locator('#btnCopyMinify')).toHaveClass(/copied/);
  });

  test('语法高亮：格式化输出包含语法高亮类', async ({ page }) => {
    await page.fill('#jsonInput', '{"name":"test","age":25,"active":true,"val":null}');
    await page.click('#btnFormat');
    const html = await page.locator('#prettyOutput').innerHTML();
    expect(html).toContain('json-key');
  });

  test('缩进选项：切换缩进方式', async ({ page }) => {
    await page.fill('#jsonInput', '{"a":1}');
    await page.click('#btnFormat');
    await page.selectOption('#optIndent', '4');
    await page.click('#btnFormat');
    const pretty = await page.locator('#prettyOutput').textContent();
    // 4-space indent should produce "    " (4 spaces)
    expect(pretty).toContain('    ');
  });
});

// ============================================================
// 04c-json-deserialize.html — JSON 反序列化
// ============================================================
test.describe('04c-json-deserialize.html — JSON 反序列化', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('04c-json-deserialize.html'));
  });

  test('生成 Java 代码', async ({ page }) => {
    await page.fill('#jsonInput', '{"name":"test","age":25}');
    await page.click('#btnGenerate');
    const output = await page.locator('#outputPanel').textContent();
    expect(output).toContain('String');
    expect(output).toContain('name');
  });

  test('切换目标语言为 Python', async ({ page }) => {
    await page.fill('#jsonInput', '{"name":"test","age":25}');
    await page.selectOption('#langSelect', 'python');
    await page.click('#btnGenerate');
    const output = await page.locator('#outputPanel').textContent();
    expect(output).toContain('str');
  });

  test('错误处理：无效 JSON 显示错误', async ({ page }) => {
    await page.fill('#jsonInput', '{invalid}');
    await page.click('#btnGenerate');
    const errorEl = page.locator('#errorMsg');
    await expect(errorEl).toBeVisible();
  });
});

// ============================================================
// 04d-json-path.html — JSONPath 查询
// ============================================================
test.describe('04d-json-path.html — JSONPath 查询', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('04d-json-path.html'));
  });

  test('查询：$.store.book[*].author 查询成功', async ({ page }) => {
    const json = '{"store":{"book":[{"author":"Nigel"},{"author":"Erik"}]}}';
    await page.fill('#jsonInput', json);
    await page.fill('#pathInput', '$.store.book[*].author');
    await page.click('#btnQuery');
    const results = await page.locator('.result-item').count();
    expect(results).toBe(2);
  });

  test('查询：无匹配显示0匹配', async ({ page }) => {
    await page.fill('#jsonInput', '{"a":1}');
    await page.fill('#pathInput', '$.nonexistent');
    await page.click('#btnQuery');
    const container = page.locator('#resultContainer');
    const text = await container.textContent();
    expect(text).toContain('0');
  });

  test('错误处理：无效 JSON 显示错误', async ({ page }) => {
    await page.fill('#jsonInput', 'not json');
    await page.fill('#pathInput', '$.a');
    await page.click('#btnQuery');
    const errorEl = page.locator('#errorMsg');
    await expect(errorEl).toBeVisible();
  });
});

// ============================================================
// 04e-json-diff.html — JSON Diff
// ============================================================
test.describe('04e-json-diff.html — JSON Diff', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('04e-json-diff.html'));
  });

  test('对比：两个不同 JSON 显示差异', async ({ page }) => {
    await page.fill('#jsonInputA', '{"name":"test","age":25}');
    await page.fill('#jsonInputB', '{"name":"test","age":30,"city":"bj"}');
    await page.click('#btnDiff');
    // Should show diff results
    await expect(page.locator('#diffResult')).toBeVisible();
    // Should show stats
    await expect(page.locator('#diffStats')).toBeVisible();
  });

  test('对比：相同 JSON 显示全部相同', async ({ page }) => {
    await page.fill('#jsonInputA', '{"name":"test"}');
    await page.fill('#jsonInputB', '{"name":"test"}');
    await page.click('#btnDiff');
    const sameCount = await page.locator('#statSame').textContent();
    expect(parseInt(sameCount)).toBeGreaterThan(0);
  });

  test('错误处理：无效 JSON A 显示错误', async ({ page }) => {
    await page.fill('#jsonInputA', '{invalid}');
    await page.fill('#jsonInputB', '{"a":1}');
    await page.click('#btnDiff');
    const errorEl = page.locator('#errorMsg');
    await expect(errorEl).toBeVisible();
  });
});
