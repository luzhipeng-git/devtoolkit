<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

// ===== Tab management =====
type TabId = 'jwt' | 'html-entity' | 'color'
const activeTab = ref<TabId>('jwt')

// ===== JWT Decode state =====
const jwtToken = ref('')
const jwtError = ref<string | null>(null)
const jwtDecoded = ref(false)

function b64urlDecode(s: string): string {
  let base64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch {
    return atob(base64)
  }
}

function highlightJson(jsonStr: string): string {
  return jsonStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)"(\s*:)/g, '<span class="json-key">"$1"</span>$2')
    .replace(/:\s*"([^"]*?)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/:\s*(\d+(\.\d+)?)/g, ': <span class="json-number">$1</span>')
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const M = ('0' + (date.getMonth() + 1)).slice(-2)
  const d = ('0' + date.getDate()).slice(-2)
  const h = ('0' + date.getHours()).slice(-2)
  const m = ('0' + date.getMinutes()).slice(-2)
  const s = ('0' + date.getSeconds()).slice(-2)
  return `${y}-${M}-${d} ${h}:${m}:${s}`
}

interface JwtSegments {
  headerJson: string
  headerTag: string
  payloadJson: string
  payloadInfo: string
  expStatus: { valid: boolean; text: string } | null
  signature: string
}

const jwtSegments = computed<JwtSegments | null>(() => {
  if (!jwtDecoded.value) return null
  jwtError.value = null

  let token = jwtToken.value.trim()
  if (!token) {
    jwtError.value = '请输入 JWT Token'
    return null
  }

  // Strip Bearer prefix
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.substring(7).trim()
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    jwtError.value = '无效的 JWT Token 格式，JWT 应包含 3 个部分（以 . 分隔）'
    return null
  }

  let headerRaw: string
  try {
    headerRaw = b64urlDecode(parts[0])
  } catch (e: any) {
    jwtError.value = '无法解码 Header 部分: ' + e.message
    return null
  }

  let payloadRaw: string
  try {
    payloadRaw = b64urlDecode(parts[1])
  } catch (e: any) {
    jwtError.value = '无法解码 Payload 部分: ' + e.message
    return null
  }

  let headerObj: any
  try {
    headerObj = JSON.parse(headerRaw)
  } catch {
    jwtError.value = 'Header 不是有效的 JSON'
    return null
  }

  // Header tag
  const tagParts: string[] = []
  if (headerObj.alg) tagParts.push('alg: ' + headerObj.alg)
  if (headerObj.typ) tagParts.push('typ: ' + headerObj.typ)
  const headerTag = tagParts.join(', ') || 'Unknown'

  const headerJson = highlightJson(JSON.stringify(headerObj, null, 2))

  // Payload
  let payloadObj: any
  try {
    payloadObj = JSON.parse(payloadRaw)
  } catch { /* not JSON, still display raw */ }

  const payloadJson = highlightJson(
    payloadObj ? JSON.stringify(payloadObj, null, 2) : payloadRaw
  )

  // Payload info line (iat, nbf)
  const infoParts: string[] = []
  if (payloadObj) {
    if (payloadObj.iat) infoParts.push('签发时间: ' + formatDate(new Date(payloadObj.iat * 1000)))
    if (payloadObj.nbf) infoParts.push('生效时间: ' + formatDate(new Date(payloadObj.nbf * 1000)))
  }
  const payloadInfo = infoParts.join('  |  ')

  // Expiration status
  let expStatus: { valid: boolean; text: string } | null = null
  if (payloadObj && payloadObj.exp) {
    const expDate = new Date(payloadObj.exp * 1000)
    const now = new Date()
    if (now > expDate) {
      expStatus = {
        valid: false,
        text: '过期时间: ' + formatDate(expDate),
      }
    } else {
      const remaining = expDate.getTime() - now.getTime()
      const days = Math.floor(remaining / 86400000)
      const hours = Math.floor((remaining % 86400000) / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      let timeStr = ''
      if (days > 0) timeStr += days + ' 天 '
      timeStr += hours + ' 小时 ' + mins + ' 分钟'
      expStatus = {
        valid: true,
        text: '过期时间: ' + formatDate(expDate) + '（剩余 ' + timeStr + '）',
      }
    }
  }

  return {
    headerJson,
    headerTag,
    payloadJson,
    payloadInfo,
    expStatus,
    signature: parts[2],
  }
})

