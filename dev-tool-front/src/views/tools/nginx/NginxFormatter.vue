<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const { copy: clipboardCopy } = useClipboard()

// ===== Tab State =====
type TabId = 'format' | 'check' | 'diff' | 'templates'
const activeTab = ref<TabId>('format')

// ===== Format Tab State =====
const fmtInput = ref('')
const fmtResult = ref('')
const fmtLoading = ref(false)

// ===== Check Tab State =====
const chkInput = ref('')
const chkLoading = ref(false)
interface SyntaxError { line: number; msg: string }
const chkErrors = ref<SyntaxError[]>([])
const chkPassed = ref(false)
const chkHasRun = ref(false)

// ===== Diff Tab State =====
const diffOldInput = ref('')
const diffNewInput = ref('')
const diffLoading = ref(false)
interface DiffLine { type: 'eq' | 'add' | 'del' | 'mod'; oldLine?: number; newLine?: number; text: string }
const diffResults = ref<DiffLine[]>([])
const diffShowResults = ref(false)

// ===== Template Data =====
interface Template { icon: string; name: string; desc: string; tag: string; config: string }
const templates: Template[] = [
  {
    icon: '⇄', name: '反向代理', desc: '将请求转发到后端服务器', tag: 'proxy',
    config: `# Reverse Proxy
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`
  },
  {
    icon: '⚖', name: '负载均衡', desc: '多后端服务器负载分发', tag: 'upstream',
    config: `# Load Balancer
upstream backend {
    ip_hash;
    server 192.168.1.10:8080 weight=3;
    server 192.168.1.11:8080 weight=2;
    server 192.168.1.12:8080 backup;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://backend;
    }
}`
  },
  {
    icon: '🔒', name: 'SSL/HTTPS', desc: 'SSL/TLS 证书配置模板', tag: 'ssl',
    config: `# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/example.crt;
    ssl_certificate_key /etc/nginx/ssl/example.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://backend:8080;
    }
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}`
  },
  {
    icon: '📁', name: '静态文件', desc: '前端 SPA 静态资源部署', tag: 'static',
    config: `# Static Files
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~* \\.(html)$ {
        add_header Cache-Control "no-cache";
    }
}`
  },
  {
    icon: '⚡', name: '缓存策略', desc: '代理缓存配置模板', tag: 'cache',
    config: `# Proxy Cache
proxy_cache_path /var/cache/nginx levels=1:2
    keys_zone=api_cache:10m max_size=1g inactive=60m;

server {
    listen 80;
    server_name example.com;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_key $scheme$host$request_uri;
        add_header X-Cache-Status $upstream_cache_status;
    }
}`
  },
  {
    icon: '→', name: '重定向', desc: '域名和路径重定向配置', tag: 'redirect',
    config: `# Redirect
server {
    listen 80;
    server_name old-example.com;
    return 301 https://example.com$request_uri;
}

server {
    listen 80;
    server_name example.com;

    location /old-path {
        return 301 /new-path;
    }

    location /new-path {
        proxy_pass http://backend:8080;
    }
}`
  },
  {
    icon: '🔌', name: 'WebSocket', desc: 'WebSocket 连接代理配置', tag: 'websocket',
    config: `# WebSocket Proxy
server {
    listen 80;
    server_name example.com;

    location /ws/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}`
  },
  {
    icon: '🛡', name: '安全头部', desc: '常用安全响应头配置', tag: 'security',
    config: `# Security Headers
server {
    listen 80;
    server_name example.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline';" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://backend:8080;
    }
}`
  },
  {
    icon: '📊', name: '日志配置', desc: '自定义访问和错误日志', tag: 'log',
    config: `# Log Configuration
log_format main '$remote_addr - $remote_user [$time_local] '
               '"$request" $status $body_bytes_sent '
               '"$http_referer" "$http_user_agent"';

server {
    listen 80;
    server_name example.com;

    access_log /var/log/nginx/example_access.log main;
    error_log /var/log/nginx/example_error.log warn;

    location / {
        proxy_pass http://backend:8080;
    }
}`
  }
]

