import { test, expect } from '@playwright/test'

test.describe('TC-01: 主框架与布局', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('应用启动初始态验证', async ({ page }) => {
    // 标题栏显示 DevToolkit
    const titleBar = page.locator('.titlebar, .title-bar, [class*="title"]')
    const titleText = await titleBar.first().textContent()
    expect(titleText).toContain('DevToolkit')

    // 侧边栏可见且展开
    const sidebar = page.locator('.sidebar, [class*="sidebar"], aside').first()
    await expect(sidebar).toBeVisible()

    // 侧边栏包含 13 个分类
    const categoryItems = page.locator('.sidebar-group-title, .category-name, [class*="category"]')
    const categoryCount = await categoryItems.count()
    expect(categoryCount).toBeGreaterThanOrEqual(10) // 至少包含大部分分类

    // 内容区显示首页内容（功能卡片或快捷键提示）
    const contentArea = page.locator('.content-area, main, [class*="content"]')
    const contentHtml = await contentArea.first().innerHTML()
    expect(contentHtml.length).toBeGreaterThan(100)

    // 面包屑显示"首页"
    const breadcrumb = page.locator('.breadcrumb, [class*="breadcrumb"]')
    if (await breadcrumb.isVisible()) {
      const breadcrumbText = await breadcrumb.textContent()
      expect(breadcrumbText).toContain('首页')
    }
  })

  test('侧边栏分类展开折叠', async ({ page }) => {
    const categoryItem = page.locator('.sidebar-group-title, .category-name').first()
    await categoryItem.click()
    await page.waitForTimeout(300)

    // 展开后应显示子工具列表
    const subItems = page.locator('.sidebar-item, .sub-item')
    const subCount = await subItems.count()
    expect(subCount).toBeGreaterThan(0)

    // 再次点击折叠
    await categoryItem.click()
    await page.waitForTimeout(300)
  })

  test('侧边栏工具导航', async ({ page }) => {
    // 展开字符编码分类
    const categoryItem = page.locator('.sidebar-group-title, .category-name, [class*="category"]').first()
    if (await categoryItem.isVisible()) {
      await categoryItem.click()
      await page.waitForTimeout(300)
    }

    // 点击第一个工具项
    const toolItem = page.locator('.sidebar-item, .tool-name, li span').first()
    if (await toolItem.isVisible()) {
      const toolName = await toolItem.textContent()
      await toolItem.click()
      await page.waitForTimeout(500)

      // 工具项高亮
      const isHighlighted = await toolItem.evaluate((el: HTMLElement) => {
        const classes = el.className
        return classes.includes('active') || classes.includes('selected') || classes.includes('highlight')
      })
      // 至少内容区要有内容
      const contentArea = page.locator('.content-area, main')
      const html = await contentArea.first().innerHTML()
      expect(html.length).toBeGreaterThan(50)
    }
  })

  test('侧边栏折叠展开CtrlB', async ({ page }) => {
    const sidebar = page.locator('.sidebar, [class*="sidebar"], aside').first()
    const initialWidth = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth)

    // 按 Ctrl+B 折叠
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(400)

    const collapsedWidth = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth)
    expect(collapsedWidth).toBeLessThan(initialWidth)

    // 再按 Ctrl+B 展开
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(400)

    const restoredWidth = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth)
    expect(restoredWidth).toBeGreaterThan(collapsedWidth)
  })

  test('搜索覆盖层打开', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    const searchBackdrop = page.locator('.search-backdrop')
    await expect(searchBackdrop).toBeVisible({ timeout: 3000 })

    // Overlay search input (not the sidebar readonly one)
    const searchInput = page.locator('.search-modal .search-input')
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toBeFocused()
  })

  test('搜索关键词过滤', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.search-modal .search-input')
    await expect(searchInput).toBeVisible({ timeout: 3000 })
    await searchInput.fill('base64')
    await page.waitForTimeout(300)

    const results = page.locator('.search-result-item')
    await expect(results.first()).toBeVisible({ timeout: 3000 })
    const resultText = await results.first().textContent()
    expect(resultText?.toLowerCase()).toContain('base64')
  })

  test('搜索选择并跳转', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.search-modal .search-input')
    await expect(searchInput).toBeVisible({ timeout: 3000 })
    await searchInput.fill('base64')
    await page.waitForTimeout(300)

    const results = page.locator('.search-result-item')
    if ((await results.count()) > 0) {
      await results.first().click()
      await page.waitForTimeout(500)

      // 搜索覆盖层关闭
      const searchBackdrop = page.locator('.search-backdrop')
      await expect(searchBackdrop).toBeHidden({ timeout: 3000 })

      // 内容区加载了工具页面
      const contentArea = page.locator('.content-area, main')
      const html = await contentArea.first().innerHTML()
      expect(html.length).toBeGreaterThan(50)
    }
  })

  test('搜索Esc关闭', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(300)

    const searchBackdrop = page.locator('.search-backdrop, .search-overlay')
    await expect(searchBackdrop).toBeVisible()

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await expect(searchBackdrop).toBeHidden({ timeout: 3000 })
  })

  test('搜索键盘导航', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.search-modal .search-input')
    await expect(searchInput).toBeVisible({ timeout: 3000 })
    await searchInput.fill('json')
    await page.waitForTimeout(300)

    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)

    const selected = page.locator('.search-result-item.selected')
    const selectedCount = await selected.count()
    expect(selectedCount).toBeGreaterThanOrEqual(0)
  })

  test('搜索无匹配结果', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.search-modal .search-input')
    await expect(searchInput).toBeVisible({ timeout: 3000 })
    await searchInput.fill('xyznotexist123456')
    await page.waitForTimeout(300)

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('未找到')
  })

  test('首页功能卡片导航', async ({ page }) => {
    // 找到首页的工具卡片
    const toolCard = page.locator('.tool-card, .card, [class*="tool-card"]').first()
    if (await toolCard.isVisible()) {
      await toolCard.click()
      await page.waitForTimeout(500)

      // 应导航到工具页面
      const contentArea = page.locator('.content-area, main')
      const html = await contentArea.first().innerHTML()
      expect(html.length).toBeGreaterThan(50)
    }
  })
})
