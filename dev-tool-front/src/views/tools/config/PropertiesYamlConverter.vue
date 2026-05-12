<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import yaml from 'js-yaml'

// ===== Format definitions =====
const FORMAT_NAMES: Record<string, string> = {
  json: 'JSON',
  yaml: 'YAML',
  toml: 'TOML',
  ini: 'INI',
  properties: 'Properties',
  env: 'ENV',
}

const FORMAT_EXT: Record<string, string> = {
  json: 'json',
  yaml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  properties: 'properties',
  env: 'env',
}

const ALL_FORMATS = Object.keys(FORMAT_NAMES)

// ===== State =====
const sourceFormat = ref('json')
const targetFormat = ref('yaml')
const input = ref('')
const output = ref('')
const outputHtml = ref('')
const statusType = ref<'success' | 'error' | 'warning' | ''>('')
const statusMessage = ref('')
const converting = ref(false)
const srcLineCount = ref(1)
const outLineCount = ref(0)
const srcLineNumRef = ref<HTMLDivElement | null>(null)
const srcTextareaRef = ref<HTMLTextAreaElement | null>(null)

const hasInput = computed(() => input.value.trim().length > 0)

const srcFormatLabel = computed(() => FORMAT_NAMES[sourceFormat.value])
const tgtFormatLabel = computed(() => FORMAT_NAMES[targetFormat.value])

// ===== Helpers =====
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function computeLineCount(text: string): number {
  if (!text) return 1
  return text.split('\n').length
}

function updateSrcLineNumbers() {
  srcLineCount.value = computeLineCount(input.value)
}

function showStatus(type: 'success' | 'error' | 'warning', msg: string) {
  statusType.value = type
  statusMessage.value = msg
  if (type === 'success') {
    setTimeout(() => {
      if (statusMessage.value === msg) {
        statusType.value = ''
        statusMessage.value = ''
      }
    }, 3000)
  }
}

function clearStatus() {
  statusType.value = ''
  statusMessage.value = ''
}

// ===== Format select dedup + auto-adjust =====
function onSourceFormatChange() {
  if (sourceFormat.value === targetFormat.value) {
    const idx = ALL_FORMATS.indexOf(targetFormat.value)
    const next = ALL_FORMATS[(idx + 1) % ALL_FORMATS.length]
    targetFormat.value = next
    showStatus('warning', '目标格式已自动调整为 ' + FORMAT_NAMES[next])
  } else {
    clearStatus()
  }
}

function onTargetFormatChange() {
  if (sourceFormat.value === targetFormat.value) {
    const idx = ALL_FORMATS.indexOf(sourceFormat.value)
    const next = ALL_FORMATS[(idx + 1) % ALL_FORMATS.length]
    sourceFormat.value = next
    showStatus('warning', '源格式已自动调整为 ' + FORMAT_NAMES[next])
  } else {
    clearStatus()
  }
}

// ===== Input handling =====
function onInputChange() {
  updateSrcLineNumbers()
}

function syncScroll() {
  if (srcLineNumRef.value && srcTextareaRef.value) {
    srcLineNumRef.value.scrollTop = srcTextareaRef.value.scrollTop
  }
}

// ===== Auto detect =====
function autoDetect() {
  const trimmed = input.value.trim()
  if (!trimmed) {
    showStatus('warning', '请先输入内容再进行自动检测')
    return
  }
  const detected = detectFormat(trimmed)
  if (detected) {
    sourceFormat.value = detected
    if (sourceFormat.value === targetFormat.value) {
      const idx = ALL_FORMATS.indexOf(targetFormat.value)
      targetFormat.value = ALL_FORMATS[(idx + 1) % ALL_FORMATS.length]
    }
    showStatus('success', '检测为 ' + FORMAT_NAMES[detected] + ' 格式')
  } else {
    showStatus('error', '无法自动识别格式，请手动选择')
  }
}