// ===== Line Numbers =====
function lineNumbersText(text: string): string {
  const count = text ? text.split('\n').length : 1
  return Array.from({ length: count }, (_, i) => i + 1).join('\n')
}

const fmtLineNums = computed(() => lineNumbersText(fmtInput.value))
const fmtOutLineNums = computed(() => fmtResult.value ? lineNumbersText(fmtResult.value) : '')
const chkLineNums = computed(() => lineNumbersText(chkInput.value))
const diffOldLineNums = computed(() => lineNumbersText(diffOldInput.value))
const diffNewLineNums = computed(() => lineNumbersText(diffNewInput.value))

// Scroll sync refs
const fmtTextareaRef = ref<HTMLTextAreaElement>()
const fmtLineNumRef = ref<HTMLDivElement>()
const chkTextareaRef = ref<HTMLTextAreaElement>()
const chkLineNumRef = ref<HTMLDivElement>()
const diffOldTextareaRef = ref<HTMLTextAreaElement>()
const diffOldLineNumRef = ref<HTMLDivElement>()
const diffNewTextareaRef = ref<HTMLTextAreaElement>()
const diffNewLineNumRef = ref<HTMLDivElement>()

function syncScroll(textarea: HTMLTextAreaElement | undefined, lineNum: HTMLDivElement | undefined) {
  if (textarea && lineNum) {
    lineNum.scrollTop = textarea.scrollTop
  }
}

// ===== HTML Escape =====
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ===== Nginx Syntax Highlight =====
const NGX_DIRECTIVES = [
  'server', 'location', 'upstream', 'listen', 'server_name', 'root', 'index',
  'proxy_pass', 'proxy_set_header', 'proxy_read_timeout', 'proxy_connect_timeout',
  'proxy_cache', 'proxy_cache_valid', 'proxy_cache_path', 'proxy_cache_key',
  'proxy_http_version', 'return', 'rewrite', 'if', 'else', 'map', 'geo',
  'limit_req', 'limit_conn', 'access_log', 'error_log', 'log_format',
  'include', 'default_server', 'try_files', 'add_header', 'ssl_certificate',
  'ssl_certificate_key', 'ssl_protocols', 'ssl_ciphers', 'ssl_prefer_server_ciphers',
  'ssl_session_cache', 'ssl_session_timeout', 'sendfile', 'tcp_nopush',
  'tcp_nodelay', 'keepalive_timeout', 'gzip', 'gzip_types', 'gzip_min_length',
  'worker_processes', 'events', 'http', 'stream', 'mail', 'types', 'charset',
  'client_max_body_size', 'resolver', 'split_clients',
  'fastcgi_pass', 'fastcgi_param', 'uwsgi_pass', 'scgi_pass'
]

