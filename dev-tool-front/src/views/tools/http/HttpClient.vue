<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { getHttpService } from '@/services'

const methods = [
  { name: 'GET', color: '#16a34a' },
  { name: 'POST', color: '#3b82f6' },
  { name: 'PUT', color: '#ea580c' },
  { name: 'DELETE', color: '#dc2626' },
  { name: 'PATCH', color: '#7c3aed' },
]

const method = ref('GET')
const url = ref('')
const isLoading = ref(false)
const error = ref('')

// Request config tab
type ReqTab = 'params' | 'headers' | 'body' | 'auth'
const activeReqTab = ref<ReqTab>('params')

// Params
const params = ref<{ key: string; value: string }[]>([{ key: '', value: '' }])

// Headers
const headers = ref<{ key: string; value: string }[]>([
  { key: 'Content-Type', value: 'application/json' },
])

// Body
const bodyType = ref<'none' | 'json' | 'xml' | 'text' | 'form'>('json')
const bodyText = ref('')

const bodyContentTypes: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  text: 'text/plain',
  form: 'application/x-www-form-urlencoded',
}

const bodyPlaceholders: Record<string, string> = {
  json: '{\n  "key": "value"\n}',
  xml: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <key>value</key>\n</root>',
  text: '输入纯文本内容...',
  form: 'param1=value1&param2=value2',
}

const showBodyEditor = computed(() =>
  ['POST', 'PUT', 'PATCH'].includes(method.value)
)

const showTextareaBody = computed(() =>
  ['json', 'xml', 'text', 'form'].includes(bodyType.value)
)

// Auth
type AuthType = 'none' | 'bearer' | 'basic' | 'ssl'
const authType = ref<AuthType>('none')
const bearerToken = ref('')
const basicUser = ref('')
const basicPass = ref('')

// SSL
type SSLMode = 'oneway' | 'mutual'
const sslMode = ref<SSLMode>('oneway')
const sslCaCert = ref('')
const sslClientCert = ref('')
const sslClientKey = ref('')
const sslMutualCaCert = ref('')
const sslSkipVerify = ref(true)
const sslKeyVisible = ref(false)

// Response
interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  elapsed: number
  size: number
}

const response = ref<ResponseData | null>(null)
type ResTab = 'body' | 'headers' | 'cookies'
const activeResTab = ref<ResTab>('body')

// Curl import
const showCurlImport = ref(false)
const curlText = ref('')

// History
interface HistoryEntry {
  method: string
  url: string
  timestamp: number
}
const history = ref<HistoryEntry[]>([])

// KV helpers
function addKvRow(list: { key: string; value: string }[]) {
  list.push({ key: '', value: '' })
}

function removeKvRow(list: { key: string; value: string }[], index: number) {
  if (list.length > 1) {
    list.splice(index, 1)
  }
}

// Auto-set Content-Type header when body type changes
watch(bodyType, (newType) => {
  if (newType === 'none') return
  const ct = bodyContentTypes[newType]
  if (!ct) return
  const existing = headers.value.find(
    h => h.key.toLowerCase() === 'content-type'
  )
  if (existing) {
    existing.value = ct
  } else {
    headers.value.push({ key: 'Content-Type', value: ct })
  }
})

// Auto-extract params from URL
watch(url, (newUrl) => {
  try {
    const u = new URL(newUrl)
    const searchParams = u.searchParams
    if (searchParams.toString()) {
      const extracted: { key: string; value: string }[] = []
      searchParams.forEach((v, k) => {
        extracted.push({ key: k, value: v })
      })
      if (extracted.length > 0) {
        params.value = extracted
        // Remove query string from URL
        url.value = u.origin + u.pathname
      }
    }
  } catch {
    // not a valid URL yet
  }
})

// Method dedup guard
function selectMethod(m: string) {
  if (m === method.value) return
  method.value = m
}

// Request tab dedup
function switchReqTab(tab: ReqTab) {
  if (tab === activeReqTab.value) return
  activeReqTab.value = tab
}