function detectFormat(text: string): string | null {
  // JSON: starts with { or [
  if (/^[\[{]/.test(text)) {
    try {
      JSON.parse(text)
      return 'json'
    } catch {
      // fall through
    }
  }
  // YAML: contains --- or key: pattern
  if (/^---/.test(text) || /^[a-zA-Z_][a-zA-Z0-9_]*:/m.test(text)) {
    return 'yaml'
  }
  // TOML: contains [section] and key = value
  if (/^\[[a-zA-Z0-9_.]+\]/m.test(text) && /.+=.+/m.test(text)) {
    return 'toml'
  }
  // INI: contains [section]
  if (/^\[[a-zA-Z0-9_ ]+\]/m.test(text)) {
    return 'ini'
  }
  // Properties: key=value pattern
  if (/^[a-zA-Z0-9_.]+=.+/m.test(text)) {
    return 'properties'
  }
  // ENV: KEY=VALUE pattern
  if (/^[A-Z_][A-Z0-9_]*=.+/m.test(text)) {
    return 'env'
  }
  return null
}

// ===== Swap =====
function swapFormats() {
  const tmpFmt = sourceFormat.value
  sourceFormat.value = targetFormat.value
  targetFormat.value = tmpFmt

  if (output.value) {
    input.value = output.value
    output.value = ''
    outputHtml.value = ''
    outLineCount.value = 0
    updateSrcLineNumbers()
  }
  clearStatus()
}

// ===== Parsers =====
function parseValue(val: string): any {
  if (!val || val === '~' || val === 'null') return null
  if (val === 'true') return true
  if (val === 'false') return false
  if (/^-?\d+$/.test(val)) return parseInt(val, 10)
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val)
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.substring(1, val.length - 1)
  }
  return val
}

function setNestedValue(obj: Record<string, any>, key: string, value: any): void {
  const parts = key.split('.')
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {}
    current = current[parts[i]]
  }
  current[parts[parts.length - 1]] = value
}

function parseInput(text: string, format: string): any {
  switch (format) {
    case 'json': return parseJson(text)
    case 'yaml': return parseYamlInput(text)
    case 'toml': return parseToml(text)
    case 'ini': return parseIni(text)
    case 'properties': return parseProperties(text)
    case 'env': return parseEnv(text)
    default: throw new Error('不支持的源格式: ' + format)
  }
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch (e: any) {
    const posMatch = e.message?.match(/position\s+(\d+)/)
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10)
      const before = text.substring(0, pos)
      const line = (before.match(/\n/g) || []).length + 1
      throw new Error('第 ' + line + ' 行: JSON 语法错误 - ' + e.message)
    }
    throw new Error('JSON 语法错误: ' + e.message)
  }
}

function parseYamlInput(text: string): any {
  try {
    return yaml.load(text) as Record<string, any>
  } catch (e: any) {
    throw new Error(e.message || 'YAML 解析失败')
  }
}

function parseToml(text: string): Record<string, any> {
  const result: Record<string, any> = {}
  let current: Record<string, any> = result
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const sectionMatch = trimmed.match(/^\[([a-zA-Z0-9_.]+)\]$/)
    if (sectionMatch) {
      const parts = sectionMatch[1].split('.')
      current = result
      for (const part of parts) {
        if (!current[part]) current[part] = {}
        current = current[part]
      }
      continue
    }

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim()
      const value = trimmed.substring(eqIdx + 1).trim()
      current[key] = parseValue(value)
    }
  }
  return result
}

function parseIni(text: string): Record<string, any> {
  const result: Record<string, any> = {}
  let current: Record<string, any> = result
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      result[sectionMatch[1]] = {}
      current = result[sectionMatch[1]]
      continue
    }

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim()
      const value = trimmed.substring(eqIdx + 1).trim()
      current[key] = parseValue(value)
    }
  }
  return result
}

function parseProperties(text: string): Record<string, any> {
  const result: Record<string, any> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue
    let eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) eqIdx = trimmed.indexOf(':')
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim()
      const value = trimmed.substring(eqIdx + 1).trim()
      setNestedValue(result, key, parseValue(value))
    }
  }
  return result
}

function parseEnv(text: string): Record<string, any> {
  const result: Record<string, any> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim()
      let value = trimmed.substring(eqIdx + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1)
      }
      result[key] = value
    }
  }
  return result
}

// ===== Serializers =====
function serializeOutput(data: any, format: string): string {
  switch (format) {
    case 'json': return JSON.stringify(data, null, 2)
    case 'yaml': return serializeYaml(data)
    case 'toml': return serializeToml(data, '')
    case 'ini': return serializeIni(data)
    case 'properties': return serializeProperties(data, '')
    case 'env': return serializeEnv(data)
    default: throw new Error('不支持的目标格式: ' + format)
  }
}