function doDecode() {
  jwtDecoded.value = false
  jwtError.value = null

  const token = jwtToken.value.trim()
  if (!token) {
    jwtError.value = '请输入 JWT Token'
    return
  }
  jwtDecoded.value = true
}

function clearJwt() {
  jwtToken.value = ''
  jwtDecoded.value = false
  jwtError.value = null
}

// ===== HTML Entity state =====
type EntityDirection = 'encode' | 'decode'
const entityDirection = ref<EntityDirection>('encode')
const entityInput = ref('')
const entityOutput = ref('')

function encodeHtmlEntity(text: string): string {
  return text.replace(/[&<>"']/g, c => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[c] || c
  })
}

function decodeHtmlEntity(text: string): string {
  const el = document.createElement('div')
  el.innerHTML = text
  return el.textContent || el.innerText || ''
}

function executeEntity() {
  if (!entityInput.value) {
    entityOutput.value = ''
    return
  }
  if (entityDirection.value === 'encode') {
    entityOutput.value = encodeHtmlEntity(entityInput.value)
  } else {
    entityOutput.value = decodeHtmlEntity(entityInput.value)
  }
}

// ===== Color Converter state =====
const colorHex = ref('#000000')
const colorRgb = ref('rgb(0, 0, 0)')
const colorHsl = ref('hsl(0, 0%, 0%)')
const colorPreviewBg = ref('#000000')

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  function hue2rgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

function updateColorFromHex(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const hexUpper = rgbToHex(rgb.r, rgb.g, rgb.b)
  colorPreviewBg.value = hexUpper
  colorHex.value = hexUpper
  colorRgb.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  colorHsl.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
}

function updateColorFromRgbStr(str: string) {
  const m = str.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return
  const r = Math.min(255, Math.max(0, parseInt(m[1])))
  const g = Math.min(255, Math.max(0, parseInt(m[2])))
  const b = Math.min(255, Math.max(0, parseInt(m[3])))
  const hex = rgbToHex(r, g, b)
  const hsl = rgbToHsl(r, g, b)
  colorPreviewBg.value = hex
  colorHex.value = hex
  colorRgb.value = `rgb(${r}, ${g}, ${b})`
  colorHsl.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
}

function updateColorFromHslStr(str: string) {
  const m = str.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/)
  if (!m) return
  const h = Math.min(360, Math.max(0, parseInt(m[1])))
  const s = Math.min(100, Math.max(0, parseInt(m[2])))
  const l = Math.min(100, Math.max(0, parseInt(m[3])))
  const rgb = hslToRgb(h, s, l)
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
  colorPreviewBg.value = hex
  colorHex.value = hex
  colorRgb.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  colorHsl.value = `hsl(${h}, ${s}%, ${l}%)`
}

function onHexInput() {
  updateColorFromHex(colorHex.value)
}

function onRgbInput() {
  updateColorFromRgbStr(colorRgb.value)
}

function onHslInput() {
  updateColorFromHslStr(colorHsl.value)
}

function onPickerInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  updateColorFromHex(value)
}
</script>

