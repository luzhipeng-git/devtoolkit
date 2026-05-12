<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useHistoryStore } from '@/stores/history'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'
import HistorySection from '@/components/common/HistorySection.vue'

// --- State ---
const input = ref('')
const indent = ref('2')
const sortKeys = ref(false)
const unicodeEscape = ref(false)
const error = ref<string | null>(null)
const prettyResult = ref('')
const minifyResult = ref('')
const prettyCharCount = ref(0)
const minifyCharCount = ref(0)
const compressionRateText = ref('')
const showCompression = ref(false)

// --- History ---
const historyStore = useHistoryStore()
const history = computed(() => historyStore.getRecords('json-format'))
const { copy: clipboardCopy } = useClipboard()

function addHistoryRecord(inputText: string) {
  if (!inputText) return
  historyStore.addRecord({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    toolId: 'json-format',
    input: inputText.slice(0, 500),
    output: prettyResult.value.slice(0, 500),
    mode: 'format',
    timestamp: Date.now(),
  })
}

function restoreFromHistory(record: { input: string }) {
  input.value = record.input
}

function clearHistory() {
  historyStore.clearRecords('json-format')
}

// --- Line numbers ---
const lineNumbersText = computed(() => {
  const count = input.value ? input.value.split('\n').length : 1
  return Array.from({ length: count }, (_, i) => i + 1).join('\n')
})

const textareaRef = ref<HTMLTextAreaElement>()
const lineNumbersRef = ref<HTMLDivElement>()

function syncScroll() {
  if (lineNumbersRef.value && textareaRef.value) {
    lineNumbersRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

// --- JSON Syntax Highlight ---
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightJson(jsonStr: string): string {
  let html = escapeHtml(jsonStr)
  html = html.replace(/"([^"\\]*(\\.[^"\\]*)*)"\s*:/g, '<span class="json-key">"$1"</span>:')
  html = html.replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="json-string">"$1"</span>')
  html = html.replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>')
  html = html.replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
  html = html.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
  html = html.replace(/([{}\[\]])/g, '<span class="json-bracket">$1</span>')
  return html
}

const highlightedPretty = computed(() => {
  return prettyResult.value ? highlightJson(prettyResult.value) : ''
})

// --- Sort keys recursively ---
function sortObjectKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((result: any, key) => {
      result[key] = sortObjectKeys(obj[key])
      return result
    }, {})
  }
  return obj
}

// --- Unicode escape ---
function applyUnicodeEscape(str: string): string {
  return str.replace(/[^\x00-\x7F]/g, c => {
    const code = c.codePointAt(0)!
    if (code > 0xFFFF) {
      const high = Math.floor((code - 0x10000) / 0x400) + 0xD800
      const low = (code - 0x10000) % 0x400 + 0xDC00
      return '\\u' + high.toString(16).padStart(4, '0') + '\\u' + low.toString(16).padStart(4, '0')
    }
    return '\\u' + code.toString(16).padStart(4, '0')
  })
}

// --- Process JSON ---
function process() {
  error.value = null
  const text = input.value.trim()

  if (!text) {
    prettyResult.value = ''
    minifyResult.value = ''
    prettyCharCount.value = 0
    minifyCharCount.value = 0
    showCompression.value = false
    return
  }

  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch (e: any) {
    const match = e.message?.match(/position\s+(\d+)/)
    let hint = e.message || 'JSON解析失败'
    if (match) {
      const pos = parseInt(match[1])
      const before = text.substring(0, pos)
      const line = (before.match(/\n/g) || []).length + 1
      const col = pos - before.lastIndexOf('\n')
      hint = `第 ${line} 行第 ${col} 列: ${e.message}`
    }
    error.value = hint
    prettyResult.value = ''
    minifyResult.value = ''
    prettyCharCount.value = 0
    minifyCharCount.value = 0
    showCompression.value = false
    return
  }

  if (sortKeys.value) parsed = sortObjectKeys(parsed)

  const indentVal = indent.value === 'tab' ? '\t' : parseInt(indent.value)

  let pretty = JSON.stringify(parsed, null, indentVal)
  if (unicodeEscape.value) pretty = applyUnicodeEscape(pretty)

  let minified = JSON.stringify(parsed)
  if (unicodeEscape.value) minified = applyUnicodeEscape(minified)

  prettyResult.value = pretty
  minifyResult.value = minified
  prettyCharCount.value = pretty.length
  minifyCharCount.value = minified.length

  const inputLen = text.length
  const minLen = minified.length
  if (inputLen > 0 && inputLen !== minLen) {
    const rate = Math.round((1 - minLen / inputLen) * 100)
    compressionRateText.value = `${rate > 0 ? '' : '+'}${Math.abs(rate)}%（${inputLen} → ${minLen} 字符）`
    showCompression.value = true
  } else if (inputLen === minLen) {
    compressionRateText.value = `0%（${inputLen} → ${minLen} 字符）`
    showCompression.value = true
  } else {
    showCompression.value = false
  }

  addHistoryRecord(text)
}

// --- Actions ---
function handleReset() {
  input.value = ''
  prettyResult.value = ''
  minifyResult.value = ''
  prettyCharCount.value = 0
  minifyCharCount.value = 0
  showCompression.value = false
  error.value = null
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) input.value = text
  } catch {
    // clipboard read requires permission, ignore if denied
  }
}