// Body type dedup
function switchBodyType(type: 'none' | 'json' | 'xml' | 'text' | 'form') {
  if (type === bodyType.value) return
  bodyType.value = type
}

// Auth type dedup
function switchAuthType(type: AuthType) {
  if (type === authType.value) return
  authType.value = type
}

// Response tab dedup
function switchResTab(tab: ResTab) {
  if (tab === activeResTab.value) return
  activeResTab.value = tab
}

// Send request
async function sendRequest() {
  if (!url.value.trim()) {
    error.value = '请输入 URL'
    return
  }

  let requestUrl = url.value.trim()
  if (!/^https?:\/\//i.test(requestUrl)) {
    requestUrl = 'https://' + requestUrl
  }

  // Append params
  const paramParts = params.value
    .filter(p => p.key.trim())
    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
  if (paramParts.length > 0) {
    requestUrl += (requestUrl.includes('?') ? '&' : '?') + paramParts.join('&')
  }

  // Build headers
  const headerObj: Record<string, string> = {}
  for (const h of headers.value) {
    if (h.key.trim()) {
      headerObj[h.key.trim()] = h.value
    }
  }

  // Auth headers
  if (authType.value === 'bearer' && bearerToken.value.trim()) {
    headerObj['Authorization'] = `Bearer ${bearerToken.value.trim()}`
  } else if (authType.value === 'basic' && basicUser.value.trim()) {
    headerObj['Authorization'] = `Basic ${btoa(`${basicUser.value}:${basicPass.value}`)}`
  }

  error.value = ''
  isLoading.value = true
  response.value = null
  activeResTab.value = 'body'

  try {
    const reqBody = (showBodyEditor.value && bodyType.value !== 'none' && bodyText.value.trim())
      ? bodyText.value.trim()
      : undefined

    const service = getHttpService()
    const result = await service.sendRequest({
      method: method.value as HttpRequestConfig['method'],
      url: requestUrl,
      headers: headerObj,
      body: reqBody,
      bodyType: bodyType.value === 'form' ? 'urlencoded' : bodyType.value === 'none' ? undefined : bodyType.value,
      timeout: 30000,
    })

    if (result.success && result.data) {
      const d = result.data
      response.value = {
        status: d.status,
        statusText: d.statusText,
        headers: d.headers,
        body: d.body,
        elapsed: d.elapsed,
        size: new Blob([d.body]).size,
      }
    } else {
      error.value = result.error?.message || '请求失败'
    }
  } catch (e: any) {
    error.value = e.message || '请求失败'
  } finally {
    isLoading.value = false
    addHistory()
  }
}

function addHistory() {
  let path = url.value.trim()
  try {
    path = new URL(url.value.trim()).pathname
  } catch { /* keep raw */ }
  history.value.unshift({
    method: method.value,
    url: url.value.trim(),
    timestamp: Date.now(),
  })
  if (history.value.length > 20) {
    history.value = history.value.slice(0, 20)
  }
}

function clearHistory() {
  history.value = []
}

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return 'status-success'
  if (status >= 300 && status < 400) return 'status-redirect'
  if (status >= 400 && status < 500) return 'status-client-error'
  return 'status-server-error'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}

function formatResponseBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

function getResponseCookies(): { key: string; value: string }[] {
  if (!response.value) return []
  const setCookie = response.value.headers['set-cookie']
  if (!setCookie) return []
  const cookies: { key: string; value: string }[] = []
  const items = Array.isArray(setCookie) ? setCookie : [setCookie]
  for (const item of items) {
    const parts = item.split(';')[0].split('=')
    cookies.push({ key: parts[0].trim(), value: parts.slice(1).join('=').trim() })
  }
  return cookies
}

