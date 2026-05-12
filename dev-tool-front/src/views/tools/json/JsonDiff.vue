<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

// --- State ---
const inputA = ref('')
const inputB = ref('')
const error = ref<string | null>(null)
const { copy: clipboardCopy } = useClipboard()

// --- Line numbers ---
const lineNumbersA = computed(() => {
  const count = inputA.value ? inputA.value.split('\n').length : 1
  return Array.from({ length: count }, (_, i) => i + 1).join('\n')
})
const lineNumbersB = computed(() => {
  const count = inputB.value ? inputB.value.split('\n').length : 1
  return Array.from({ length: count }, (_, i) => i + 1).join('\n')
})

const textareaARef = ref<HTMLTextAreaElement>()
const textareaBRef = ref<HTMLTextAreaElement>()
const lineNumARef = ref<HTMLDivElement>()
const lineNumBRef = ref<HTMLDivElement>()

function syncScrollA() {
  if (lineNumARef.value && textareaARef.value) {
    lineNumARef.value.scrollTop = textareaARef.value.scrollTop
  }
}
function syncScrollB() {
  if (lineNumBRef.value && textareaBRef.value) {
    lineNumBRef.value.scrollTop = textareaBRef.value.scrollTop
  }
}

// --- Escape HTML ---
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// --- Format a value for display ---
function formatValue(val: unknown): string {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (typeof val === 'string') return '"' + val + '"'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function escapeAndHighlight(val: unknown): string {
  const str = formatValue(val)
  let escaped = escapeHtml(str)
  escaped = escaped.replace(/&quot;([^&]*)&quot;/g, '<span class="json-string">"$1"</span>')
  return escaped
}

// --- Diff result types ---
interface DiffEntry {
  type: 'same' | 'add' | 'del' | 'mod'
  path: string
  oldVal: unknown
  newVal: unknown
}

const diffResults = ref<DiffEntry[]>([])
const diffResultText = ref('')
const showStats = ref(false)
const stats = ref({ same: 0, add: 0, del: 0, mod: 0 })

// --- Deep diff comparison (object-level, ignores key order) ---
function deepDiff(a: unknown, b: unknown, path: string, results: DiffEntry[]): void {
  let typeA = a === null ? 'null' : typeof a
  let typeB = b === null ? 'null' : typeof b
  if (Array.isArray(a)) typeA = 'array'
  if (Array.isArray(b)) typeB = 'array'
  if (typeA === 'object' && a !== null && !Array.isArray(a)) typeA = 'object'
  if (typeB === 'object' && b !== null && !Array.isArray(b)) typeB = 'object'

  if (typeA !== typeB) {
    results.push({ type: 'mod', path, oldVal: a, newVal: b })
    return
  }

  if (typeA === 'array') {
    const arrA = a as unknown[]
    const arrB = b as unknown[]
    const maxLen = Math.max(arrA.length, arrB.length)
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path + '[' + i + ']'
      if (i >= arrA.length) {
        results.push({ type: 'add', path: itemPath, oldVal: undefined, newVal: arrB[i] })
      } else if (i >= arrB.length) {
        results.push({ type: 'del', path: itemPath, oldVal: arrA[i], newVal: undefined })
      } else {
        deepDiff(arrA[i], arrB[i], itemPath, results)
      }
    }
    return
  }

  if (typeA === 'object') {
    const objA = a as Record<string, unknown>
    const objB = b as Record<string, unknown>
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)
    const allKeys = [...new Set([...keysA, ...keysB])]

    for (const key of allKeys) {
      const keyPath = path ? path + '.' + key : key
      const inA = key in objA
      const inB = key in objB
      if (inA && !inB) {
        results.push({ type: 'del', path: keyPath, oldVal: objA[key], newVal: undefined })
      } else if (!inA && inB) {
        results.push({ type: 'add', path: keyPath, oldVal: undefined, newVal: objB[key] })
      } else {
        deepDiff(objA[key], objB[key], keyPath, results)
      }
    }
    return
  }

  // Primitive comparison
  if (a !== b) {
    results.push({ type: 'mod', path, oldVal: a, newVal: b })
  } else {
    results.push({ type: 'same', path, oldVal: a, newVal: b })
  }
}