// --- Copy with feedback ---
const copyPrettyCopied = ref(false)
const copyMinifyCopied = ref(false)

async function copyPretty() {
  if (!prettyResult.value) return
  const ok = await clipboardCopy(prettyResult.value)
  if (ok) {
    copyPrettyCopied.value = true
    setTimeout(() => { copyPrettyCopied.value = false }, 1200)
  }
}

async function copyMinify() {
  if (!minifyResult.value) return
  const ok = await clipboardCopy(minifyResult.value)
  if (ok) {
    copyMinifyCopied.value = true
    setTimeout(() => { copyMinifyCopied.value = false }, 1200)
  }
}

// --- Reactive watchers ---
// Config changes trigger immediate re-format
watch([indent, sortKeys, unicodeEscape], () => {
  if (input.value.trim()) process()
})

// Input changes trigger debounced format
let inputTimer: ReturnType<typeof setTimeout> | null = null
watch(input, () => {
  if (inputTimer) clearTimeout(inputTimer)
  inputTimer = setTimeout(process, 300)
})

// --- Keyboard shortcut (Ctrl+Enter) ---
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    process()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (inputTimer) clearTimeout(inputTimer)
})
</script>

<template>
  <ToolContainer>
    <ErrorBanner v-if="error" :message="error" @dismiss="error = null" />

    <!-- Input Editor -->
    <div class="editor-header">
      <span class="editor-title">输入（JSON）</span>
      <div class="editor-actions">
        <button class="copy-btn" @click="handlePaste">粘贴</button>
        <button class="copy-btn" @click="handleReset">清空</button>
      </div>
    </div>
    <div class="editor-body">
      <div class="line-numbers" ref="lineNumbersRef">{{ lineNumbersText }}</div>
      <textarea
        class="editor-textarea"
        ref="textareaRef"
        v-model="input"
        spellcheck="false"
        placeholder='粘贴 JSON，如 {"name":"张三","age":25}'
        @scroll="syncScroll"
      ></textarea>
    </div>

    <!-- Action Row -->
    <div class="action-row">
      <button class="btn-action" @click="process" :disabled="!input.trim()">格式化 &amp; 压缩</button>
      <button class="btn-outline reset-btn" @click="handleReset">重置</button>
    </div>

    <!-- Output Panels -->
    <div class="output-panels">
      <!-- Left: Pretty output -->
      <div class="panel-pretty">
        <div class="panel-header">
          <span class="panel-title">格式化（Pretty）</span>
          <div class="panel-actions">
            <button
              class="copy-btn"
              :class="{ copied: copyPrettyCopied }"
              @click="copyPretty"
            >{{ copyPrettyCopied ? '已复制' : '复制' }}</button>
          </div>
        </div>
        <div class="panel-body" :class="{ empty: !prettyResult }">
          <div v-if="prettyResult" v-html="highlightedPretty"></div>
          <span v-else>输入 JSON 后点击「格式化 &amp; 压缩」查看结果</span>
        </div>
        <div class="char-count" v-if="prettyCharCount">{{ prettyCharCount }} 字符</div>
      </div>

      <!-- Right: Config + Minified -->
      <div class="panel-right">
        <!-- Config Area -->
        <div class="config-panel">
          <div class="config-row">
            <span class="config-label">缩进</span>
            <select class="config-select" v-model="indent">
              <option value="2">2 空格</option>
              <option value="4">4 空格</option>
              <option value="tab">Tab</option>
            </select>
          </div>
          <div class="config-row">
            <span class="config-label">排序 Keys</span>
            <div class="toggle-switch" :class="{ active: sortKeys }" @click="sortKeys = !sortKeys"></div>
          </div>
          <div class="config-row">
            <span class="config-label">Unicode 转义</span>
            <div class="toggle-switch" :class="{ active: unicodeEscape }" @click="unicodeEscape = !unicodeEscape"></div>
          </div>
        </div>

        <!-- Minified Output -->
        <div class="minify-panel">
          <div class="panel-header">
            <span class="panel-title">压缩（Minified）</span>
            <div class="panel-actions">
              <button
                class="copy-btn"
                :class="{ copied: copyMinifyCopied }"
                @click="copyMinify"
              >{{ copyMinifyCopied ? '已复制' : '复制' }}</button>
            </div>
          </div>
          <div class="minify-body" :class="{ empty: !minifyResult }">
            {{ minifyResult || '输入 JSON 后点击「格式化 & 压缩」查看结果' }}
          </div>
          <div class="char-count" v-if="minifyCharCount">{{ minifyCharCount }} 字符</div>
        </div>
      </div>
    </div>

    <!-- Compression Rate -->
    <div class="compression-bar" v-if="showCompression">
      压缩率: <span class="rate">{{ compressionRateText }}</span>
    </div>

    <!-- History -->
    <HistorySection :records="history" @restore="restoreFromHistory" @clear="clearHistory" />
  </ToolContainer>