function serializeYaml(data: any): string {
  return yaml.dump(data, { indent: 2, lineWidth: 120 })
}

function serializeToml(data: any, prefix: string): string {
  const lines: string[] = []
  const scalars: Record<string, any> = {}
  const tables: Record<string, any> = {}

  for (const key of Object.keys(data)) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue
    const val = data[key]
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      tables[key] = val
    } else {
      scalars[key] = val
    }
  }

  for (const sk of Object.keys(scalars)) {
    lines.push(sk + ' = ' + tomlValue(scalars[sk]))
  }

  for (const tk of Object.keys(tables)) {
    const fullKey = prefix ? prefix + '.' + tk : tk
    if (lines.length > 0 && !lines[lines.length - 1].startsWith('[')) {
      lines.push('')
    }
    lines.push('[' + fullKey + ']')
    lines.push(serializeToml(tables[tk], fullKey))
  }

  return lines.join('\n')
}

function tomlValue(val: any): string {
  if (typeof val === 'string') return '"' + val.replace(/"/g, '\\"') + '"'
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (val === null) return '""'
  return String(val)
}

function serializeIni(data: any): string {
  const rootLines: string[] = []
  const sectionLines: string[] = []

  for (const key of Object.keys(data)) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue
    const val = data[key]
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      sectionLines.push('')
      sectionLines.push('[' + key + ']')
      for (const subKey of Object.keys(val)) {
        if (!Object.prototype.hasOwnProperty.call(val, subKey)) continue
        sectionLines.push(subKey + ' = ' + String(val[subKey]))
      }
    } else {
      rootLines.push(key + ' = ' + String(val))
    }
  }

  return rootLines.concat(sectionLines).join('\n')
}

function serializeProperties(data: any, prefix: string): string {
  const lines: string[] = []
  for (const key of Object.keys(data)) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue
    const val = data[key]
    const fullKey = prefix ? prefix + '.' + key : key
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      lines.push(serializeProperties(val, fullKey))
    } else {
      lines.push(fullKey + '=' + String(val === null ? '' : val))
    }
  }
  return lines.join('\n')
}

function serializeEnv(data: any): string {
  const lines: string[] = []
  function flatten(obj: any, prefix: string) {
    for (const key of Object.keys(obj)) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
      const val = obj[key]
      const envKey = prefix ? prefix + '_' + key : key
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        flatten(val, envKey)
      } else {
        lines.push(envKey.toUpperCase() + '=' + String(val === null ? '' : val))
      }
    }
  }
  flatten(data, '')
  return lines.join('\n')
}

// ===== Syntax Highlighting =====
function highlightOutput(text: string, format: string): string {
  const html = escapeHtml(text)
  switch (format) {
    case 'json': return highlightJson(html)
    case 'yaml': return highlightYaml(html)
    case 'toml': return highlightToml(html)
    case 'ini': return highlightIni(html)
    case 'properties': return highlightProps(html)
    case 'env': return highlightEnv(html)
    default: return html
  }
}

function highlightJson(html: string): string {
  let result = html
  result = result.replace(/"([^"\\]*)"\s*:/g, '<span class="hl-json-key">"$1"</span>:')
  result = result.replace(/:\s*"([^"\\]*)"/g, ': <span class="hl-json-string">"$1"</span>')
  result = result.replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span class="hl-json-number">$1</span>')
  result = result.replace(/:\s*(true|false)/g, ': <span class="hl-json-bool">$1</span>')
  result = result.replace(/:\s*(null)/g, ': <span class="hl-json-null">$1</span>')
  return result
}

function highlightYaml(html: string): string {
  let result = html
  result = result.replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-yaml-string">$1</span>')
  result = result.replace(/(#.*)/g, '<span class="hl-yaml-comment">$1</span>')
  result = result.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(:)/gm, '$1<span class="hl-yaml-key">$2</span>$3')
  return result
}

function highlightToml(html: string): string {
  let result = html
  result = result.replace(/^(\[[a-zA-Z0-9_.]+\])$/gm, '<span class="hl-toml-section">$1</span>')
  result = result.replace(/^([a-zA-Z_][a-zA-Z0-9_]*)(\s*=)/gm, '<span class="hl-toml-key">$1</span>$2')
  result = result.replace(/"([^"]*?)"/g, '<span class="hl-toml-string">"$1"</span>')
  return result
}

