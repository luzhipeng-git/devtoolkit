/**
 * DevToolkit 用户手册截图脚本
 *
 * 使用方式:
 *   1. 先启动前端: cd dev-tool-front && pnpm dev
 *   2. 再启动后端: cd dev-tool-front/src-tauri && cargo run -p devtoolkit-server
 *   3. 运行截图: npx playwright test docs/user-manual/screenshots.ts --config playwright.manual.config.ts
 *
 * 需要先创建 playwright.manual.config.ts 配置文件
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'

const BASE_URL = 'http://localhost:1420'
const SCREENSHOT_DIR = 'docs/user-manual/screenshots'
const VIEWPORT = { width: 1440, height: 900 }

// 等待动画完成
async function waitForAnimation(page: Page) {
  await page.waitForTimeout(500)
}

// 截图辅助函数
async function screenshot(page: Page, category: string, name: string) {
  await waitForAnimation(page)
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${category}/${name}.png`,
    fullPage: false,
  })
}

// 导航到工具页面并等待加载
async function gotoTool(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`)
  await page.waitForLoadState('networkidle')
  await waitForAnimation(page)
}

// 填写文本区域
async function fillTextarea(page: Page, selector: string, text: string) {
  const el = page.locator(selector).first()
  try {
    await el.fill(text)
  } catch {
    // readonly 元素用 type 代替 fill
    await el.focus()
    await page.keyboard.insertText(text)
  }
  await waitForAnimation(page)
}

// 点击选项面板中的下拉框
async function selectOption(page: Page, selector: string, value: string) {
  await page.locator(selector).first().selectOption(value)
  await waitForAnimation(page)
}

// 点击按钮
async function clickBtn(page: Page, textOrSelector: string) {
  const el = page.locator(`text=${textOrSelector}`).first()
  if (await el.isVisible()) {
    await el.click()
    await waitForAnimation(page)
  }
}

// ============================================================
//  全局截图
// ============================================================

test.describe('全局界面', () => {
  test('首页', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await waitForAnimation(page)
    await screenshot(page, 'global', 'home')
  })

  test('侧边栏展开', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await waitForAnimation(page)
    await screenshot(page, 'global', 'sidebar-expanded')
  })

  test('侧边栏收起', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    // 按 Ctrl+B 收起侧边栏
    await page.keyboard.press('Control+b')
    await waitForAnimation(page)
    await screenshot(page, 'global', 'sidebar-collapsed')
  })

  test('搜索弹窗', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    await waitForAnimation(page)
    await screenshot(page, 'global', 'search-dialog')
  })

  test('搜索结果', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    await waitForAnimation(page)
    const searchInput = page.locator('.search-input, input[placeholder*="搜索"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.focus()
      await page.keyboard.insertText('JSON')
      await waitForAnimation(page)
    }
    await screenshot(page, 'global', 'search-results')
  })
})

// ============================================================
//  字符编码
// ============================================================

test.describe('Hex 转换', () => {
  test('空白页面', async ({ page }) => {
    await gotoTool(page, '/encoding/hex')
    await screenshot(page, 'encoding', 'hex-empty')
  })

  test('编码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/hex')
    await fillTextarea(page, '.editor-textarea, textarea', 'Hello DevToolkit')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'hex-encode')
  })

  test('编码选项', async ({ page }) => {
    await gotoTool(page, '/encoding/hex')
    await fillTextarea(page, '.editor-textarea, textarea', 'Hello')
    // 找到 options-panel 中的 select（前缀选项）
    const selects = page.locator('.options-panel select')
    if (await selects.count() >= 2) {
      await selects.nth(1).selectOption('0x')  // 第二个 select 是前缀
    }
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'hex-encode-0x')
  })

  test('解码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/hex')
    // 点击解码 tab
    const decodeTab = page.locator('text=解码').first()
    if (await decodeTab.isVisible()) await decodeTab.click()
    await waitForAnimation(page)
    await fillTextarea(page, '.editor-textarea, textarea', '48 65 6c 6c 6f')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'hex-decode')
  })

  test('大小写转换', async ({ page }) => {
    await gotoTool(page, '/encoding/hex')
    const caseTab = page.locator('button:has-text("大小写转换")').first()
    await caseTab.click()
    await waitForAnimation(page)
    await fillTextarea(page, '.editor-textarea, textarea', '4c6f77657220484558')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'hex-case-convert')
  })
})

test.describe('Base64 编解码', () => {
  test('编码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/base64')
    await fillTextarea(page, '.editor-textarea, textarea', 'DevToolkit 用户手册')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'base64-encode')
  })

  test('解码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/base64')
    const decodeTab = page.locator('text=解码').first()
    if (await decodeTab.isVisible()) await decodeTab.click()
    await waitForAnimation(page)
    await fillTextarea(page, '.editor-textarea, textarea', 'RGV2VG9vbGtpdCDnn6XnlKjnqbrnmoQ=')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'base64-decode')
  })
})

test.describe('ASCII 转换', () => {
  test('编码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/ascii')
    await fillTextarea(page, '.editor-textarea, textarea', 'ABC')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'ascii-encode')
  })

  test('解码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/ascii')
    const decodeTab = page.locator('text=解码').first()
    if (await decodeTab.isVisible()) await decodeTab.click()
    await waitForAnimation(page)
    await fillTextarea(page, '.editor-textarea, textarea', '65 66 67')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'ascii-decode')
  })
})

test.describe('URL 编解码', () => {
  test('编码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/url')
    await fillTextarea(page, '.editor-textarea, textarea', 'https://example.com/search?q=你好世界&lang=中文')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'url-encode')
  })

  test('解码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/url')
    const decodeTab = page.locator('text=解码').first()
    if (await decodeTab.isVisible()) await decodeTab.click()
    await waitForAnimation(page)
    await fillTextarea(page, '.editor-textarea, textarea', 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3D%E4%BD%A0%E5%A5%BD')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'url-decode')
  })
})

test.describe('Unicode 编解码', () => {
  test('编码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/unicode')
    await fillTextarea(page, '.editor-textarea, textarea', '工具箱')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'unicode-encode')
  })

  test('解码模式', async ({ page }) => {
    await gotoTool(page, '/encoding/unicode')
    const decodeTab = page.locator('text=解码').first()
    if (await decodeTab.isVisible()) await decodeTab.click()
    await waitForAnimation(page)
    await fillTextarea(page, '.editor-textarea, textarea', '\\u5de5\\u5177\\u7bb1')
    await waitForAnimation(page)
    await screenshot(page, 'encoding', 'unicode-decode')
  })
})

// ============================================================
//  JSON 工具
// ============================================================

test.describe('JSON 格式化 & 压缩', () => {
  test('格式化结果', async ({ page }) => {
    await gotoTool(page, '/json/format')
    const jsonInput = '{"name":"DevToolkit","version":"1.0","features":["encoding","json","crypto"]}'
    await fillTextarea(page, '.editor-textarea, textarea', jsonInput)
    await waitForAnimation(page)
    await screenshot(page, 'json', 'format-result')
  })
})

test.describe('JSON 反序列化', () => {
  test('生成代码结果', async ({ page }) => {
    await gotoTool(page, '/json/deserialize')
    const jsonInput = '{"name":"张三","age":25,"isActive":true,"scores":[90,85,92]}'
    await fillTextarea(page, '.editor-textarea, textarea', jsonInput)
    await clickBtn(page, '生成')
    await waitForAnimation(page)
    await screenshot(page, 'json', 'deserialize-result')
  })
})

test.describe('JSONPath 查询', () => {
  test('查询结果', async ({ page }) => {
    await gotoTool(page, '/json/path')
    const jsonInput = '{"store":{"book":[{"title":"A","price":10},{"title":"B","price":20}]}}'
    await fillTextarea(page, 'textarea[placeholder*="JSON"]', jsonInput)
    // 填写 JSONPath
    const pathInput = page.locator('input[placeholder*="$"]').first()
    await pathInput.fill('$.store.book[*].title')
    await waitForAnimation(page)
    // 点击查询
    const queryBtn = page.locator('.btn-outline').first()
    await queryBtn.click()
    await waitForAnimation(page)
    await screenshot(page, 'json', 'jsonpath-result')
  })
})

test.describe('JSON Diff', () => {
  test('对比结果', async ({ page }) => {
    await gotoTool(page, '/json/diff')
    // 填入两份 JSON
    const textareaA = page.locator('textarea[placeholder*="第一份"]').first()
    const textareaB = page.locator('textarea[placeholder*="第二份"]').first()
    await textareaA.fill('{"name":"test","version":"1.0","count":10}')
    await textareaB.fill('{"name":"test","version":"2.0","count":20,"newField":true}')
    await waitForAnimation(page)
    // 点击对比
    const diffBtn = page.locator('.btn-action').first()
    await diffBtn.click()
    await page.waitForTimeout(1000)
    await waitForAnimation(page)
    await screenshot(page, 'json', 'diff-result')
  })
})

// ============================================================
//  加密解密
// ============================================================

test.describe('AES 加密/解密', () => {
  test('加密结果', async ({ page }) => {
    await gotoTool(page, '/crypto/aes')
    // 填入明文
    await fillTextarea(page, '.editor-textarea, textarea', 'Hello AES Encryption!')
    // 点击随机生成密钥按钮
    const randomKeyBtn = page.locator('.key-row .btn-outline').first()
    if (await randomKeyBtn.isVisible()) await randomKeyBtn.click()
    await waitForAnimation(page)
    // 点击随机生成 IV 按钮
    const randomIvBtn = page.locator('.key-row .btn-outline').nth(1)
    if (await randomIvBtn.isVisible()) await randomIvBtn.click()
    await waitForAnimation(page)
    // 点击加密按钮
    const encryptBtn = page.locator('.btn-primary').first()
    await encryptBtn.click()
    // 等待加密结果出现在输出区域
    await page.waitForSelector('.editor-output:not(:empty)', { timeout: 10000 })
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'aes-encrypt-result')
  })
})

test.describe('DES/3DES', () => {
  test('加密结果', async ({ page }) => {
    await gotoTool(page, '/crypto/des')
    // 填入明文
    await fillTextarea(page, '.editor-textarea, textarea', 'Hello DES!')
    // 点击随机生成密钥按钮
    const randomKeyBtn = page.locator('.key-row .btn-outline').first()
    if (await randomKeyBtn.isVisible()) await randomKeyBtn.click()
    await waitForAnimation(page)
    // 随机生成 IV（如果有）
    const randomIvBtn = page.locator('.key-row .btn-outline').nth(1)
    if (await randomIvBtn.isVisible()) await randomIvBtn.click()
    await waitForAnimation(page)
    // 点击加密按钮
    const encryptBtn = page.locator('.btn-primary').first()
    await encryptBtn.click()
    await page.waitForSelector('.editor-output:not(:empty)', { timeout: 10000 })
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'des-encrypt-result')
  })
})

test.describe('RSA 工具', () => {
  test('密钥生成', async ({ page }) => {
    await gotoTool(page, '/crypto/rsa')
    // 点击生成密钥对按钮
    const genBtn = page.locator('.btn-primary').first()
    await genBtn.click()
    // 等待密钥生成完成（RSA 2048 可能需要几秒）
    await page.waitForTimeout(5000)
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'rsa-keygen')
  })

  test('加解密', async ({ page }) => {
    await gotoTool(page, '/crypto/rsa')
    const encDecTab = page.locator('button:has-text("加解密")').first()
    await encDecTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'rsa-encrypt')
  })

  test('签名验签', async ({ page }) => {
    await gotoTool(page, '/crypto/rsa')
    const signTab = page.locator('button:has-text("签名验签")').first()
    await signTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'rsa-sign')
  })
})

test.describe('哈希摘要', () => {
  test('计算结果', async ({ page }) => {
    await gotoTool(page, '/crypto/hash')
    await fillTextarea(page, '.editor-textarea, textarea', 'DevToolkit')
    // 精确点击计算按钮
    const calcBtn = page.locator('.btn-primary').first()
    await calcBtn.click()
    await page.waitForTimeout(1500)
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'hash-result')
  })
})

test.describe('密钥工具', () => {
  test('随机密钥生成', async ({ page }) => {
    await gotoTool(page, '/crypto/key')
    const genBtn = page.locator('.btn-primary').first()
    await genBtn.click()
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'key-generate')
  })

  test('KCV 计算', async ({ page }) => {
    await gotoTool(page, '/crypto/key')
    // 切换到 KCV tab
    const kcvTab = page.locator('.sub-tab').locator('text=KCV').first()
    await kcvTab.click()
    await waitForAnimation(page)
    // 填入密钥
    const keyInput = page.locator('input[placeholder*="Hex"]').first()
    await keyInput.fill('0123456789ABCDEF0123456789ABCDEF')
    await waitForAnimation(page)
    // 点击计算
    const calcBtn = page.locator('.btn-primary').first()
    await calcBtn.click()
    await page.waitForTimeout(2000)
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'key-kcv')
  })
})

test.describe('OpenSSL 工具', () => {
  test('命令构建', async ({ page }) => {
    await gotoTool(page, '/crypto/openssl')
    // 默认就在命令构建 tab，选择操作类型触发命令生成
    const selects = page.locator('.form-select, select')
    if (await selects.count() >= 2) {
      // 切换操作类型以展示不同命令
      await selects.nth(1).selectOption({ index: 1 })
    }
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'openssl-command')
  })

  test('证书解析', async ({ page }) => {
    await gotoTool(page, '/crypto/openssl')
    const certTab = page.locator('.tab-btn:has-text("证书")').first()
    await certTab.click()
    await waitForAnimation(page)
    // 填入一个示例证书
    const sampleCert = '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHCgVZU65BMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl\nc3RDTjAeFw0yNDAxMDEwMDAwMDBaFw0yNTAxMDEwMDAwMDBaMBExDzANBgNVBAMM\nBnRlc3RDTjBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQC7o96lu0MRPNRnxGBf2lbN\naTiOMTMi0m55KJiCP1mYKRfLRPX/OH0B8MMzycbPpS3e1F6fttG/LOCATION/FAKE\nAgMBAAEwDQYJKoZIhvcNAQELBQADQQBHTNMm/qqPCnouo4JBMKLLRC4pPdFOTEp/\nh1FpZH5Oh0XXXXXXXXXXXXX/\n-----END CERTIFICATE-----'
    const certTextarea = page.locator('textarea[placeholder*="CERTIFICATE"]').first()
    await certTextarea.fill(sampleCert)
    await waitForAnimation(page)
    // 点击解析
    const parseBtn = page.locator('.btn-primary').first()
    await parseBtn.click()
    await page.waitForTimeout(2000)
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'openssl-cert')
  })

  test('CSR 生成', async ({ page }) => {
    await gotoTool(page, '/crypto/openssl')
    const csrTab = page.locator('.tab-btn:has-text("CSR")').first()
    await csrTab.click()
    await waitForAnimation(page)
    // 填入 CSR 字段
    const inputs = page.locator('.form-input')
    await inputs.nth(0).fill('CN')
    await inputs.nth(1).fill('Beijing')
    await inputs.nth(2).fill('My Company')
    await inputs.nth(3).fill('example.com')
    await waitForAnimation(page)
    // 点击生成
    const genBtn = page.locator('.btn-primary').first()
    await genBtn.click()
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'openssl-csr')
  })

  test('格式转换', async ({ page }) => {
    await gotoTool(page, '/crypto/openssl')
    const fmtTab = page.locator('.tab-btn:has-text("格式")').first()
    await fmtTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'crypto', 'openssl-format')
  })
})

// ============================================================
//  数字计算
// ============================================================

test.describe('进制转换', () => {
  test('转换结果', async ({ page }) => {
    await gotoTool(page, '/calculator/base')
    // 用 placeholder 精确定位输入框
    const calcInput = page.locator('input[placeholder*="数值"]').first()
    await calcInput.fill('255')
    // 等待结果出现（Vue watch 自动触发）
    await page.waitForTimeout(1000)
    await waitForAnimation(page)
    await screenshot(page, 'calculator', 'base-converter-result')
  })

  test('批量转换', async ({ page }) => {
    await gotoTool(page, '/calculator/base')
    // 查找批量转换区域
    const batchToggle = page.locator('text=批量').first()
    if (await batchToggle.isVisible()) await batchToggle.click()
    await waitForAnimation(page)
    await screenshot(page, 'calculator', 'base-converter-batch')
  })
})

// ============================================================
//  二维码
// ============================================================

test.describe('二维码生成', () => {
  test('生成结果', async ({ page }) => {
    await gotoTool(page, '/qrcode/generate')
    const input = page.locator('textarea[placeholder*="URL"]').first()
    await input.fill('https://github.com/example/devtoolkit')
    // 等待二维码渲染完成
    await page.waitForTimeout(2000)
    await waitForAnimation(page)
    await screenshot(page, 'qrcode', 'generate-result')
  })
})

test.describe('二维码解析', () => {
  test('空白页面', async ({ page }) => {
    await gotoTool(page, '/qrcode/parse')
    await screenshot(page, 'qrcode', 'parse-empty')
  })
})

// ============================================================
//  HTTP Client
// ============================================================

test.describe('HTTP 请求', () => {
  test('GET 请求', async ({ page }) => {
    await gotoTool(page, '/http/client')
    const urlInput = page.locator('input[placeholder*="URL"], input[placeholder*="http"], .url-input').first()
    if (await urlInput.isVisible()) {
      await urlInput.fill('https://httpbin.org/get')
    }
    await waitForAnimation(page)
    await screenshot(page, 'http', 'client-get')
  })

  test('请求配置 - Params', async ({ page }) => {
    await gotoTool(page, '/http/client')
    const paramsTab = page.locator('text=Params').first()
    if (await paramsTab.isVisible()) await paramsTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'http', 'client-params')
  })

  test('请求配置 - Headers', async ({ page }) => {
    await gotoTool(page, '/http/client')
    const headersTab = page.locator('text=Headers').first()
    if (await headersTab.isVisible()) await headersTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'http', 'client-headers')
  })

  test('请求配置 - Body', async ({ page }) => {
    await gotoTool(page, '/http/client')
    // 切换到 POST 方法
    const postBtn = page.locator('text=POST').first()
    if (await postBtn.isVisible()) await postBtn.click()
    await waitForAnimation(page)
    const bodyTab = page.locator('text=Body').first()
    if (await bodyTab.isVisible()) await bodyTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'http', 'client-body')
  })

  test('请求配置 - Auth', async ({ page }) => {
    await gotoTool(page, '/http/client')
    const authTab = page.locator('text=Auth').first()
    if (await authTab.isVisible()) await authTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'http', 'client-auth')
  })
})

// ============================================================
//  时间计算
// ============================================================

test.describe('时间戳转换', () => {
  test('时间戳转日期', async ({ page }) => {
    await gotoTool(page, '/time/timestamp')
    // 用 placeholder 精确定位时间戳输入框
    const tsInput = page.locator('input[placeholder*="时间戳"]').first()
    await tsInput.fill(String(Date.now()))
    // 精确点击转换按钮
    const convertBtn = page.locator('.btn-convert').first()
    await convertBtn.click()
    await waitForAnimation(page)
    await screenshot(page, 'time', 'timestamp-to-date')
  })

  test('日期转时间戳', async ({ page }) => {
    await gotoTool(page, '/time/timestamp')
    await waitForAnimation(page)
    await screenshot(page, 'time', 'timestamp-date-to-ts')
  })
})

// ============================================================
//  Cron
// ============================================================

test.describe('Cron 表达式', () => {
  test('编辑器', async ({ page }) => {
    await gotoTool(page, '/cron/editor')
    await screenshot(page, 'cron', 'editor-default')
  })

  test('解析结果', async ({ page }) => {
    await gotoTool(page, '/cron/editor')
    // 默认表达式已在输入框中
    await waitForAnimation(page)
    await screenshot(page, 'cron', 'editor-parsed')
  })
})

// ============================================================
//  正则调试
// ============================================================

test.describe('正则调试', () => {
  test('匹配结果', async ({ page }) => {
    await gotoTool(page, '/regex/tester')
    // 用 placeholder 精确定位正则输入框
    const patternInput = page.locator('input[placeholder*="正则表达式"]').first()
    await patternInput.fill('\\d+')
    // 填入测试文本
    const testTextarea = page.locator('textarea[placeholder*="测试"]').first()
    await testTextarea.fill('abc123def456ghi789')
    await waitForAnimation(page)
    await screenshot(page, 'regex', 'tester-result')
  })
})

// ============================================================
//  Grok
// ============================================================

test.describe('Grok 调试', () => {
  test('解析结果', async ({ page }) => {
    await gotoTool(page, '/grok/tester')
    // 填写日志文本
    const logArea = page.locator('textarea[placeholder*="日志"]').first()
    if (await logArea.isVisible()) {
      await logArea.fill('192.168.1.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326')
    }
    // 填写 grok pattern（注意：Grok 模式不是正则，方括号不需要转义）
    const patternInput = page.locator('input[placeholder*="%{"]').first()
    if (await patternInput.isVisible()) {
      await patternInput.fill('%{IP:client} - - [%{HTTPDATE:timestamp}] "%{WORD:method} %{URIPATH:path} HTTP/%{NUMBER:http_version}" %{NUMBER:status} %{NUMBER:bytes}')
    }
    await clickBtn(page, '解析')
    await waitForAnimation(page)
    await screenshot(page, 'grok', 'tester-result')
  })
})

// ============================================================
//  Nginx
// ============================================================

test.describe('Nginx 工具', () => {
  test('格式化', async ({ page }) => {
    await gotoTool(page, '/nginx/tool')
    const nginxConfig = 'server {\nlisten 80;\nserver_name example.com;\nlocation / {\nproxy_pass http://backend:8080;\n}\n}'
    // 用 placeholder 精确定位
    const textarea = page.locator('textarea[placeholder*="Nginx"]').first()
    await textarea.fill(nginxConfig)
    await waitForAnimation(page)
    // 精确点击格式化按钮
    const formatBtn = page.locator('.btn-action').first()
    await formatBtn.click()
    // 等待格式化结果出现
    await page.waitForTimeout(1500)
    await waitForAnimation(page)
    await screenshot(page, 'nginx', 'format-result')
  })

  test('校验通过', async ({ page }) => {
    await gotoTool(page, '/nginx/tool')
    // 切换到校验 tab（按钮文字是"语法检查"）
    const checkTab = page.locator('button:has-text("语法检查")').first()
    await checkTab.click()
    await waitForAnimation(page)
    // 填入有效的 Nginx 配置
    const nginxConfig = 'server {\n    listen 80;\n    server_name example.com;\n\n    location / {\n        proxy_pass http://backend:8080;\n    }\n}'
    const textarea = page.locator('textarea[placeholder*="语法检查"]').first()
    await textarea.fill(nginxConfig)
    await waitForAnimation(page)
    // 点击检查按钮
    const checkBtn = page.locator('.btn-action').first()
    await checkBtn.click()
    // 等待检查结果出现
    await page.waitForSelector('.check-pass, .check-fail', { timeout: 5000 })
    await waitForAnimation(page)
    await screenshot(page, 'nginx', 'check-tab')
  })

  test('校验失败', async ({ page }) => {
    await gotoTool(page, '/nginx/tool')
    const checkTab = page.locator('button:has-text("语法检查")').first()
    await checkTab.click()
    await waitForAnimation(page)
    // 填入有语法错误的配置
    const badConfig = 'server {\n    listen 80\n    server_name example.com\n    location / {\n        proxy_pass http://backend\n    }\n}'
    const textarea = page.locator('textarea[placeholder*="语法检查"]').first()
    await textarea.fill(badConfig)
    await waitForAnimation(page)
    const checkBtn = page.locator('.btn-action').first()
    await checkBtn.click()
    await page.waitForSelector('.check-pass, .check-fail', { timeout: 5000 })
    await waitForAnimation(page)
    await screenshot(page, 'nginx', 'check-fail')
  })

  test('Diff', async ({ page }) => {
    await gotoTool(page, '/nginx/tool')
    const diffTab = page.locator('button:has-text("Diff")').first()
    await diffTab.click()
    await waitForAnimation(page)
    // 填入新旧配置
    const oldConfig = 'server {\n    listen 80;\n    server_name old.com;\n}'
    const newConfig = 'server {\n    listen 443 ssl;\n    server_name new.com;\n    ssl_certificate /etc/ssl/cert.pem;\n}'
    const oldTextarea = page.locator('textarea[placeholder*="旧版"]').first()
    const newTextarea = page.locator('textarea[placeholder*="新版"]').first()
    await oldTextarea.fill(oldConfig)
    await newTextarea.fill(newConfig)
    await waitForAnimation(page)
    const diffBtn = page.locator('.btn-action').first()
    await diffBtn.click()
    await page.waitForTimeout(1500)
    await waitForAnimation(page)
    await screenshot(page, 'nginx', 'diff-tab')
  })

  test('模板', async ({ page }) => {
    await gotoTool(page, '/nginx/tool')
    const tplTab = page.locator('text=模板').first()
    if (await tplTab.isVisible()) await tplTab.click()
    await waitForAnimation(page)
    await screenshot(page, 'nginx', 'templates-tab')
  })
})

// ============================================================
//  配置转换
// ============================================================

test.describe('配置文件转换', () => {
  test('JSON 转 YAML', async ({ page }) => {
    await gotoTool(page, '/config/converter')
    // 默认源格式是 JSON，目标格式是 YAML，填入正确的 JSON 内容
    const jsonInput = '{\n  "server": {\n    "port": 8080,\n    "host": "localhost"\n  },\n  "database": {\n    "url": "jdbc:mysql://localhost:3306/mydb",\n    "username": "root"\n  }\n}'
    const textarea = page.locator('textarea[placeholder*="转换"]').first()
    await textarea.fill(jsonInput)
    await waitForAnimation(page)
    // 精确点击转换按钮
    const convertBtn = page.locator('.btn-action').first()
    await convertBtn.click()
    // 等待输出区域出现内容
    await page.waitForSelector('.editor-output:not(.placeholder)', { timeout: 5000 })
    await waitForAnimation(page)
    await screenshot(page, 'config', 'converter-result')
  })
})

// ============================================================
//  编码解码 (Codec)
// ============================================================

test.describe('JWT 编解码', () => {
  test('JWT 解码', async ({ page }) => {
    await gotoTool(page, '/codec/jwt')
    const jwtInput = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const textArea = page.locator('textarea[placeholder*="JWT"]').first()
    await textArea.fill(jwtInput)
    await waitForAnimation(page)
    // 点击解码按钮
    const decodeBtn = page.locator('.btn-decode').first()
    await decodeBtn.click()
    await waitForAnimation(page)
    await screenshot(page, 'codec', 'jwt-decode')
  })

  test('HTML 实体', async ({ page }) => {
    await gotoTool(page, '/codec/jwt')
    const htmlTab = page.locator('.tool-tab:has-text("HTML")').first()
    await htmlTab.click()
    await waitForAnimation(page)
    // 填入文本
    const textArea = page.locator('textarea[placeholder*="文本"]').first()
    await textArea.fill('<div>Hello & "World"</div>')
    // 点击执行
    const execBtn = page.locator('.btn-decode').first()
    await execBtn.click()
    await waitForAnimation(page)
    await screenshot(page, 'codec', 'html-entity')
  })

  test('颜色转换', async ({ page }) => {
    await gotoTool(page, '/codec/jwt')
    const colorTab = page.locator('.tool-tab:has-text("颜色")').first()
    await colorTab.click()
    await waitForAnimation(page)
    // 填入颜色值
    const hexInput = page.locator('input[placeholder*="#"]').first()
    await hexInput.fill('#3b82f6')
    await waitForAnimation(page)
    await screenshot(page, 'codec', 'color-convert')
  })
})