// cURL import
function parseCurl(text: string) {
  const cmd = text.replace(/\\\n/g, ' ').replace(/\\\r\n/g, ' ')

  const methodMatch = cmd.match(/-X\s+(\w+)/)
  let m = methodMatch ? methodMatch[1].toUpperCase() : 'GET'

  const urlMatch = cmd.match(/['"]?(https?:\/\/[^'"\s]+)['"]?/)
  const u = urlMatch ? urlMatch[1] : ''

  if (!methodMatch && (cmd.includes('-d ') || cmd.includes('--data ') || cmd.includes('--data-raw '))) {
    m = 'POST'
  }

  const headerRegex = /-H\s+['"]([^'"]+)['"]/g
  const parsedHeaders: { key: string; value: string }[] = []
  let hMatch
  while ((hMatch = headerRegex.exec(cmd)) !== null) {
    const parts = hMatch[1].split(':')
    parsedHeaders.push({ key: parts.shift()!.trim(), value: parts.join(':').trim() })
  }

  const bodyMatch = cmd.match(/(?:-d|--data|--data-raw)\s+['"](.+?)['"]/)
  const b = bodyMatch ? bodyMatch[1] : ''

  method.value = m
  if (u) url.value = u
  if (parsedHeaders.length > 0) headers.value = parsedHeaders
  if (b) {
    bodyText.value = b
    bodyType.value = 'json'
  }
}

function exportCurl() {
  const parts = ['curl']
  parts.push(`-X ${method.value}`)

  for (const h of headers.value) {
    if (h.key.trim()) {
      parts.push(`-H '${h.key}: ${h.value}'`)
    }
  }

  if (authType.value === 'bearer' && bearerToken.value.trim()) {
    parts.push(`-H 'Authorization: Bearer ${bearerToken.value.trim()}'`)
  } else if (authType.value === 'basic' && basicUser.value.trim()) {
    parts.push(`-H 'Authorization: Basic ${btoa(`${basicUser.value}:${basicPass.value}`)}'`)
  }

  let curlUrl = url.value.trim()
  const paramParts = params.value
    .filter(p => p.key.trim())
    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
  if (paramParts.length > 0) {
    curlUrl += (curlUrl.includes('?') ? '&' : '?') + paramParts.join('&')
  }
  parts.push(`'${curlUrl}'`)

  if (sslSkipVerify.value) parts.push('-k')

  if (showBodyEditor.value && bodyText.value.trim()) {
    parts.push(`-d '${bodyText.value.trim()}'`)
  }

  return parts.join(' \\\n  ')
}

function handleFileUpload(event: Event, target: 'sslCaCert' | 'sslClientCert' | 'sslClientKey' | 'sslMutualCaCert') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 1024 * 1024) {
    error.value = '文件大小超过 1MB 限制'
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    switch (target) {
      case 'sslCaCert': sslCaCert.value = content; break
      case 'sslClientCert': sslClientCert.value = content; break
      case 'sslClientKey': sslClientKey.value = content; break
      case 'sslMutualCaCert': sslMutualCaCert.value = content; break
    }
  }
  reader.readAsText(file)
}