</template>

<style scoped>
.action-row { display: flex; align-items: center; gap: 8px; margin: 12px 0; }
.btn-action {
  padding: 7px 20px; border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white; font-size: 13px; font-weight: 500; border: none; cursor: pointer;
}
.btn-action:hover { opacity: 0.9; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
.reset-btn { padding: 7px 16px; font-size: 13px; }

.copy-btn {
  padding: 3px 10px; border-radius: 4px; background: var(--bg-white);
  color: var(--text-muted); font-size: 11px; border: 1px solid var(--border-input);
  cursor: pointer; transition: all 0.15s;
}
.copy-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
.copy-btn.copied { color: #16a34a; border-color: #16a34a; }

.output-panels { display: flex; gap: 12px; margin-top: 12px; }
.panel-pretty { flex: 3; min-width: 0; }
.panel-right { flex: 2; min-width: 0; display: flex; flex-direction: column; gap: 12px; }

.config-panel {
  background: var(--bg-code); border-radius: 8px; padding: 12px 16px;
  border: 1px solid var(--border-card);
}
.config-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.config-row:last-child { margin-bottom: 0; }
.config-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; min-width: 56px; }
.config-select {
  height: 26px; border-radius: 4px; border: 1px solid var(--border-input);
  padding: 0 8px; font-size: 12px; color: var(--text-primary); background: var(--bg-white);
  outline: none; flex: 1;
}
.config-select:focus { border-color: var(--primary); }

.minify-panel { flex: 1; display: flex; flex-direction: column; }
.minify-body {
  flex: 1; border: 1px solid var(--border-card); border-radius: 0 0 8px 8px;
  background: var(--bg-code-alt); padding: 10px 12px; min-height: 60px;
  font-family: 'Consolas', monospace; font-size: 12px; color: var(--text-secondary);
  word-break: break-all; overflow-x: auto; white-space: pre-wrap;
}
.minify-body.empty { color: var(--text-placeholder); font-style: italic; }

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-code); padding: 6px 12px;
  border: 1px solid var(--border-card); border-bottom: none; border-radius: 8px 8px 0 0;
}
.panel-title { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.panel-actions { display: flex; gap: 6px; }

.panel-body {
  border: 1px solid var(--border-card); border-radius: 0 0 8px 8px;
  background: var(--bg-code-alt); padding: 10px 12px; min-height: 200px;
  overflow-x: auto; font-family: 'Consolas', monospace; font-size: 13px;
  line-height: 1.7; white-space: pre-wrap;
}
.panel-body.empty { color: var(--text-placeholder); font-style: italic; }

.char-count { font-size: 10px; color: var(--text-disabled); margin-top: 4px; text-align: right; }

.compression-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
  background: var(--bg-code); border: 1px solid var(--border-card); border-radius: 8px;
  font-size: 12px; color: var(--text-secondary); margin-top: 8px;
}
.compression-bar .rate { font-weight: 600; color: var(--primary); }


/* JSON syntax highlight */
:deep(.json-key) { color: #2563eb; }
:deep(.json-string) { color: #16a34a; }
:deep(.json-number) { color: #7c3aed; }
:deep(.json-bool) { color: #d97706; }
:deep(.json-null) { color: #dc2626; }
:deep(.json-bracket) { color: #475569; }
</style>