// --- Execute diff ---
function executeDiff() {
  error.value = null
  const strA = inputA.value.trim()
  const strB = inputB.value.trim()

  if (!strA && !strB) {
    error.value = '请输入两份 JSON 数据'
    return
  }
  if (!strA) {
    error.value = '请输入 JSON A'
    return
  }
  if (!strB) {
    error.value = '请输入 JSON B'
    return
  }

  let parsedA: unknown, parsedB: unknown
  try {
    parsedA = JSON.parse(strA)
  } catch (e: any) {
    const match = e.message?.match(/position\s+(\d+)/)
    if (match) {
      const pos = parseInt(match[1])
      const before = strA.substring(0, pos)
      const line = (before.match(/\n/g) || []).length + 1
      const col = pos - before.lastIndexOf('\n')
      error.value = `JSON A 解析错误 - 第 ${line} 行第 ${col} 列: ${e.message}`
    } else {
      error.value = 'JSON A 解析错误: ' + e.message
    }
    diffResults.value = []
    showStats.value = false
    return
  }
  try {
    parsedB = JSON.parse(strB)
  } catch (e: any) {
    const match = e.message?.match(/position\s+(\d+)/)
    if (match) {
      const pos = parseInt(match[1])
      const before = strB.substring(0, pos)
      const line = (before.match(/\n/g) || []).length + 1
      const col = pos - before.lastIndexOf('\n')
      error.value = `JSON B 解析错误 - 第 ${line} 行第 ${col} 列: ${e.message}`
    } else {
      error.value = 'JSON B 解析错误: ' + e.message
    }
    diffResults.value = []
    showStats.value = false
    return
  }

  const results: DiffEntry[] = []
  deepDiff(parsedA, parsedB, '', results)

  const counts = { same: 0, add: 0, del: 0, mod: 0 }
  results.forEach(r => { counts[r.type]++ })

  diffResults.value = results
  stats.value = counts
  showStats.value = true

  // Build plain text result
  const lines: string[] = []
  for (const r of results) {
    const displayPath = r.path || '(root)'
    if (r.type === 'same') {
      lines.push('  ' + displayPath + ': ' + formatValue(r.oldVal))
    } else if (r.type === 'add') {
      lines.push('+ ' + r.path + ': ' + formatValue(r.newVal))
    } else if (r.type === 'del') {
      lines.push('- ' + r.path + ': ' + formatValue(r.oldVal))
    } else if (r.type === 'mod') {
      lines.push('~ ' + r.path + ': ' + formatValue(r.oldVal) + ' -> ' + formatValue(r.newVal))
    }
  }
  diffResultText.value = results.length === 0 ? '两份 JSON 完全相同' : lines.join('\n')
}

// --- Render a single diff entry as HTML ---
function renderDiffLine(r: DiffEntry): string {
  const displayPath = escapeHtml(r.path || '(root)')
  if (r.type === 'same') {
    return `<span class="diff-unchanged">${displayPath}: ${escapeAndHighlight(r.oldVal)}</span>`
  } else if (r.type === 'add') {
    return `<span class="diff-add">${escapeHtml(r.path)}: ${escapeAndHighlight(r.newVal)}</span>`
  } else if (r.type === 'del') {
    return `<span class="diff-del">${escapeHtml(r.path)}: ${escapeAndHighlight(r.oldVal)}</span>`
  } else {
    return `${escapeHtml(r.path)}: <span class="diff-mod">${escapeAndHighlight(r.oldVal)}</span> <span class="diff-arrow">&rarr;</span> <span class="diff-mod">${escapeAndHighlight(r.newVal)}</span>`
  }
}

function getPrefix(r: DiffEntry): { symbol: string; cls: string } {
  switch (r.type) {
    case 'same': return { symbol: ' ', cls: 'prefix-space' }
    case 'add': return { symbol: '+', cls: 'prefix-add' }
    case 'del': return { symbol: '-', cls: 'prefix-del' }
    case 'mod': return { symbol: '~', cls: 'prefix-mod' }
  }
}