import type { HttpRequestConfig } from '@/types/api'
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">HTTP 客户端</h3>
    </div>
    <div class="tool-content">
      <!-- Request bar -->
      <div class="request-bar">
        <div class="method-badges">
          <div
            v-for="m in methods"
            :key="m.name"
            class="method-badge"
            :class="{ active: method === m.name }"
            :data-method="m.name"
            :style="{ background: m.color }"
            @click="selectMethod(m.name)"
          >{{ m.name }}</div>
        </div>
        <input
          v-model="url"
          class="url-input"
          placeholder="输入请求 URL"
          @keyup.enter="sendRequest"
        />
        <button class="btn-send" :disabled="isLoading || !url.trim()" @click="sendRequest">
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isLoading ? '发送中...' : '发送' }}
        </button>
      </div>

      <!-- cURL actions -->
      <div class="curl-actions">
        <button class="btn-outline" @click="showCurlImport = !showCurlImport">
          {{ showCurlImport ? '收起' : '导入 cURL' }}
        </button>
        <CopyButton :text="exportCurl()" label="导出 cURL" />
      </div>

      <!-- cURL import area -->
      <div v-if="showCurlImport" class="curl-import-area">
        <textarea
          v-model="curlText"
          class="curl-textarea"
          placeholder="粘贴 cURL 命令，例如: curl -X GET https://api.example.com/users -H 'Content-Type: application/json'"
        ></textarea>
        <div class="curl-import-actions">
          <button class="btn-outline" @click="showCurlImport = false; curlText = ''">取消</button>
          <button class="btn-primary" @click="parseCurl(curlText); showCurlImport = false">导入</button>
        </div>
      </div>

      <!-- Request config tabs -->
      <div class="req-config-tabs">
        <div
          class="req-config-tab"
          :class="{ active: activeReqTab === 'params' }"
          @click="switchReqTab('params')"
        >Params</div>
        <div
          class="req-config-tab"
          :class="{ active: activeReqTab === 'headers' }"
          @click="switchReqTab('headers')"
        >Headers</div>
        <div
          class="req-config-tab"
          :class="{ active: activeReqTab === 'body' }"
          @click="switchReqTab('body')"
        >Body</div>
        <div
          class="req-config-tab"
          :class="{ active: activeReqTab === 'auth' }"
          @click="switchReqTab('auth')"
        >Auth</div>
      </div>

      <!-- Params tab -->
      <div v-if="activeReqTab === 'params'" class="req-config-content">
        <table class="kv-table">
          <thead>
            <tr>
              <th style="width: 35%">Key</th>
              <th style="width: 60%">Value</th>
              <th style="width: 5%"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in params" :key="i">
              <td><input v-model="p.key" type="text" placeholder="参数名" /></td>
              <td><input v-model="p.value" type="text" placeholder="参数值" /></td>
              <td><button class="kv-delete-btn" @click="removeKvRow(params, i)">&times;</button></td>
            </tr>
          </tbody>
        </table>
        <div class="kv-add-link" @click="addKvRow(params)">+ 添加 Param</div>
      </div>

      <!-- Headers tab -->
      <div v-if="activeReqTab === 'headers'" class="req-config-content">
        <table class="kv-table">
          <thead>
            <tr>
              <th style="width: 35%">Key</th>
              <th style="width: 60%">Value</th>
              <th style="width: 5%"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(h, i) in headers" :key="i">
              <td><input v-model="h.key" type="text" placeholder="Header 名" /></td>
              <td><input v-model="h.value" type="text" placeholder="Header 值" /></td>
              <td><button class="kv-delete-btn" @click="removeKvRow(headers, i)">&times;</button></td>
            </tr>
          </tbody>
        </table>
        <div class="kv-add-link" @click="addKvRow(headers)">+ 添加 Header</div>
      </div>

      <!-- Body tab -->
      <div v-if="activeReqTab === 'body'" class="req-config-content">
        <div v-if="!showBodyEditor" class="body-placeholder">
          Body 仅在 POST/PUT/PATCH 时可用
        </div>
        <div v-else>
          <div class="body-type-bar">
            <div
              class="body-type-btn"
              :class="{ active: bodyType === 'none' }"
              @click="switchBodyType('none')"
            >none</div>
            <div
              class="body-type-btn"
              :class="{ active: bodyType === 'json' }"
              @click="switchBodyType('json')"
            >JSON</div>
            <div
              class="body-type-btn"
              :class="{ active: bodyType === 'xml' }"
              @click="switchBodyType('xml')"
            >XML</div>
            <div
              class="body-type-btn"
              :class="{ active: bodyType === 'text' }"
              @click="switchBodyType('text')"
            >Text</div>
            <div
              class="body-type-btn"
              :class="{ active: bodyType === 'form' }"
              @click="switchBodyType('form')"
            >Form</div>
            <span v-if="bodyType !== 'none'" class="body-content-type-label">
              {{ bodyContentTypes[bodyType] }}
            </span>
          </div>

          <div v-if="bodyType === 'none'" class="body-placeholder">
            此请求不包含请求体
          </div>

          <textarea
            v-if="showTextareaBody"
            v-model="bodyText"
            class="body-textarea"
            :placeholder="bodyPlaceholders[bodyType] || ''"
          ></textarea>
        </div>
      </div>

      <!-- Auth tab -->
      <div v-if="activeReqTab === 'auth'" class="req-config-content">
        <div class="auth-section">
          <div class="auth-row">
            <span class="auth-label">类型</span>
            <select class="option-select" :value="authType" @change="switchAuthType(($event.target as HTMLSelectElement).value as AuthType)">
              <option value="none">无认证</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="ssl">SSL/TLS 证书</option>
            </select>
          </div>

          <!-- None -->
          <div v-if="authType === 'none'" class="auth-none-msg">
            当前请求未设置认证信息
          </div>

          <!-- Bearer -->
          <div v-if="authType === 'bearer'">
            <div class="auth-row">
              <span class="auth-label">Token</span>
              <input v-model="bearerToken" class="auth-input" type="text" placeholder="输入 Bearer Token" />
            </div>
          </div>

          <!-- Basic -->
          <div v-if="authType === 'basic'">
            <div class="auth-row">
              <span class="auth-label">用户名</span>
              <input v-model="basicUser" class="auth-input" type="text" placeholder="输入用户名" />
            </div>
            <div class="auth-row">
              <span class="auth-label">密码</span>
              <input v-model="basicPass" class="auth-input" type="password" placeholder="输入密码" />
            </div>
          </div>

          <!-- SSL/TLS -->
          <div v-if="authType === 'ssl'">
            <div class="ssl-sub-options">
              <div
                class="ssl-sub-btn"
                :class="{ active: sslMode === 'oneway' }"
                @click="sslMode = 'oneway'"
              >单向认证</div>
              <div
                class="ssl-sub-btn"
                :class="{ active: sslMode === 'mutual' }"
                @click="sslMode = 'mutual'"
              >双向认证 (mTLS)</div>
            </div>

            <!-- One-way: CA cert -->
            <div v-if="sslMode === 'oneway'">
              <div class="ssl-cert-group">
                <div class="ssl-cert-label">CA 证书（可选）</div>
                <div class="ssl-cert-hint">不填则使用系统默认 CA 证书验证服务端证书</div>
                <textarea
                  v-model="sslCaCert"
                  class="ssl-cert-textarea"
                  placeholder="粘贴 CA 证书内容 (PEM 格式)，自签名证书时需填写"
                ></textarea>
                <label class="ssl-file-upload">
                  <input type="file" accept=".pem,.crt,.cer" @change="handleFileUpload($event, 'sslCaCert')" />
                  上传文件 (.pem/.crt/.cer)
                </label>
              </div>
            </div>

            <!-- Mutual: client cert + key + CA -->
            <div v-if="sslMode === 'mutual'">
              <div class="ssl-cert-group">
                <div class="ssl-cert-label">客户端证书</div>
                <textarea
                  v-model="sslClientCert"
                  class="ssl-cert-textarea"
                  placeholder="粘贴客户端证书内容 (PEM 格式)"
                ></textarea>
                <label class="ssl-file-upload">
                  <input type="file" accept=".pem,.crt,.cer" @change="handleFileUpload($event, 'sslClientCert')" />
                  上传文件 (.pem/.crt/.cer)
                </label>
              </div>
              <div class="ssl-cert-group">
                <div class="ssl-cert-label">客户端私钥</div>
                <div class="ssl-key-mask" :class="{ revealed: sslKeyVisible }">
                  <button class="ssl-key-toggle-visibility" @click="sslKeyVisible = !sslKeyVisible" title="切换可见性">&#128065;</button>
                  <textarea
                    v-model="sslClientKey"
                    class="ssl-cert-textarea"
                    placeholder="粘贴客户端私钥内容 (PEM 格式)"
                  ></textarea>
                </div>
                <label class="ssl-file-upload">
                  <input type="file" accept=".pem,.key" @change="handleFileUpload($event, 'sslClientKey')" />
                  上传文件 (.pem/.key)
                </label>
              </div>
              <div class="ssl-cert-group">
                <div class="ssl-cert-label">CA 证书（可选）</div>
                <div class="ssl-cert-hint">不填则使用系统默认 CA 证书验证服务端证书</div>
                <textarea
                  v-model="sslMutualCaCert"
                  class="ssl-cert-textarea"
                  placeholder="粘贴 CA 证书内容 (PEM 格式)，自签名证书时需填写"
                ></textarea>
                <label class="ssl-file-upload">
                  <input type="file" accept=".pem,.crt,.cer" @change="handleFileUpload($event, 'sslMutualCaCert')" />
                  上传文件 (.pem/.crt/.cer)
                </label>
              </div>
            </div>

            <!-- Skip SSL verify -->
            <div class="ssl-toggle-row">
              <label class="ssl-toggle">
                <input v-model="sslSkipVerify" type="checkbox" />
                <span class="ssl-toggle-slider"></span>
              </label>
              <span class="ssl-toggle-label">跳过 SSL 证书验证</span>
            </div>
            <div v-if="sslSkipVerify" class="ssl-warning">
              跳过证书验证存在安全风险，仅建议在测试环境使用
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-text">{{ error }}</div>

      <!-- Response area -->
      <div class="response-area">
        <!-- Placeholder -->
        <div v-if="!response && !isLoading && !error" class="response-placeholder">
          <div class="placeholder-icon">&#9656;</div>
          <div>点击「发送」按钮发起请求</div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="response-placeholder">
          <div class="loading-spinner large"></div>
          <div>请求发送中...</div>
        </div>

        <!-- Response content -->
        <div v-if="response">
          <div class="response-status-bar">
            <span class="status-badge" :class="getStatusClass(response.status)">
              {{ response.status }} {{ response.statusText }}
            </span>
            <span class="response-meta">耗时: {{ response.elapsed }}ms</span>
            <span class="response-meta">大小: {{ formatSize(response.size) }}</span>
          </div>

          <div class="response-tabs">
            <div
              class="response-tab"
              :class="{ active: activeResTab === 'body' }"
              @click="switchResTab('body')"
            >Body</div>
            <div
              class="response-tab"
              :class="{ active: activeResTab === 'headers' }"
              @click="switchResTab('headers')"
            >Headers</div>
            <div
              class="response-tab"
              :class="{ active: activeResTab === 'cookies' }"
              @click="switchResTab('cookies')"
            >Cookies</div>
          </div>

          <!-- Response Body -->
          <div v-if="activeResTab === 'body'" class="response-body">
            <pre>{{ formatResponseBody(response.body) }}</pre>
          </div>

          <!-- Response Headers -->
          <div v-if="activeResTab === 'headers'" class="response-headers-panel">
            <table>
              <tr v-for="(val, key) in response.headers" :key="key">
                <td class="resp-header-key">{{ key }}</td>
                <td class="resp-header-val">{{ val }}</td>
              </tr>
            </table>
          </div>

          <!-- Response Cookies -->
          <div v-if="activeResTab === 'cookies'" class="response-cookies-panel">
            <table v-if="getResponseCookies().length > 0">
              <tr v-for="(c, i) in getResponseCookies()" :key="i">
                <td class="cookie-key">{{ c.key }}</td>
                <td class="cookie-val">{{ c.value }}</td>
              </tr>
            </table>
            <div v-else class="response-empty">无 Cookie</div>
          </div>

          <div class="response-copy-bar">
            <CopyButton :text="response.body" label="复制响应" />
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="history-section">
        <div class="history-header">
          <span class="history-title">历史记录</span>
          <span class="history-clear" @click="clearHistory">清空</span>
        </div>
        <div class="history-items">
          <div
            v-for="(h, i) in history"
            :key="i"
            class="history-item"
            :style="{ color: methods.find(m => m.name === h.method)?.color || '#64748b' }"
            @click="method = h.method; url = h.url"
          >{{ h.method }} {{ h.url }}</div>
          <div v-if="history.length === 0" class="history-empty">暂无请求记录</div>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