function highlightNginx(code: string): string {
  let html = escapeHtml(code)
  // Comments
  html = html.replace(/(#[^\n]*)/g, '<span class="ngx-comment">$1</span>')
  // Strings in quotes
  html = html.replace(/(&quot;[^&]*?&quot;|"[^"]*?"|'[^']*?')/g, '<span class="ngx-string">$1</span>')
  // Variables $...
  html = html.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="ngx-variable">$1</span>')
  // Directives
  const dirRegex = new RegExp('\\b(' + NGX_DIRECTIVES.join('|') + ')\\b', 'g')
  html = html.replace(dirRegex, '<span class="ngx-directive">$1</span>')
  // Braces
  html = html.replace(/([{}])/g, '<span class="ngx-brace">$1</span>')
  return html
}

const highlightedFmtResult = computed(() => {
  return fmtResult.value ? highlightNginx(fmtResult.value) : ''
})

// ===== Nginx Formatter =====
function spaces(n: number): string {
  return ' '.repeat(n)
}

function formatNginx(input: string): string {
  const lines = input.split('\n')
  const formatted: string[] = []
  let indent = 0

  const BLOCK_DIRECTIVES = [
    'server', 'location', 'upstream', 'events', 'http', 'stream', 'types', 'map', 'geo', 'if', 'limit_req_zone'
  ]

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) { formatted.push(''); continue }

    // Pure comment line
    if (line.startsWith('#')) {
      formatted.push(spaces(indent) + line)
      continue
    }

    // Closing brace
    if (line.startsWith('}')) {
      indent = Math.max(0, indent - 4)
      formatted.push(spaces(indent) + '}')
      if (line.length > 1) {
        formatted[formatted.length - 1] = spaces(indent) + line
      }
      continue
    }

    // Line with both { and }
    if (line.includes('{') && line.includes('}')) {
      formatted.push(spaces(indent) + line)
      continue
    }

    // Opening brace line
    if (line.endsWith('{')) {
      const before = line.slice(0, -1).trim()
      const isBlockDir = BLOCK_DIRECTIVES.some(d => before === d || before.startsWith(d + ' '))
      if (isBlockDir && formatted.length > 0) {
        let lastNonEmpty = formatted.length - 1
        while (lastNonEmpty >= 0 && formatted[lastNonEmpty] === '') lastNonEmpty--
        if (lastNonEmpty >= 0 && formatted[formatted.length - 1] !== '') {
          formatted.push('')
        }
      }
      formatted.push(spaces(indent) + line)
      indent += 4
      continue
    }

    formatted.push(spaces(indent) + line)
  }

  return formatted.join('\n')
}

// ===== Syntax Checker =====
function checkNginxSyntax(input: string): SyntaxError[] {
  const errors: SyntaxError[] = []
  const lines = input.split('\n')
  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue
    const lineNum = i + 1

    // Count braces
    for (const c of line) {
      if (c === '{') braceDepth++
      if (c === '}') braceDepth--
    }

    // Missing semicolon check
    if (!line.endsWith('{') && !line.endsWith('}') && !line.endsWith(';') && !line.startsWith('#')) {
      const words = line.split(/\s+/)
      if (words.length >= 1) {
        errors.push({ line: lineNum, msg: '缺少分号' })
      }
    }

    // Extra closing brace
    if (braceDepth < 0) {
      errors.push({ line: lineNum, msg: '多余的花括号闭合' })
      braceDepth = 0
    }
  }

  // Unclosed braces
  if (braceDepth > 0) {
    errors.push({ line: lines.length, msg: `未闭合的花括号（缺少 ${braceDepth} 个 }）` })
  }

  return errors.slice(0, 20)
}

function highlightNginxWithErrors(code: string, errors: SyntaxError[]): string {
  const lines = code.split('\n')
  const errorLines = new Map<number, SyntaxError>()
  errors.forEach(e => errorLines.set(e.line, e))
  return lines.map((line, idx) => {
    const ln = idx + 1
    const highlighted = highlightNginx(line)
    if (errorLines.has(ln)) {
      return `<div class="chk-error-line"><span class="chk-error-num">${ln}</span> ${highlighted}</div>`
    }
    return `<div>${highlighted}</div>`
  }).join('')
}