function highlightIni(html: string): string {
  let result = html
  result = result.replace(/^(\[[^\]]+\])$/gm, '<span class="hl-ini-section">$1</span>')
  result = result.replace(/^([a-zA-Z_][a-zA-Z0-9_]*)(\s*=)/gm, '<span class="hl-ini-key">$1</span>$2')
  return result
}

function highlightProps(html: string): string {
  return html.replace(/^([a-zA-Z0-9_.]+)(=)/gm, '<span class="hl-props-key">$1</span>$2')
}

function highlightEnv(html: string): string {
  return html.replace(/^([A-Z_][A-Z0-9_]*)(=)(.*)$/gm, '<span class="hl-env-key">$1</span>$2<span class="hl-env-value">$3</span>')
}

// ===== Convert =====
function doConvert() {
  const raw = input.value.trim()
  if (!raw) return

  converting.value = true
  setTimeout(() => {
    try {
      const parsed = parseInput(raw, sourceFormat.value)
      const result = serializeOutput(parsed, targetFormat.value)
      output.value = result
      outputHtml.value = highlightOutput(result, targetFormat.value)
      outLineCount.value = computeLineCount(result)
      showStatus('success', '转换成功')
    } catch (e: any) {
      output.value = ''
      outputHtml.value = ''
      outLineCount.value = 0
      const msg = e.message || '转换失败'
      const lineMatch = msg.match(/line\s+(\d+)/i) || msg.match(/第\s*(\d+)\s*行/)
      const lineInfo = lineMatch ? '（第 ' + lineMatch[1] + ' 行）' : ''
      showStatus('error', '转换失败' + lineInfo + ': ' + msg)
    }
    converting.value = false
  }, 300)
}

// ===== Clear =====
function clearInput() {
  input.value = ''
  output.value = ''
  outputHtml.value = ''
  outLineCount.value = 0
  srcLineCount.value = 1
  clearStatus()
}

// ===== Download =====
function downloadOutput() {
  if (!output.value) return
  const ext = FORMAT_EXT[targetFormat.value] || 'txt'
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'converted.' + ext
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ===== Paste =====
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      input.value = text
      updateSrcLineNumbers()
    }
  } catch {
    // clipboard API not available or denied
  }
}

// Line number arrays for rendering
const srcLineNumbers = computed(() => {
  return Array.from({ length: srcLineCount.value }, (_, i) => i + 1)
})

const outLineNumbers = computed(() => {
  return Array.from({ length: outLineCount.value }, (_, i) => i + 1)
})
</script>

<template>
  <ToolContainer>
    <!-- Direction Selector -->
    <div class="direction-bar">
      <div class="format-select-group">
        <span class="format-label">源格式</span>
        <select class="format-select" v-model="sourceFormat" @change="onSourceFormatChange">
          <option v-for="fmt in ALL_FORMATS" :key="fmt" :value="fmt">{{ FORMAT_NAMES[fmt] }}</option>
        </select>
        <button class="btn-auto-detect" @click="autoDetect">自动检测</button>
      </div>
      <div class="swap-arrow" title="交换输入输出" @click="swapFormats">&#8644;</div>
      <div class="format-select-group">
        <span class="format-label">目标格式</span>
        <select class="format-select" v-model="targetFormat" @change="onTargetFormatChange">
          <option v-for="fmt in ALL_FORMATS" :key="fmt" :value="fmt">{{ FORMAT_NAMES[fmt] }}</option>
        </select>
      </div>
    </div>

    <!-- Dual Panel Layout -->
    <div class="dual-panel">
      <!-- Left: Source Input -->
      <div class="panel-col">
        <div class="editor-header">
          <span class="editor-title">源输入 ({{ srcFormatLabel }})</span>
          <div class="editor-actions">
            <button class="btn-outline" @click="pasteFromClipboard">粘贴</button>
            <button class="btn-outline" @click="clearInput">清空</button>
          </div>
        </div>
        <div class="editor-body">
          <div class="line-numbers" ref="srcLineNumRef"><span v-for="n in srcLineNumbers" :key="n">{{ n }}</span></div>
          <textarea
            ref="srcTextareaRef"
            class="editor-textarea"
            v-model="input"
            @input="onInputChange"
            @scroll="syncScroll"
            spellcheck="false"
            placeholder="请输入要转换的配置内容..."
          ></textarea>
        </div>
      </div>

      <!-- Convert Button Column -->
      <div class="convert-btn-col">
        <button class="btn-action" :disabled="!hasInput || converting" @click="doConvert">
          <span v-if="converting" class="spinner"></span>转换
        </button>
      </div>

      <!-- Right: Output -->
      <div class="panel-col">
        <div class="editor-header">
          <span class="editor-title">转换结果 ({{ tgtFormatLabel }})</span>
          <div class="editor-actions">
            <CopyButton :text="output" />
            <button class="btn-outline" @click="downloadOutput">下载</button>
          </div>
        </div>
        <div class="editor-body output">
          <div v-if="outLineCount > 0" class="line-numbers"><span v-for="n in outLineNumbers" :key="n">{{ n }}</span></div>
          <div v-if="outputHtml" class="editor-output" v-html="outputHtml"></div>
          <div v-else class="editor-output placeholder">转换结果将显示在这里</div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div v-if="statusType" :class="['status-bar', statusType]">
      <span>{{ statusMessage }}</span>
    </div>
  </ToolContainer>