/* Request bar */
.request-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.method-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.method-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  border: 2px solid transparent;
  opacity: 0.5;
  transition: all 0.15s;
  user-select: none;
}
.method-badge:hover { opacity: 0.8; }
.method-badge.active {
  opacity: 1;
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.url-input {
  flex: 1;
  height: 36px;
  border: 1px solid var(--border-input);
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-input);
  outline: none;
}
.url-input:focus { border-color: var(--primary); }

.btn-send {
  height: 36px;
  padding: 0 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
  min-width: 72px;
}
.btn-send:hover { opacity: 0.9; }
.btn-send:disabled { opacity: 0.6; cursor: not-allowed; }

/* cURL actions */
.curl-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  justify-content: flex-end;
}

.curl-import-area {
  margin-bottom: 12px;
}
.curl-textarea {
  width: 100%;
  height: 80px;
  border: 1px solid var(--border-input);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-code);
  outline: none;
  resize: vertical;
}
.curl-textarea:focus { border-color: var(--primary); }
.curl-import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* Request config tabs */
.req-config-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-card);
  margin-bottom: 12px;
}
.req-config-tab {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  user-select: none;
}
.req-config-tab.active {
  color: var(--primary);
  font-weight: 500;
  border-bottom-color: var(--primary);
}
.req-config-tab:hover:not(.active) {
  color: var(--text-primary);
}

