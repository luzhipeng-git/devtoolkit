const { test, expect } = require('@playwright/test');
const { fileUrl } = require('./helpers');

// ============================================================
// 01-main-framework.html — 主框架
// ============================================================
test.describe('01-main-framework.html — 主框架', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('01-main-framework.html'));
  });

  test('页面加载：显示侧边栏和搜索', async ({ page }) => {
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('#sidebarSearchInput')).toBeVisible();
  });

  test('搜索：聚焦搜索框打开搜索弹窗', async ({ page }) => {
    await page.click('#sidebarSearchInput');
    // Should open search overlay
    await expect(page.locator('#searchOverlay')).toBeVisible();
  });

  test('搜索：输入关键字过滤搜索结果', async ({ page }) => {
    await page.click('#sidebarSearchInput');
    await expect(page.locator('#searchOverlay')).toBeVisible();
    await page.fill('#searchModalInput', 'Hex');
    const visibleResults = await page.locator('.search-result-item:visible').count();
    expect(visibleResults).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 02-home.html — 首页
// ============================================================
test.describe('02-home.html — 首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(fileUrl('02-home.html'));
  });

  test('页面加载：显示工具卡片网格', async ({ page }) => {
    const cards = await page.locator('.tool-card-link').count();
    expect(cards).toBeGreaterThan(10);
  });

  test('搜索：输入关键字过滤工具卡片', async ({ page }) => {
    await page.fill('#home-search', 'JSON');
    const visibleCards = await page.locator('.tool-card-link:visible').count();
    expect(visibleCards).toBeGreaterThanOrEqual(1);
  });

  test('搜索：无匹配时隐藏所有卡片', async ({ page }) => {
    await page.fill('#home-search', 'zzzzz_nonexistent');
    const visibleCards = await page.locator('.tool-card-link:visible').count();
    expect(visibleCards).toBe(0);
  });
});