<template>
  <ToolContainer>
    <!-- Tab Bar -->
    <div class="tool-header">
      <button class="tool-tab" :class="{ active: activeTab === 'jwt' }" @click="activeTab = 'jwt'">JWT 解码</button>
      <button class="tool-tab" :class="{ active: activeTab === 'html-entity' }" @click="activeTab = 'html-entity'">HTML Entity</button>
      <button class="tool-tab" :class="{ active: activeTab === 'color' }" @click="activeTab = 'color'">颜色转换</button>
    </div>

    <!-- ====== Tab 1: JWT Decode ====== -->
    <div v-if="activeTab === 'jwt'">
      <ErrorBanner v-if="jwtError" :message="jwtError" @dismiss="jwtError = null" />

      <!-- JWT Token Input -->
      <div class="jwt-input-section">
        <div class="editor-header">
          <span class="editor-title">JWT Token</span>
          <div class="editor-actions">
            <button class="btn-outline" @click="clearJwt">清空</button>
          </div>
        </div>
        <div class="editor-body" style="min-height: 60px;">
          <textarea
            class="editor-textarea"
            v-model="jwtToken"
            placeholder="粘贴 JWT Token..."
            style="white-space: pre-wrap; word-break: break-all; min-height: 60px; resize: vertical;"
            @keydown.ctrl.enter="doDecode"
          ></textarea>
        </div>
      </div>

      <!-- Decode Button -->
      <div class="decode-action-row">
        <button class="btn-decode" @click="doDecode">解码</button>
      </div>

      <!-- JWT Segments Output -->
      <div v-if="jwtSegments" class="jwt-segments">
        <!-- Header Segment -->
        <div class="jwt-segment jwt-header">
          <div class="jwt-segment-top">
            <span class="jwt-segment-title">HEADER</span>
            <span class="jwt-segment-tag tag-header">{{ jwtSegments.headerTag }}</span>
          </div>
          <div class="jwt-segment-sep"></div>
          <div class="segment-json" v-html="jwtSegments.headerJson"></div>
        </div>

        <!-- Payload Segment -->
        <div class="jwt-segment jwt-payload">
          <div class="jwt-segment-top">
            <span class="jwt-segment-title">PAYLOAD</span>
            <span class="jwt-segment-tag tag-payload">DATA</span>
          </div>
          <div class="jwt-segment-sep"></div>
          <div class="segment-json" v-html="jwtSegments.payloadJson"></div>
          <div v-if="jwtSegments.payloadInfo" class="segment-info-line">{{ jwtSegments.payloadInfo }}</div>
          <div v-if="jwtSegments.expStatus" class="exp-status">
            <div class="exp-badge" :class="jwtSegments.expStatus.valid ? 'valid' : 'expired'">
              {{ jwtSegments.expStatus.valid ? 'Token 有效' : 'Token 已过期' }}
            </div>
            <div class="exp-time">{{ jwtSegments.expStatus.text }}</div>
          </div>
          <div v-if="!jwtSegments.expStatus && jwtSegments.payloadInfo" class="no-exp-note">无过期时间声明</div>
        </div>

        <!-- Signature Segment -->
        <div class="jwt-segment jwt-signature">
          <div class="jwt-segment-top">
            <span class="jwt-segment-title">SIGNATURE</span>
          </div>
          <div class="jwt-segment-sep"></div>
          <div class="segment-signature-value">{{ jwtSegments.signature }}</div>
          <div class="segment-note">使用 Header 中指定的算法和密钥计算</div>
        </div>

        <div class="exp-note">注意：仅解码 Token 内容，未验证签名有效性</div>
      </div>
    </div>

    <!-- ====== Tab 2: HTML Entity ====== -->
    <div v-if="activeTab === 'html-entity'">
      <!-- Direction Radio Group -->
      <div class="html-entity-direction">
        <label class="direction-radio">
          <input type="radio" name="entity-direction" value="encode" v-model="entityDirection" /> 编码
        </label>
        <label class="direction-radio">
          <input type="radio" name="entity-direction" value="decode" v-model="entityDirection" /> 解码
        </label>
      </div>

      <div class="section-label">输入</div>
      <textarea
        class="entity-textarea"
        v-model="entityInput"
        placeholder="请输入需要编码/解码的文本..."
      ></textarea>

      <div class="decode-action-row" style="margin-top: 12px;">
        <button class="btn-decode" @click="executeEntity">执行</button>
      </div>

      <div class="section-label" style="margin-top: 12px;">输出</div>
      <div class="editor-header" style="margin-top: 0;">
        <span class="editor-title"></span>
        <CopyButton :text="entityOutput" />
      </div>
      <div class="editor-body output" style="min-height: 80px;">
        <div class="editor-output">{{ entityOutput }}</div>
      </div>
    </div>

    <!-- ====== Tab 3: Color Converter ====== -->
    <div v-if="activeTab === 'color'">
      <div class="color-converter">
        <div>
          <div class="section-label">预览</div>
          <div class="color-preview-block" :style="{ background: colorPreviewBg }"></div>
          <input
            type="color"
            class="color-picker-input"
            :value="colorPreviewBg"
            @input="onPickerInput"
            style="margin-top: 8px;"
          />
        </div>
        <div class="color-inputs">
          <div class="color-input-row">
            <span class="color-input-label">HEX</span>
            <input type="text" class="color-input-field" v-model="colorHex" @input="onHexInput" placeholder="#000000" />
            <CopyButton :text="colorHex" label="复制" />
          </div>
          <div class="color-input-row">
            <span class="color-input-label">RGB</span>
            <input type="text" class="color-input-field" v-model="colorRgb" @input="onRgbInput" placeholder="rgb(0, 0, 0)" />
            <CopyButton :text="colorRgb" label="复制" />
          </div>
          <div class="color-input-row">
            <span class="color-input-label">HSL</span>
            <input type="text" class="color-input-field" v-model="colorHsl" @input="onHslInput" placeholder="hsl(0, 0%, 0%)" />
            <CopyButton :text="colorHsl" label="复制" />
          </div>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