.req-config-content {
  min-height: 60px;
}

/* KV table */
.kv-table {
  width: 100%;
  border-collapse: collapse;
}
.kv-table th {
  background: var(--bg-code);
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-card);
}
.kv-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-light);
}
.kv-table input {
  width: 100%;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: transparent;
  outline: none;
}
.kv-table input:focus {
  border-color: var(--primary);
  background: var(--bg-white);
}
.kv-delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-disabled);
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kv-delete-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}
.kv-add-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
  margin-top: 8px;
  user-select: none;
}
.kv-add-link:hover { text-decoration: underline; }

/* Body type selector */
.body-type-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
}
.body-type-btn {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-card);
  background: var(--bg-white);
  color: var(--text-secondary);
  transition: all 0.15s;
  user-select: none;
}
.body-type-btn:hover { border-color: var(--primary); }
.body-type-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.body-content-type-label {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-placeholder);
  font-family: var(--font-mono);
}

.body-placeholder {
  padding: 24px;
  text-align: center;
  color: var(--text-placeholder);
  font-size: 13px;
  background: var(--bg-code);
  border-radius: 6px;
}

.body-textarea {
  width: 100%;
  min-height: 160px;
  border: 1px solid var(--border-input);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-code);
  outline: none;
  resize: vertical;
  line-height: 1.6;
}
.body-textarea:focus { border-color: var(--primary); }

