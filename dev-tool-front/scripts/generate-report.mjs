/**
 * Post-processing script: reads Playwright JSON results + error-context.md files,
 * generates a failure-analysis-enriched HTML report.
 *
 * Usage: node scripts/generate-report.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const reportDir = join(projectRoot, 'e2e-report')
const testResultsDir = join(projectRoot, 'test-results')

// ── Helpers ──────────────────────────────────────────────

function readJson(filePath) {
  if (!existsSync(filePath)) return null
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Collect all specs recursively ────────────────────────

function collectSpecs(suites, path = '', results = []) {
  for (const suite of suites) {
    const suiteTitle = suite.title || ''
    const fullPath = path ? `${path} › ${suiteTitle}` : suiteTitle
    for (const spec of suite.specs || []) {
      const tests = spec.tests || []
      for (const test of tests) {
        const testResults = test.results || []
        for (const r of testResults) {
          const status = r.status === 'expected' ? 'passed'
            : r.status === 'unexpected' ? 'failed'
            : r.status === 'timedOut' ? 'timedOut'
            : r.status
          results.push({
            specTitle: spec.title,
            suitePath: fullPath,
            file: spec.file || '',
            line: spec.line || 0,
            status,
            duration: r.duration || 0,
            error: r.error || {},
            attachments: r.attachments || [],
            retry: r.retry || 0,
          })
        }
      }
    }
    collectSpecs(suite.suites || [], fullPath, results)
  }
  return results
}

// ── Failure Analysis Engine ──────────────────────────────

function analyzeFailure(spec) {
  const errMsg = (spec.error?.message || '').toLowerCase()
  const errStack = (spec.error?.stack || '').toLowerCase()
  const combined = `${errMsg} ${errStack}`

  // Pattern: selectOption label regex
  if (combined.includes('selectoption') && combined.includes('expected string, got object')) {
    return {
      category: 'API 误用',
      icon: '🔧',
      summary: 'selectOption() 的 label 参数传了正则对象，但 Playwright 只接受字符串',
      detail: '测试代码用了 selectOption({ label: /正则/ })，Playwright 的 label 字段必须是精确字符串，不支持正则匹配。',
      fix: '改为 selectOption({ label: "0x" }) 或 selectOption("0x")，先通过 page.locator("select").innerHTML() 确认实际 option 文本。',
    }
  }

  // Pattern: timeout on fill (readonly element)
  if (combined.includes('not editable') && combined.includes('timeout')) {
    return {
      category: '选择器冲突',
      icon: '🎯',
      summary: '定位器匹配到了 readonly 的全局搜索框，导致 fill() 永远超时',
      detail: 'CSS 选择器 `.calc-input, input` 太宽泛，页面上第一个匹配到的是侧边栏搜索框 (readonly)，不是目标输入框。',
      fix: '使用更精确的选择器，如 .calc-input 或添加 data-testid 属性到目标输入框。',
    }
  }

  // Pattern: timeout exceeded
  if (combined.includes('timeout') && spec.status === 'timedOut') {
    return {
      category: '超时',
      icon: '⏱️',
      summary: '测试在 30 秒内未完成，通常是因为元素定位失败导致无限等待',
      detail: '操作等待某个元素变为可交互状态，但该元素始终不满足条件。常见于选择器匹配到错误元素或页面未完全加载。',
      fix: '检查定位器是否精确匹配目标元素；考虑增加 waitForSelector 或检查页面是否正确路由。',
    }
  }

  // Pattern: toMatch / toContain assertion failure
  if (combined.includes('tomatch') || combined.includes('tocontain')) {
    return {
      category: '断言不匹配',
      icon: '❌',
      summary: '页面实际输出内容与测试期望的正则/字符串不匹配',
      detail: extractMismatchDetail(spec),
      fix: '查看截图确认页面实际显示了什么，然后更新断言或修复组件逻辑。可能是：组件静默过滤了无效输入而非报错，或错误提示文本与测试正则不一致。',
    }
  }

  // Pattern: locator not found
  if (combined.includes('waiting for locator') && !combined.includes('not editable')) {
    return {
      category: '元素未找到',
      icon: '🔍',
      summary: 'CSS 选择器在页面上找不到匹配的元素',
      detail: '测试使用的 CSS 选择器与页面实际 DOM 结构不匹配。页面可能使用了不同的类名或嵌套结构。',
      fix: '使用 Playwright 的 page.locator() 配合 hasText 过滤，或给目标元素添加 data-testid。',
    }
  }

  // Generic fallback
  return {
    category: '其他',
    icon: '⚠️',
    summary: spec.error?.message?.slice(0, 150) || '未知错误',
    detail: '需要查看完整的 Trace 和截图来确定具体原因。',
    fix: '使用 npx playwright show-trace 查看 Trace 文件，逐步检查 DOM 变化。',
  }
}

function extractMismatchDetail(spec) {
  const msg = spec.error?.message || ''
  const expectedMatch = msg.match(/Expected pattern: (.+)/)
  const receivedMatch = msg.match(/Received string:\s*"?\s*([\s\S]*?)(?:"\n|$)/)

  let detail = '断言期望的内容未出现在页面文本中。'
  if (expectedMatch) {
    detail += `期望匹配: ${expectedMatch[1]}。`
  }
  if (receivedMatch) {
    const received = receivedMatch[1].replace(/\n/g, ' ').trim().slice(0, 200)
    detail += `页面实际内容: "${received}"`
  }
  return detail
}

// ── Generate HTML ────────────────────────────────────────

function generateReport(data) {
  const { specs, stats, date } = data
  const passed = specs.filter(s => s.status === 'passed')
  const failed = specs.filter(s => s.status === 'failed' || s.status === 'timedOut')

  // Category breakdown
  const categoryCount = {}
  const specByModule = {}
  for (const s of specs) {
    const module = s.suitePath.split(' › ')[1] || s.suitePath
    if (!specByModule[module]) specByModule[module] = []
    specByModule[module].push(s)
    if (s.status === 'failed' || s.status === 'timedOut') {
      const cat = s.analysis?.category || '其他'
      categoryCount[cat] = (categoryCount[cat] || 0) + 1
    }
  }

  // Duration
  const totalDuration = specs.reduce((acc, s) => acc + s.duration, 0)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DevToolkit E2E 测试报告 - 失败分析</title>
<style>
  :root { --pass: #16a34a; --fail: #dc2626; --warn: #d97706; --bg: #f8fafc; --card: #fff; --border: #e2e8f0; --text: #1e293b; --muted: #64748b; --accent: #3b82f6; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 1.75rem; margin-bottom: 8px; }
  .subtitle { color: var(--muted); margin-bottom: 24px; font-size: 0.9rem; }

  /* Stats bar */
  .stats-bar { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px 24px; min-width: 140px; }
  .stat-card .num { font-size: 2rem; font-weight: 700; }
  .stat-card .label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-pass .num { color: var(--pass); }
  .stat-fail .num { color: var(--fail); }
  .stat-time .num { color: var(--accent); }
  .stat-rate .num { color: ${stats.passRate >= 80 ? 'var(--pass)' : stats.passRate >= 60 ? 'var(--warn)' : 'var(--fail)'}; }

  /* Progress bar */
  .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; margin-bottom: 24px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--pass); border-radius: 4px; transition: width 0.5s; }

  /* Tabs */
  .tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid var(--border); }
  .tab { padding: 10px 20px; cursor: pointer; font-weight: 500; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab .badge { display: inline-block; min-width: 20px; padding: 1px 6px; border-radius: 10px; font-size: 0.75rem; margin-left: 4px; }
  .tab .badge-pass { background: #dcfce7; color: var(--pass); }
  .tab .badge-fail { background: #fee2e2; color: var(--fail); }

  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Module card */
  .module { background: var(--card); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
  .module-header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
  .module-header:hover { background: #f1f5f9; }
  .module-title { font-weight: 600; font-size: 0.95rem; }
  .module-stats { display: flex; gap: 12px; align-items: center; font-size: 0.85rem; }
  .module-body { border-top: 1px solid var(--border); padding: 0; }
  .module-body.collapsed { display: none; }

  /* Test row */
  .test-row { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; gap: 10px; }
  .test-row:last-child { border-bottom: none; }
  .test-icon { flex-shrink: 0; width: 20px; text-align: center; margin-top: 2px; font-size: 0.9rem; }
  .test-info { flex: 1; min-width: 0; }
  .test-name { font-weight: 500; font-size: 0.9rem; }
  .test-meta { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

  /* Failure analysis box */
  .analysis { background: #fef2f2; border-left: 3px solid var(--fail); border-radius: 0 6px 6px 0; padding: 12px 16px; margin-top: 8px; }
  .analysis-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .analysis-icon { font-size: 1.1rem; }
  .analysis-category { font-weight: 600; font-size: 0.85rem; color: var(--fail); }
  .analysis-summary { font-weight: 500; font-size: 0.88rem; margin-bottom: 6px; }
  .analysis-detail { font-size: 0.82rem; color: #475569; margin-bottom: 8px; white-space: pre-line; }
  .analysis-fix { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 8px 12px; font-size: 0.82rem; }
  .analysis-fix::before { content: '💡 修复建议: '; font-weight: 600; }

  /* Error raw */
  .error-raw { background: #1e293b; color: #e2e8f0; padding: 10px 14px; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 0.78rem; margin-top: 8px; white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow-y: auto; }

  /* Link */
  .link { color: var(--accent); text-decoration: none; font-size: 0.82rem; }
  .link:hover { text-decoration: underline; }

  /* Category summary */
  .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .cat-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }
  .cat-card .cat-icon { font-size: 1.5rem; }
  .cat-card .cat-name { font-weight: 600; font-size: 0.9rem; margin: 4px 0; }
  .cat-card .cat-count { font-size: 1.5rem; font-weight: 700; color: var(--fail); }
</style>
</head>
<body>
<div class="container">
  <h1>DevToolkit E2E 测试报告</h1>
  <p class="subtitle">测试时间: ${date} | 总耗时: ${(totalDuration / 1000).toFixed(1)}s | 浏览器: Chromium | <a class="link" href="html/index.html" target="_blank">打开 Playwright 原始报告 (截图/Trace/Video)</a></p>

  <div class="stats-bar">
    <div class="stat-card stat-total"><div class="num">${stats.total}</div><div class="label">总用例</div></div>
    <div class="stat-card stat-pass"><div class="num">${stats.passed}</div><div class="label">通过</div></div>
    <div class="stat-card stat-fail"><div class="num">${stats.failed}</div><div class="label">失败</div></div>
    <div class="stat-card stat-time"><div class="num">${(totalDuration / 1000).toFixed(1)}s</div><div class="label">总耗时</div></div>
    <div class="stat-card stat-rate"><div class="num">${stats.passRate}%</div><div class="label">通过率</div></div>
  </div>

  <div class="progress-bar"><div class="progress-fill" style="width: ${stats.passRate}%"></div></div>

  <div class="cat-grid">
    ${Object.entries(categoryCount).map(([cat, count]) => {
      const firstAnalysis = failed.find(f => f.analysis?.category === cat)?.analysis
      return `<div class="cat-card"><div class="cat-icon">${firstAnalysis?.icon || '⚠️'}</div><div class="cat-name">${cat}</div><div class="cat-count">${count}</div></div>`
    }).join('\n    ')}
  </div>

  <div class="tabs">
    <div class="tab active" onclick="switchTab('all')">全部<span class="badge badge-pass">${stats.total}</span></div>
    <div class="tab" onclick="switchTab('failed')">失败分析<span class="badge badge-fail">${stats.failed}</span></div>
    <div class="tab" onclick="switchTab('passed')">通过<span class="badge badge-pass">${stats.passed}</span></div>
  </div>

  <div id="tab-all" class="tab-content active">
    ${renderModules(specByModule, false)}
  </div>
  <div id="tab-failed" class="tab-content">
    ${renderModules(specByModule, true)}
  </div>
  <div id="tab-passed" class="tab-content">
    ${renderPassedList(passed)}
  </div>
</div>

<script>
function switchTab(id) {
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  event.target.closest('.tab').classList.add('active');
}
function toggleModule(id) {
  const body = document.getElementById('mod-' + id);
  body.classList.toggle('collapsed');
}
</script>
</body>
</html>`
}

function renderModules(specByModule, failedOnly) {
  let idx = 0
  return Object.entries(specByModule).map(([module, specs]) => {
    const displaySpecs = failedOnly ? specs.filter(s => s.status !== 'passed') : specs
    if (displaySpecs.length === 0) return ''
    const passCount = specs.filter(s => s.status === 'passed').length
    const failCount = specs.filter(s => s.status !== 'passed').length
    const idxStr = String(idx++)
    return `
    <div class="module">
      <div class="module-header" onclick="toggleModule('${idxStr}')">
        <span class="module-title">${escapeHtml(module)}</span>
        <div class="module-stats">
          ${passCount > 0 ? `<span style="color:var(--pass)">✓ ${passCount}</span>` : ''}
          ${failCount > 0 ? `<span style="color:var(--fail)">✗ ${failCount}</span>` : ''}
          <span style="color:var(--muted)">${(specs.reduce((a, s) => a + s.duration, 0) / 1000).toFixed(1)}s</span>
        </div>
      </div>
      <div class="module-body collapsed" id="mod-${idxStr}">
        ${displaySpecs.map(s => renderTestRow(s)).join('\n        ')}
      </div>
    </div>`
  }).join('\n  ')
}

function renderTestRow(spec) {
  const isPass = spec.status === 'passed'
  const icon = isPass ? '✅' : '❌'
  const duration = (spec.duration / 1000).toFixed(1)

  let html = `
        <div class="test-row">
          <div class="test-icon">${icon}</div>
          <div class="test-info">
            <div class="test-name">${escapeHtml(spec.specTitle)}</div>
            <div class="test-meta">${spec.file}:${spec.line} | ${duration}s</div>`

  if (!isPass && spec.analysis) {
    html += `
            <div class="analysis">
              <div class="analysis-header">
                <span class="analysis-icon">${spec.analysis.icon}</span>
                <span class="analysis-category">${escapeHtml(spec.analysis.category)}</span>
              </div>
              <div class="analysis-summary">${escapeHtml(spec.analysis.summary)}</div>
              <div class="analysis-detail">${escapeHtml(spec.analysis.detail)}</div>
              <div class="analysis-fix">${escapeHtml(spec.analysis.fix)}</div>
            </div>`

    const errMsg = spec.error?.message || ''
    if (errMsg) {
      html += `\n            <div class="error-raw">${escapeHtml(errMsg.slice(0, 500))}</div>`
    }
  }

  html += `
          </div>
        </div>`
  return html
}

function renderPassedList(passed) {
  const grouped = {}
  for (const s of passed) {
    const mod = s.suitePath.split(' › ')[1] || s.suitePath
    if (!grouped[mod]) grouped[mod] = []
    grouped[mod].push(s)
  }

  return Object.entries(grouped).map(([mod, specs]) => `
    <div class="module">
      <div class="module-header">
        <span class="module-title">${escapeHtml(mod)}</span>
        <span class="module-stats"><span style="color:var(--pass)">✓ ${specs.length}</span></span>
      </div>
    </div>`).join('\n  ')
}

// ── Main ─────────────────────────────────────────────────

const jsonPath = join(reportDir, 'test-results.json')
const data = readJson(jsonPath)

if (!data) {
  console.error(`No test results found at ${jsonPath}. Run tests first.`)
  process.exit(1)
}

const specs = collectSpecs(data.suites || [])

// Attach failure analysis
for (const spec of specs) {
  if (spec.status !== 'passed') {
    spec.analysis = analyzeFailure(spec)
  }
}

const passed = specs.filter(s => s.status === 'passed').length
const failed = specs.filter(s => s.status !== 'passed').length
const stats = {
  total: specs.length,
  passed,
  failed,
  passRate: specs.length > 0 ? Math.round(passed / specs.length * 100) : 0,
}

const date = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

const html = generateReport({ specs, stats, date })
const outPath = join(reportDir, 'index.html')

import { writeFileSync } from 'fs'
writeFileSync(outPath, html, 'utf-8')
console.log(`\n✅ Report generated: ${outPath}`)
console.log(`   Passed: ${passed} / ${specs.length} (${stats.passRate}%)`)
console.log(`   Failed: ${failed} (with analysis)`)
console.log(`   Playwright report: ${join(reportDir, 'html', 'index.html')}\n`)