// ===== Diff (LCS-based) =====
function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length
  const n = newLines.length
  const oldTrimmed = oldLines.map(l => l.replace(/\s+$/, ''))
  const newTrimmed = newLines.map(l => l.replace(/\s+$/, ''))

  // LCS DP table
  const dp: number[][] = []
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0)
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTrimmed[i - 1] === newTrimmed[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const ops: DiffLine[] = []
  let ci = m, cj = n
  while (ci > 0 || cj > 0) {
    if (ci > 0 && cj > 0 && oldTrimmed[ci - 1] === newTrimmed[cj - 1]) {
      ops.unshift({ type: 'eq', oldLine: ci, newLine: cj, text: oldLines[ci - 1] })
      ci--; cj--
    } else if (cj > 0 && (ci === 0 || dp[ci][cj - 1] >= dp[ci - 1][cj])) {
      ops.unshift({ type: 'add', newLine: cj, text: newLines[cj - 1] })
      cj--
    } else {
      ops.unshift({ type: 'del', oldLine: ci, text: oldLines[ci - 1] })
      ci--
    }
  }

  // Merge adjacent del+add into mod
  const merged: DiffLine[] = []
  let idx = 0
  while (idx < ops.length) {
    if (ops[idx].type === 'del' && idx + 1 < ops.length && ops[idx + 1].type === 'add') {
      merged.push({
        type: 'mod',
        oldLine: ops[idx].oldLine,
        newLine: ops[idx + 1].newLine,
        text: ops[idx].text + ' → ' + ops[idx + 1].text
      })
      idx += 2
    } else {
      merged.push(ops[idx])
      idx++
    }
  }
  return merged
}

// ===== Diff Stats =====
const diffAddCount = computed(() => diffResults.value.filter(r => r.type === 'add').length)
const diffDelCount = computed(() => diffResults.value.filter(r => r.type === 'del').length)
const diffModCount = computed(() => diffResults.value.filter(r => r.type === 'mod').length)

// ===== Actions =====
function doFormat() {
  const input = fmtInput.value.trim()
  if (!input) return
  fmtLoading.value = true
  setTimeout(() => {
    fmtResult.value = formatNginx(input)
    fmtLoading.value = false
  }, 300)
}

function clearFormat() {
  fmtInput.value = ''
  fmtResult.value = ''
}

function doCheck() {
  const input = chkInput.value.trim()
  if (!input) return
  chkLoading.value = true
  chkHasRun.value = true
  setTimeout(() => {
    const errors = checkNginxSyntax(input)
    chkErrors.value = errors
    chkPassed.value = errors.length === 0
    chkLoading.value = false
  }, 300)
}

function clearCheck() {
  chkInput.value = ''
  chkErrors.value = []
  chkPassed.value = false
  chkHasRun.value = false
}

function doDiff() {
  const oldText = diffOldInput.value.trim()
  const newText = diffNewInput.value.trim()
  if (!oldText || !newText) return
  diffLoading.value = true
  setTimeout(() => {
    const oldLines = oldText.split('\n')
    const newLines = newText.split('\n')
    diffResults.value = computeDiff(oldLines, newLines)
    diffShowResults.value = true
    diffLoading.value = false
  }, 400)
}

function applyTemplate(tpl: Template) {
  fmtInput.value = tpl.config
  activeTab.value = 'format'
  // Auto-format
  setTimeout(() => {
    fmtResult.value = formatNginx(tpl.config)
  }, 50)
}

async function handlePaste(target: 'fmt' | 'chk' | 'diffOld' | 'diffNew') {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) return
    if (target === 'fmt') fmtInput.value = text
    else if (target === 'chk') chkInput.value = text
    else if (target === 'diffOld') diffOldInput.value = text
    else if (target === 'diffNew') diffNewInput.value = text
  } catch {
    // clipboard read requires permission
  }
}
</script>