/* JWT Tab */
.jwt-input-section {
  margin-bottom: 12px;
}

.decode-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.btn-decode {
  padding: 7px 20px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-decode:hover {
  opacity: 0.9;
}

.jwt-segments {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.jwt-segment {
  border-radius: 8px;
  padding: 16px;
}

.jwt-segment-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.jwt-segment-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.jwt-segment-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.tag-header {
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
}

.tag-payload {
  background: rgba(202, 138, 4, 0.12);
  color: #a16207;
}

.jwt-segment-sep {
  border-bottom: 2px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 12px;
}

.segment-json {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}

.segment-json :deep(.json-key) { color: #2563eb; }
.segment-json :deep(.json-string) { color: #16a34a; }
.segment-json :deep(.json-number) { color: #7c3aed; }

.segment-info-line {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.segment-signature-value {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  word-break: break-all;
}

.segment-note {
  font-size: 11px;
  color: var(--text-placeholder);
  margin-top: 8px;
}

.exp-status {
  margin-top: 6px;
}

.exp-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.exp-badge.valid {
  background: #f0fdf4;
  color: #16a34a;
}

.exp-badge.expired {
  background: #fef2f2;
  color: #dc2626;
}

.exp-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.no-exp-note {
  font-size: 11px;
  color: var(--text-placeholder);
  margin-top: 4px;
}

.exp-note {
  font-size: 11px;
  color: var(--text-placeholder);
  margin-top: 8px;
}

/* HTML Entity Tab */
.html-entity-direction {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.direction-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.direction-radio input[type="radio"] {
  accent-color: var(--primary);
}

.entity-textarea {
  width: 100%;
  min-height: 80px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  padding: 12px 14px;
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  resize: vertical;
  line-height: 1.6;
}

.entity-textarea:focus {
  border-color: var(--primary);
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}

/* Color Converter Tab */
.color-converter {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-top: 16px;
}

.color-preview-block {
  width: 120px;
  height: 120px;
  border-radius: 10px;
  border: 2px solid var(--border-card);
  flex-shrink: 0;
}

.color-picker-input {
  width: 40px;
  height: 34px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: none;
}

.color-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  width: 36px;
  flex-shrink: 0;
}

.color-input-field {
  flex: 1;
  height: 34px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  padding: 0 12px;
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
}

.color-input-field:focus {
  border-color: var(--primary);
}
</style>