/* Auth section */
.auth-section {
  padding: 16px;
  background: var(--bg-code);
  border-radius: 6px;
}
.auth-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.auth-row:last-child { margin-bottom: 0; }
.auth-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 60px;
}
.auth-input {
  flex: 1;
  height: 32px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
  padding: 0 10px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
}
.auth-input:focus { border-color: var(--primary); }
.auth-none-msg {
  padding: 8px 0;
  color: var(--text-placeholder);
  font-size: 12px;
}

/* SSL */
.ssl-sub-options {
  display: flex;
  gap: 8px;
  margin: 12px 0 8px 0;
}
.ssl-sub-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-card);
  background: var(--bg-white);
  color: var(--text-secondary);
  transition: all 0.15s;
  user-select: none;
}
.ssl-sub-btn:hover { border-color: var(--primary); }
.ssl-sub-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.ssl-cert-group { margin-bottom: 14px; }
.ssl-cert-group:last-child { margin-bottom: 0; }
.ssl-cert-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.ssl-cert-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.ssl-cert-textarea {
  width: 100%;
  min-height: 72px;
  border: 1px solid var(--border-input);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  resize: vertical;
  line-height: 1.5;
}
.ssl-cert-textarea:focus { border-color: var(--primary); }
.ssl-file-upload {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 5px 12px;
  border-radius: 4px;
  background: var(--bg-white);
  border: 1px dashed var(--border-input);
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.ssl-file-upload:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.ssl-file-upload input[type="file"] { display: none; }
.ssl-key-mask { position: relative; }
.ssl-key-mask .ssl-cert-textarea { -webkit-text-security: disc; }
.ssl-key-mask.revealed .ssl-cert-textarea { -webkit-text-security: none; }
.ssl-key-toggle-visibility {
  position: absolute;
  right: 8px;
  top: 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
  padding: 2px;
}
.ssl-key-toggle-visibility:hover { color: var(--text-primary); }
.ssl-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.ssl-toggle-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.ssl-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  cursor: pointer;
  display: inline-block;
}
.ssl-toggle input { opacity: 0; width: 0; height: 0; }
.ssl-toggle-slider {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #cbd5e1;
  border-radius: 10px;
  transition: background 0.2s;
}
.ssl-toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}
.ssl-toggle input:checked + .ssl-toggle-slider { background: #eab308; }
.ssl-toggle input:checked + .ssl-toggle-slider::before { transform: translateX(16px); }
.ssl-warning {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 12px;
  color: #a16207;
}

/* Response area */
.response-area {
  margin-top: 16px;
  border: 1px solid var(--border-card);
  border-radius: 10px;
  overflow: hidden;
}
.response-placeholder {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-placeholder);
  font-size: 13px;
  background: var(--bg-code);
}
.response-status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-code);
  border-bottom: 1px solid var(--border-card);
  font-size: 12px;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}