<template>
  <ToolContainer>
    <!-- Tab Bar -->
    <div class="tool-header">
      <button
        class="tool-tab"
        :class="{ active: activeTab === 'format' }"
        @click="activeTab = 'format'"
      >格式化</button>
      <button
        class="tool-tab"
        :class="{ active: activeTab === 'check' }"
        @click="activeTab = 'check'"
      >语法检查</button>
      <button
        class="tool-tab"
        :class="{ active: activeTab === 'diff' }"
        @click="activeTab = 'diff'"
      >Diff 对比</button>
      <button
        class="tool-tab"
        :class="{ active: activeTab === 'templates' }"
        @click="activeTab = 'templates'"
      >模板</button>
    </div>

    <!-- ==================== Tab: Format ==================== -->
    <div v-if="activeTab === 'format'" class="tab-content">
      <div class="dual-editor-container">
        <!-- Input -->
        <div class="editor-col">
          <div class="editor-header">
            <span class="editor-title">输入（Nginx 配置）</span>
            <div class="editor-actions">
              <button class="copy-btn" @click="handlePaste('fmt')">粘贴</button>
              <button class="copy-btn" @click="clearFormat">清空</button>
            </div>
          </div>
          <div class="editor-body">
            <div class="line-numbers" ref="fmtLineNumRef">{{ fmtLineNums }}</div>
            <textarea
              class="editor-textarea"
              ref="fmtTextareaRef"
              v-model="fmtInput"
              spellcheck="false"
              placeholder="请输入 Nginx 配置..."
              @scroll="syncScroll(fmtTextareaRef, fmtLineNumRef)"
            ></textarea>
          </div>
        </div>
        <!-- Format Button Column -->
        <div class="format-btn-col">
          <button class="btn-action" :disabled="!fmtInput.trim() || fmtLoading" @click="doFormat">
            <span v-if="fmtLoading" class="spinner"></span>{{ fmtLoading ? '处理中' : '格式化' }}
          </button>
        </div>
        <!-- Output -->
        <div class="editor-col">
          <div class="editor-header">
            <span class="editor-title">输出（格式化）</span>
            <div class="editor-actions">
              <CopyButton v-if="fmtResult" :text="fmtResult" label="复制" />
            </div>
          </div>
          <div class="editor-body output">
            <div class="line-numbers">{{ fmtOutLineNums }}</div>
            <div v-if="fmtResult" class="editor-output" v-html="highlightedFmtResult"></div>
            <div v-else class="editor-output placeholder-text">格式化后的配置将显示在这里</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== Tab: Syntax Check ==================== -->
    <div v-if="activeTab === 'check'" class="tab-content">
      <div class="dual-editor-container">
        <!-- Input -->
        <div class="editor-col">
          <div class="editor-header">
            <span class="editor-title">输入（Nginx 配置）</span>
            <div class="editor-actions">
              <button class="copy-btn" @click="handlePaste('chk')">粘贴</button>
              <button class="copy-btn" @click="clearCheck">清空</button>
            </div>
          </div>
          <div class="editor-body">
            <div class="line-numbers" ref="chkLineNumRef">{{ chkLineNums }}</div>
            <textarea
              class="editor-textarea"
              ref="chkTextareaRef"
              v-model="chkInput"
              spellcheck="false"
              placeholder="请输入 Nginx 配置进行语法检查..."
              @scroll="syncScroll(chkTextareaRef, chkLineNumRef)"
            ></textarea>
          </div>
        </div>
        <!-- Check Button Column -->
        <div class="format-btn-col">
          <button class="btn-action" :disabled="!chkInput.trim() || chkLoading" @click="doCheck">
            <span v-if="chkLoading" class="spinner"></span>{{ chkLoading ? '处理中' : '检查' }}
          </button>
        </div>
        <!-- Results -->
        <div class="editor-col">
          <div class="editor-header">
            <span class="editor-title">检查结果</span>
            <div class="editor-actions"></div>
          </div>
          <div v-if="!chkHasRun" class="panel-body empty">输入配置后点击「检查」查看结果</div>
          <div v-else-if="chkPassed" class="panel-body check-pass">
            <div class="check-pass-title">&#10003; 语法检查通过</div>
            <div class="check-highlighted" v-html="highlightNginx(chkInput)"></div>
          </div>
          <div v-else class="panel-body check-fail">
            <div class="check-fail-title">&#10007; 发现 {{ chkErrors.length }} 个错误</div>
            <div v-for="(err, idx) in chkErrors" :key="idx" class="chk-error-item">
              <span class="chk-error-line">第 {{ err.line }} 行：</span>{{ err.msg }}
            </div>
            <div class="chk-code-section" v-html="highlightNginxWithErrors(chkInput, chkErrors)"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== Tab: Diff ==================== -->
    <div v-if="activeTab === 'diff'" class="tab-content">
      <div class="dual-editor-container">
        <!-- Old Config -->
        <div class="editor-col">
          <div class="editor-header">
            <span class="editor-title">旧配置</span>
            <div class="editor-actions">
              <button class="copy-btn" @click="handlePaste('diffOld')">粘贴</button>
            </div>
          </div>
          <div class="editor-body">
            <div class="line-numbers" ref="diffOldLineNumRef">{{ diffOldLineNums }}</div>
            <textarea
              class="editor-textarea"
              ref="diffOldTextareaRef"
              v-model="diffOldInput"
              spellcheck="false"
              placeholder="请输入旧版 Nginx 配置..."
              @scroll="syncScroll(diffOldTextareaRef, diffOldLineNumRef)"
            ></textarea>
          </div>
        </div>
        <!-- Diff Button Column -->
        <div class="format-btn-col">
          <button
            class="btn-action"
            :disabled="!(diffOldInput.trim() && diffNewInput.trim()) || diffLoading"
            @click="doDiff"
          >
            <span v-if="diffLoading" class="spinner"></span>{{ diffLoading ? '处理中' : '对比' }}
          </button>
        </div>
        <!-- New Config -->
        <div class="editor-col">
          <div class="editor-header">
            <span class="editor-title">新配置</span>
            <div class="editor-actions">
              <button class="copy-btn" @click="handlePaste('diffNew')">粘贴</button>
            </div>
          </div>
          <div class="editor-body">
            <div class="line-numbers" ref="diffNewLineNumRef">{{ diffNewLineNums }}</div>
            <textarea
              class="editor-textarea"
              ref="diffNewTextareaRef"
              v-model="diffNewInput"
              spellcheck="false"
              placeholder="请输入新版 Nginx 配置..."
              @scroll="syncScroll(diffNewTextareaRef, diffNewLineNumRef)"
            ></textarea>
          </div>
        </div>
      </div>
      <!-- Diff Results -->
      <div v-if="diffShowResults" class="diff-results">
        <div class="diff-stats">
          <span class="stat-add">+ 新增 {{ diffAddCount }} 行</span>
          <span class="stat-del">- 删除 {{ diffDelCount }} 行</span>
          <span class="stat-mod">~ 修改 {{ diffModCount }} 行</span>
          <span class="stat-total">共 {{ diffResults.length }} 行</span>
        </div>
        <div class="diff-body">
          <div
            v-for="(r, i) in diffResults"
            :key="i"
            class="diff-line"
            :class="{
              'diff-line-add': r.type === 'add',
              'diff-line-del': r.type === 'del',
              'diff-line-mod': r.type === 'mod'
            }"
          >
            <span class="diff-line-num">{{ r.oldLine || '' }}</span>
            <span class="diff-line-num">{{ r.newLine || '' }}</span>
            {{ r.type === 'add' ? '+' : r.type === 'del' ? '-' : r.type === 'mod' ? '~' : ' ' }}
            {{ r.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== Tab: Templates ==================== -->
    <div v-if="activeTab === 'templates'" class="tab-content">
      <div class="templates-grid">
        <div
          v-for="(tpl, idx) in templates"
          :key="idx"
          class="template-card"
          @click="applyTemplate(tpl)"
        >
          <div class="template-card-icon">{{ tpl.icon }}</div>
          <div class="template-card-name">{{ tpl.name }}</div>
          <div class="template-card-desc">{{ tpl.desc }}</div>
          <div class="template-card-tag">{{ tpl.tag }}</div>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
/* Dual editor layout */
.dual-editor-container {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.editor-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.editor-col .editor-header {
  flex-shrink: 0;
}
.editor-col .editor-body {
  flex: 1;
  min-height: 200px;
}

/* Format button column */
.format-btn-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 4px;
  flex-shrink: 0;
}
.btn-action {
  padding: 9px 20px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-action:hover { opacity: 0.9; }
.btn-action:disabled { opacity: 0.45; cursor: not-allowed; }
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 4px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Copy button (small) */
.copy-btn {
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--bg-white);
  color: var(--text-muted);
  font-size: 11px;
  border: 1px solid var(--border-input);
  cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }

/* Output placeholder */
.placeholder-text {
  color: var(--text-placeholder);
  font-style: italic;
}

/* Nginx syntax highlight */
:deep(.ngx-directive) { color: #2563eb; font-weight: 500; }
:deep(.ngx-string) { color: #16a34a; }
:deep(.ngx-comment) { color: #94a3b8; font-style: italic; }
:deep(.ngx-brace) { font-weight: 700; color: #475569; }
:deep(.ngx-variable) { color: #7c3aed; }

/* Panel body (syntax check output) */
.panel-body {
  border: 1px solid var(--border-card);
  border-radius: 0 0 8px 8px;
  background: var(--bg-code-alt);
  padding: 10px 12px;
  min-height: 200px;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.panel-body.empty { color: var(--text-placeholder); font-style: italic; }

/* Syntax check: pass */
.check-pass { color: #16a34a; }
.check-pass-title { font-weight: 500; margin-bottom: 8px; font-size: 14px; }
.check-highlighted { color: var(--text-primary); }

/* Syntax check: fail */
.check-fail { color: #dc2626; }
.check-fail-title { font-weight: 500; margin-bottom: 8px; font-size: 14px; }
.chk-error-item { padding: 4px 0; font-size: 12px; font-family: 'Consolas', monospace; }
.chk-error-line { font-weight: 600; }
.chk-code-section { margin-top: 12px; border-top: 1px solid #fecaca; padding-top: 12px; }
:deep(.chk-error-line) {
  background: #fee2e2;
  border-radius: 3px;
  padding: 1px 4px;
}
:deep(.chk-error-num) {
  color: #dc2626;
  font-weight: 600;
}

/* Diff */
.diff-results { margin-top: 16px; }
.diff-stats {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-code);
  border: 1px solid var(--border-card);
  border-radius: 8px 8px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.stat-add { color: #16a34a; font-weight: 600; }
.stat-del { color: #dc2626; font-weight: 600; }
.stat-mod { color: #d97706; font-weight: 600; }
.stat-total { color: var(--text-muted); }
.diff-body {
  border: 1px solid var(--border-card);
  border-top: none;
  border-radius: 0 0 8px 8px;
  background: var(--bg-code-alt);
  padding: 10px 12px;
  max-height: 400px;
  overflow: auto;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.diff-line { padding: 1px 4px; border-radius: 2px; }
.diff-line-add { background: #dcfce7; color: #166534; }
.diff-line-del { background: #fee2e2; color: #991b1b; }
.diff-line-mod { background: #fef3c7; color: #92400e; }
.diff-line-num {
  display: inline-block;
  width: 36px;
  color: var(--text-disabled);
  user-select: none;
}

/* Templates grid */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.template-card {
  padding: 16px 18px;
  border: 1px solid var(--border-card);
  border-radius: 8px;
  background: var(--bg-white);
  cursor: pointer;
  transition: all 0.15s ease;
}
.template-card:hover {
  border-color: var(--primary);
  background: var(--primary-light);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
}
.template-card-icon { font-size: 22px; margin-bottom: 8px; }
.template-card-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.template-card-desc { font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.5; }
.template-card-tag {
  display: inline-block;
  margin-top: 6px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--bg-hover);
  color: var(--text-muted);
}
</style>