// --- Actions ---
function handleReset() {
  inputA.value = ''
  inputB.value = ''
  diffResults.value = []
  diffResultText.value = ''
  showStats.value = false
  error.value = null
}

async function handlePaste(target: 'A' | 'B') {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      if (target === 'A') inputA.value = text
      else inputB.value = text
    }
  } catch {
    // clipboard read requires permission
  }
}

const copyCopied = ref(false)
async function copyResult() {
  if (!diffResultText.value) return
  const ok = await clipboardCopy(diffResultText.value)
  if (ok) {
    copyCopied.value = true
    setTimeout(() => { copyCopied.value = false }, 1200)
  }
}

// --- Keyboard shortcut: Ctrl+Enter ---
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    executeDiff()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <ToolContainer>
    <ErrorBanner v-if="error" :message="error" @dismiss="error = null" />

    <!-- Side-by-side input editors -->
    <div class="side-by-side">
      <!-- Left: JSON A -->
      <div class="side-panel">
        <div class="editor-header">
          <span class="editor-title">JSON A</span>
          <div class="editor-actions">
            <button class="copy-btn" @click="handlePaste('A')">粘贴</button>
            <button class="copy-btn" @click="inputA = ''">清空</button>
          </div>
        </div>
        <div class="editor-body">
          <div class="line-numbers" ref="lineNumARef">{{ lineNumbersA }}</div>
          <textarea
            class="editor-textarea"
            ref="textareaARef"
            v-model="inputA"
            spellcheck="false"
            placeholder='输入第一份 JSON，如 {"name":"张三","age":25}'
            @scroll="syncScrollA"
          ></textarea>
        </div>
      </div>
      <!-- Right: JSON B -->
      <div class="side-panel">
        <div class="editor-header">
          <span class="editor-title">JSON B</span>
          <div class="editor-actions">
            <button class="copy-btn" @click="handlePaste('B')">粘贴</button>
            <button class="copy-btn" @click="inputB = ''">清空</button>
          </div>
        </div>
        <div class="editor-body">
          <div class="line-numbers" ref="lineNumBRef">{{ lineNumbersB }}</div>
          <textarea
            class="editor-textarea"
            ref="textareaBRef"
            v-model="inputB"
            spellcheck="false"
            placeholder='输入第二份 JSON，如 {"name":"张三","age":26,"email":"test@example.com"}'
            @scroll="syncScrollB"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Action Row -->
    <div class="action-row">
      <button class="btn-action" @click="executeDiff">对比</button>
      <button class="btn-outline reset-btn" @click="handleReset">重置</button>
    </div>

    <!-- Diff Color Legend -->
    <div class="diff-legend" v-if="diffResults.length > 0 || showStats">
      <div class="diff-legend-item">
        <div class="legend-dot legend-dot-add"></div>
        <span>ADD 新增</span>
      </div>
      <div class="diff-legend-item">
        <div class="legend-dot legend-dot-del"></div>
        <span>DEL 删除</span>
      </div>
      <div class="diff-legend-item">
        <div class="legend-dot legend-dot-mod"></div>
        <span>MOD 修改</span>
      </div>
    </div>

    <!-- Diff Output Header -->
    <div class="editor-header">
      <span class="editor-title">对比结果</span>
      <div class="editor-actions">
        <button
          class="copy-btn"
          :class="{ copied: copyCopied }"
          @click="copyResult"
        >{{ copyCopied ? '已复制' : '复制' }}</button>
      </div>
    </div>

    <!-- Diff Result -->
    <div class="diff-result-container">
      <template v-if="diffResults.length === 0">
        <div class="diff-empty">输入两份 JSON 后点击「对比」查看差异</div>
      </template>
      <template v-else-if="diffResults.length === stats.same && stats.add === 0 && stats.del === 0 && stats.mod === 0">
        <div class="diff-empty">两份 JSON 完全相同</div>
      </template>
      <template v-else>
        <div
          v-for="(r, i) in diffResults"
          :key="i"
          class="diff-line"
        >
          <span class="diff-line-prefix" :class="getPrefix(r).cls">{{ getPrefix(r).symbol }}</span>
          <span class="diff-line-content" v-html="renderDiffLine(r)"></span>
        </div>
      </template>
    </div>

    <!-- Statistics -->
    <div class="diff-stats" v-if="showStats && diffResults.length > 0">
      <div class="stat-item">
        <span class="stat-label">相同:</span>
        <span class="stat-value stat-same">{{ stats.same }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">新增:</span>
        <span class="stat-value stat-add">{{ stats.add }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">删除:</span>
        <span class="stat-value stat-del">{{ stats.del }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">修改:</span>
        <span class="stat-value stat-mod">{{ stats.mod }}</span>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.action-row { display: flex; align-items: center; gap: 8px; margin: 12px 0; }
.btn-action {
  padding: 7px 20px; border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white; font-size: 13px; font-weight: 500; border: none; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-action:hover { opacity: 0.9; }
.reset-btn { padding: 7px 16px; font-size: 13px; }

.copy-btn {
  padding: 3px 10px; border-radius: 4px; background: var(--bg-white);
  color: var(--text-muted); font-size: 11px; border: 1px solid var(--border-input);
  cursor: pointer; transition: all 0.15s;
}
.copy-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
.copy-btn.copied { color: #16a34a; border-color: #16a34a; }

.side-by-side { display: flex; gap: 12px; }
.side-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.side-panel :deep(.editor-body) { min-height: 140px; }


/* Diff colors */
.diff-add { background: #dcfce7; color: #16a34a; padding: 1px 4px; border-radius: 2px; }
.diff-del { background: #fee2e2; color: #dc2626; padding: 1px 4px; border-radius: 2px; text-decoration: line-through; }
.diff-mod { background: #fef3c7; color: #d97706; padding: 1px 4px; border-radius: 2px; }
.diff-unchanged { color: var(--text-primary); }
.diff-arrow { color: var(--text-muted); margin: 0 4px; }

/* Color legend */
.diff-legend { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.diff-legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary); }
.legend-dot { width: 12px; height: 12px; border-radius: 3px; }
.legend-dot-add { background: #dcfce7; border: 1px solid #16a34a; }
.legend-dot-del { background: #fee2e2; border: 1px solid #dc2626; }
.legend-dot-mod { background: #fef3c7; border: 1px solid #d97706; }

/* Diff result view */
.diff-result-container {
  border: 1px solid var(--border-card); border-radius: 0 0 8px 8px;
  background: #f8faff; padding: 14px 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px; line-height: 2;
  min-height: 80px;
}
.diff-line { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.diff-line-prefix {
  width: 16px; text-align: center; font-weight: 600; font-size: 12px; flex-shrink: 0;
}
.diff-line-prefix.prefix-space { color: var(--text-disabled); }
.diff-line-prefix.prefix-add { color: #16a34a; }
.diff-line-prefix.prefix-del { color: #dc2626; }
.diff-line-prefix.prefix-mod { color: #d97706; }
.diff-line-content { flex: 1; }
.diff-empty { color: var(--text-placeholder); font-style: italic; text-align: center; padding: 20px; }

/* Statistics bar */
.diff-stats {
  display: flex; align-items: center; gap: 16px; padding: 8px 14px;
  background: var(--bg-code); border: 1px solid var(--border-card);
  border-radius: 6px; margin-top: 12px; font-size: 12px;
}
.stat-item { display: flex; align-items: center; gap: 4px; }
.stat-label { color: var(--text-muted); }
.stat-value { font-weight: 600; }
.stat-value.stat-same { color: var(--text-secondary); }
.stat-value.stat-add { color: #16a34a; }
.stat-value.stat-del { color: #dc2626; }
.stat-value.stat-mod { color: #d97706; }

/* JSON syntax highlight */
:deep(.json-string) { color: #16a34a; }
</style>