.status-redirect { background: #eff6ff; color: #3b82f6; }
.status-client-error { background: #fff7ed; color: #ea580c; }
.status-server-error { background: #fef2f2; color: #dc2626; }
.response-meta {
  color: var(--text-muted);
  font-size: 12px;
}
.response-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-card);
  padding: 0 16px;
  background: var(--bg-white);
}
.response-tab {
  padding: 8px 14px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  user-select: none;
}
.response-tab.active {
  color: var(--primary);
  font-weight: 500;
  border-bottom-color: var(--primary);
}
.response-tab:hover:not(.active) { color: var(--text-primary); }

.response-body {
  padding: 16px;
  background: #1e293b;
  max-height: 400px;
  overflow: auto;
}
.response-body::-webkit-scrollbar { width: 4px; height: 4px; }
.response-body::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
.response-body pre {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: #e2e8f0;
  margin: 0;
}

.response-headers-panel,
.response-cookies-panel {
  padding: 12px 16px;
  background: #1e293b;
  max-height: 300px;
  overflow: auto;
}
.response-headers-panel::-webkit-scrollbar,
.response-cookies-panel::-webkit-scrollbar { width: 4px; height: 4px; }
.response-headers-panel::-webkit-scrollbar-thumb,
.response-cookies-panel::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
.response-headers-panel table,
.response-cookies-panel table {
  width: 100%;
  border-collapse: collapse;
}
.response-headers-panel td,
.response-cookies-panel td {
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}
.resp-header-key, .cookie-key {
  color: #93c5fd;
  white-space: nowrap;
  width: 200px;
}
.resp-header-val, .cookie-val {
  color: #e2e8f0;
  word-break: break-all;
}
.response-empty {
  text-align: center;
  color: #64748b;
  padding: 16px;
  font-size: 12px;
}

.response-copy-bar {
  display: flex;
  justify-content: flex-end;
  padding: 6px 16px;
  background: var(--bg-code);
  border-top: 1px solid var(--border-card);
}

/* Loading spinner */
.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}
.loading-spinner.large {
  width: 24px;
  height: 24px;
  border-width: 3px;
  border-color: rgba(100, 116, 139, 0.3);
  border-top-color: var(--primary);
  margin-right: 0;
  margin-bottom: 8px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* History */
.history-empty {
  color: var(--text-placeholder);
  font-size: 12px;
  padding: 4px 0;
}
</style>