</template>

<style scoped>
/* Direction bar */
.direction-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 20px;
  background: var(--bg-code);
  border-radius: 8px;
  margin-bottom: 16px;
}

.format-select-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.format-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.format-select {
  height: 30px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  min-width: 130px;
  cursor: pointer;
}

.format-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.swap-arrow {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-white);
  border: 1px solid var(--border-input);
  cursor: pointer;
  font-size: 16px;
  color: var(--primary);
  transition: all 0.15s;
  flex-shrink: 0;
}

.swap-arrow:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}

.btn-auto-detect {
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--bg-white);
  color: var(--text-muted);
  font-size: 11px;
  border: 1px solid var(--border-input);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-auto-detect:hover {
  color: var(--primary);
  border-color: var(--primary);
}

/* Dual panel */
.dual-panel {
  display: flex;
  gap: 12px;
}

.panel-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-col .editor-header {
  flex-shrink: 0;
}

.panel-col .editor-body {
  flex: 1;
  min-height: 260px;
}

.convert-btn-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
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

.btn-action:hover {
  opacity: 0.9;
}

.btn-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

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

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Status bar */
.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 12px;
}

.status-bar.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
}

.status-bar.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.status-bar.warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #d97706;
}

/* Line numbers inside panel */
.panel-col .line-numbers {
  display: flex;
  flex-direction: column;
}

.panel-col .line-numbers span {
  display: block;
  line-height: 1.7;
}

/* Output placeholder */
.editor-output.placeholder {
  color: var(--text-placeholder);
  font-style: italic;
}

/* Syntax highlighting classes */
:deep(.hl-json-key) { color: #2563eb; }
:deep(.hl-json-string) { color: #16a34a; }
:deep(.hl-json-number) { color: #ea580c; }
:deep(.hl-json-bool) { color: #7c3aed; }
:deep(.hl-json-null) { color: #dc2626; }
:deep(.hl-yaml-key) { color: #2563eb; }
:deep(.hl-yaml-string) { color: #16a34a; }
:deep(.hl-yaml-comment) { color: #94a3b8; font-style: italic; }
:deep(.hl-toml-section) { color: #2563eb; font-weight: 600; }
:deep(.hl-toml-key) { color: #16a34a; }
:deep(.hl-toml-string) { color: #ea580c; }
:deep(.hl-ini-section) { color: #2563eb; font-weight: 600; }
:deep(.hl-ini-key) { color: #16a34a; }
:deep(.hl-props-key) { color: #2563eb; }
:deep(.hl-env-key) { color: #7c3aed; }
:deep(.hl-env-value) { color: #16a34a; }

[data-theme="dark"] .status-bar.success {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

[data-theme="dark"] .status-bar.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

[data-theme="dark"] .status-bar.warning {
  background: rgba(234, 179, 8, 0.1);
  border-color: rgba(234, 179, 8, 0.3);
  color: #facc15;
}
</style>
