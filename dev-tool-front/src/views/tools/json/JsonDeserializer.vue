<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

// --- State ---
const input = ref('')
const language = ref('java')
const className = ref('RootClass')
const error = ref<string | null>(null)
const generatedHtml = ref('')
const generatedPlain = ref('')
const hasGenerated = ref(false)

const { copy: clipboardCopy } = useClipboard()
const copyCopied = ref(false)

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

// --- HTML escape ---
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// --- Case helpers ---
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function toPascalCase(s: string): string {
  return s.split(/[_\-\s]+/).map(capitalize).join('')
}

function toCamelCase(s: string): string {
  const p = toPascalCase(s)
  return p.charAt(0).toLowerCase() + p.slice(1)
}

function toSnakeCase(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase()
}

// --- Type inference ---
type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object'

function inferType(value: unknown): JsonType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value as JsonType
}

// --- Sub-class collector ---
interface SubClass {
  name: string
  code: string
}

// ============================================================
// Java generator
// ============================================================
function mapJavaType(key: string, val: unknown, subClasses: SubClass[]): string {
  const t = inferType(val)
  if (t === 'string') return 'String'
  if (t === 'number') return typeof val === 'number' && val % 1 !== 0 ? 'Double' : 'Integer'
  if (t === 'boolean') return 'Boolean'
  if (t === 'null') return 'Object'
  if (t === 'array') {
    const arr = val as unknown[]
    let itemType = 'Object'
    if (arr.length > 0) {
      const itemT = inferType(arr[0])
      if (itemT === 'object') {
        const subName = toPascalCase(key) + 'Item'
        subClasses.push({ name: subName, code: generateJava(arr[0] as Record<string, unknown>, subName) })
        itemType = subName
      } else if (itemT === 'string') itemType = 'String'
      else if (itemT === 'number') itemType = typeof arr[0] === 'number' && arr[0] % 1 !== 0 ? 'Double' : 'Integer'
      else if (itemT === 'boolean') itemType = 'Boolean'
    }
    return 'List&lt;' + itemType + '&gt;'
  }
  if (t === 'object') {
    const subName = toPascalCase(key)
    subClasses.push({ name: subName, code: generateJava(val as Record<string, unknown>, subName) })
    return subName
  }
  return 'Object'
}

function generateJava(obj: Record<string, unknown>, clsName: string): string {
  const subClasses: SubClass[] = []
  let code = `<span class="code-keyword">public class</span> <span class="code-type">${escapeHtml(clsName)}</span> <span class="code-bracket">{</span>\n`
  const entries = Object.entries(obj)
  for (const [key, val] of entries) {
    const type = mapJavaType(key, val, subClasses)
    const fieldName = toCamelCase(key)
    code += `    <span class="code-keyword">private</span> <span class="code-type">${type}</span> ${escapeHtml(fieldName)};\n`
  }
  code += '\n'
  for (const [key, val] of entries) {
    const type = mapJavaType(key, val, subClasses)
    const fieldName = toCamelCase(key)
    const getterName = (type === 'Boolean' ? 'is' : 'get') + toPascalCase(key)
    code += `    <span class="code-keyword">public</span> <span class="code-type">${type}</span> ${escapeHtml(getterName)}() <span class="code-bracket">{</span> <span class="code-keyword">return</span> ${escapeHtml(fieldName)}; <span class="code-bracket">}</span>\n`
    code += `    <span class="code-keyword">public void</span> set${toPascalCase(key)}(<span class="code-type">${type}</span> ${escapeHtml(fieldName)}) <span class="code-bracket">{</span> <span class="code-keyword">this</span>.${escapeHtml(fieldName)} = ${escapeHtml(fieldName)}; <span class="code-bracket">}</span>\n`
  }
  code += '<span class="code-bracket">}</span>\n'
  for (const sc of subClasses) {
    code += '\n' + sc.code + '\n'
  }
  return code
}

// ============================================================
// Python generator
// ============================================================
function mapPythonType(key: string, val: unknown, subClasses: SubClass[]): string {
  const t = inferType(val)
  if (t === 'string') return 'str'
  if (t === 'number') return typeof val === 'number' && val % 1 !== 0 ? 'float' : 'float | int'
  if (t === 'boolean') return 'bool'
  if (t === 'null') return 'Any'
  if (t === 'array') {
    const arr = val as unknown[]
    let itemType = 'Any'
    if (arr.length > 0) {
      const itemT = inferType(arr[0])
      if (itemT === 'object') {
        const subName = toPascalCase(key) + 'Item'
        subClasses.push({ name: subName, code: generatePython(arr[0] as Record<string, unknown>, subName) })
        itemType = subName
      } else if (itemT === 'string') itemType = 'str'
      else if (itemT === 'number') itemType = 'float | int'
      else if (itemT === 'boolean') itemType = 'bool'
    }
    return 'List[' + itemType + ']'
  }
  if (t === 'object') {
    const subName = toPascalCase(key)
    subClasses.push({ name: subName, code: generatePython(val as Record<string, unknown>, subName) })
    return subName
  }
  return 'Any'
}

function generatePython(obj: Record<string, unknown>, clsName: string): string {
  const subClasses: SubClass[] = []
  let code = '<span class="code-keyword">from</span> dataclasses <span class="code-keyword">import</span> dataclass\n'
  code += '<span class="code-keyword">from</span> typing <span class="code-keyword">import</span> List, Optional, Any\n\n'
  code += '<span class="code-annotation">@dataclass</span>\n'
  code += `<span class="code-keyword">class</span> <span class="code-type">${escapeHtml(clsName)}</span>:\n`
  for (const [key, val] of Object.entries(obj)) {
    const type = mapPythonType(key, val, subClasses)
    code += `    ${escapeHtml(key)}: ${type}\n`
  }
  for (const sc of subClasses) {
    code += '\n' + sc.code + '\n'
  }
  return code
}

// ============================================================
// Go generator
// ============================================================
function mapGoType(key: string, val: unknown, subStructs: SubClass[]): string {
  const t = inferType(val)
  if (t === 'string') return 'string'
  if (t === 'number') return typeof val === 'number' && val % 1 !== 0 ? 'float64' : 'int'
  if (t === 'boolean') return 'bool'
  if (t === 'null') return 'interface{}'
  if (t === 'array') {
    const arr = val as unknown[]
    let itemType = 'interface{}'
    if (arr.length > 0) {
      const itemT = inferType(arr[0])
      if (itemT === 'object') {
        const subName = toPascalCase(key) + 'Item'
        subStructs.push({ name: subName, code: generateGo(arr[0] as Record<string, unknown>, subName) })
        itemType = subName
      } else if (itemT === 'string') itemType = 'string'
      else if (itemT === 'number') itemType = typeof arr[0] === 'number' && arr[0] % 1 !== 0 ? 'float64' : 'int'
      else if (itemT === 'boolean') itemType = 'bool'
    }
    return '[]' + itemType
  }
  if (t === 'object') {
    const subName = toPascalCase(key)
    subStructs.push({ name: subName, code: generateGo(val as Record<string, unknown>, subName) })
    return subName
  }
  return 'interface{}'
}

function generateGo(obj: Record<string, unknown>, structName: string): string {
  const subStructs: SubClass[] = []
  let code = '<span class="code-keyword">package</span> main\n\n'
  code += `<span class="code-keyword">type</span> <span class="code-type">${escapeHtml(structName)}</span> <span class="code-keyword">struct</span> <span class="code-bracket">{</span>\n`
  for (const [key, val] of Object.entries(obj)) {
    const type = mapGoType(key, val, subStructs)
    code += `\t${toPascalCase(key)}  ${type}  <span class="code-string">\`json:"${escapeHtml(key)}"\`</span>\n`
  }
  code += '<span class="code-bracket">}</span>\n'
  for (const sc of subStructs) {
    code += '\n' + sc.code + '\n'
  }
  return code
}

// ============================================================
// TypeScript generator
// ============================================================
function mapTsType(key: string, val: unknown, subIfaces: SubClass[]): string {
  const t = inferType(val)
  if (t === 'string') return 'string'
  if (t === 'number') return 'number'
  if (t === 'boolean') return 'boolean'
  if (t === 'null') return 'null'
  if (t === 'array') {
    const arr = val as unknown[]
    let itemType = 'any'
    if (arr.length > 0) {
      const itemT = inferType(arr[0])
      if (itemT === 'object') {
        const subName = toPascalCase(key) + 'Item'
        subIfaces.push({ name: subName, code: generateTypeScript(arr[0] as Record<string, unknown>, subName) })
        itemType = subName
      } else if (itemT === 'string') itemType = 'string'
      else if (itemT === 'number') itemType = 'number'
      else if (itemT === 'boolean') itemType = 'boolean'
    }
    return itemType + '[]'
  }
  if (t === 'object') {
    const subName = toPascalCase(key)
    subIfaces.push({ name: subName, code: generateTypeScript(val as Record<string, unknown>, subName) })
    return subName
  }
  return 'any'
}

function generateTypeScript(obj: Record<string, unknown>, ifaceName: string): string {
  const subIfaces: SubClass[] = []
  let code = `<span class="code-keyword">export interface</span> <span class="code-type">${escapeHtml(ifaceName)}</span> <span class="code-bracket">{</span>\n`
  for (const [key, val] of Object.entries(obj)) {
    const type = mapTsType(key, val, subIfaces)
    code += `  ${escapeHtml(key)}: ${type};\n`
  }
  code += '<span class="code-bracket">}</span>\n'
  for (const sc of subIfaces) {
    code += '\n' + sc.code + '\n'
  }
  return code
}

// ============================================================
// C# generator
// ============================================================
function mapCSharpType(key: string, val: unknown, subClasses: SubClass[]): string {
  const t = inferType(val)
  if (t === 'string') return 'string'
  if (t === 'number') return typeof val === 'number' && val % 1 !== 0 ? 'double' : 'int'
  if (t === 'boolean') return 'bool'
  if (t === 'null') return 'object'
  if (t === 'array') {
    const arr = val as unknown[]
    let itemType = 'object'
    if (arr.length > 0) {
      const itemT = inferType(arr[0])
      if (itemT === 'object') {
        const subName = toPascalCase(key) + 'Item'
        subClasses.push({ name: subName, code: generateCSharp(arr[0] as Record<string, unknown>, subName) })
        itemType = subName
      } else if (itemT === 'string') itemType = 'string'
      else if (itemT === 'number') itemType = typeof arr[0] === 'number' && arr[0] % 1 !== 0 ? 'double' : 'int'
      else if (itemT === 'boolean') itemType = 'bool'
    }
    return 'List&lt;' + itemType + '&gt;'
  }
  if (t === 'object') {
    const subName = toPascalCase(key)
    subClasses.push({ name: subName, code: generateCSharp(val as Record<string, unknown>, subName) })
    return subName
  }
  return 'object'
}

function generateCSharp(obj: Record<string, unknown>, clsName: string): string {
  const subClasses: SubClass[] = []
  let code = `<span class="code-keyword">public class</span> <span class="code-type">${escapeHtml(clsName)}</span>\n<span class="code-bracket">{</span>\n`
  for (const [key, val] of Object.entries(obj)) {
    const type = mapCSharpType(key, val, subClasses)
    const propName = toPascalCase(key)
    code += `    <span class="code-bracket">[</span><span class="code-annotation">JsonPropertyName</span>(<span class="code-string">"${escapeHtml(key)}"</span>)<span class="code-bracket">]</span>\n`
    code += `    <span class="code-keyword">public</span> <span class="code-type">${type}</span> ${escapeHtml(propName)} <span class="code-bracket">{</span> <span class="code-keyword">get</span>; <span class="code-keyword">set</span>; <span class="code-bracket">}</span>\n\n`
  }
  code += '<span class="code-bracket">}</span>\n'
  for (const sc of subClasses) {
    code += '\n' + sc.code + '\n'
  }
  return code
}

// ============================================================
// Rust generator
// ============================================================
function mapRustType(key: string, val: unknown, subStructs: SubClass[]): string {
  const t = inferType(val)
  if (t === 'string') return 'String'
  if (t === 'number') return typeof val === 'number' && val % 1 !== 0 ? 'f64' : 'i64'
  if (t === 'boolean') return 'bool'
  if (t === 'null') return 'Option&lt;serde_json::Value&gt;'
  if (t === 'array') {
    const arr = val as unknown[]
    let itemType = 'serde_json::Value'
    if (arr.length > 0) {
      const itemT = inferType(arr[0])
      if (itemT === 'object') {
        const subName = toPascalCase(key) + 'Item'
        subStructs.push({ name: subName, code: generateRust(arr[0] as Record<string, unknown>, subName) })
        itemType = subName
      } else if (itemT === 'string') itemType = 'String'
      else if (itemT === 'number') itemType = typeof arr[0] === 'number' && arr[0] % 1 !== 0 ? 'f64' : 'i64'
      else if (itemT === 'boolean') itemType = 'bool'
    }
    return 'Vec&lt;' + itemType + '&gt;'
  }
  if (t === 'object') {
    const subName = toPascalCase(key)
    subStructs.push({ name: subName, code: generateRust(val as Record<string, unknown>, subName) })
    return subName
  }
  return 'serde_json::Value'
}

function generateRust(obj: Record<string, unknown>, structName: string): string {
  const subStructs: SubClass[] = []
  let code = '<span class="code-keyword">use</span> serde::{Deserialize, Serialize};\n\n'
  code += '<span class="code-annotation">#[derive(Debug, Serialize, Deserialize)]</span>\n'
  code += `<span class="code-keyword">pub struct</span> <span class="code-type">${escapeHtml(structName)}</span> <span class="code-bracket">{</span>\n`
  for (const [key, val] of Object.entries(obj)) {
    const type = mapRustType(key, val, subStructs)
    code += `    <span class="code-annotation">#[serde(rename = "${escapeHtml(key)}")]</span>\n`
    code += `    pub ${toSnakeCase(key)}: ${type},\n`
  }
  code += '<span class="code-bracket">}</span>\n'
  for (const sc of subStructs) {
    code += '\n' + sc.code + '\n'
  }
  return code
}

// ============================================================
// Main generate
// ============================================================
function extractPlainText(html: string): string {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  return tempDiv.textContent || tempDiv.innerText || ''
}

function handleGenerate() {
  error.value = null
  const text = input.value.trim()

  if (!text) {
    generatedHtml.value = ''
    generatedPlain.value = ''
    hasGenerated.value = false
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e: any) {
    const match = e.message?.match(/position\s+(\d+)/)
    let hint = e.message || 'JSON 解析失败'
    if (match) {
      const pos = parseInt(match[1])
      const before = text.substring(0, pos)
      const line = (before.match(/\n/g) || []).length + 1
      const col = pos - before.lastIndexOf('\n')
      hint = `第 ${line} 行第 ${col} 列: ${e.message}`
    }
    error.value = hint
    generatedHtml.value = ''
    generatedPlain.value = ''
    hasGenerated.value = false
    return
  }

  const rootName = className.value.trim() || 'RootClass'
  const obj = parsed as Record<string, unknown>
  let html = ''

  switch (language.value) {
    case 'java':
      html = generateJava(obj, rootName)
      break
    case 'python':
      html = generatePython(obj, rootName)
      break
    case 'go':
      html = generateGo(obj, rootName)
      break
    case 'typescript':
      html = generateTypeScript(obj, rootName)
      break
    case 'csharp':
      html = generateCSharp(obj, rootName)
      break
    case 'rust':
      html = generateRust(obj, rootName)
      break
    default:
      html = generateJava(obj, rootName)
      break
  }

  generatedHtml.value = html
  generatedPlain.value = extractPlainText(html)
  hasGenerated.value = true
}

// --- Actions ---
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) input.value = text
  } catch {
    // clipboard read requires permission
  }
}

function handleClear() {
  input.value = ''
}

function handleReset() {
  input.value = ''
  generatedHtml.value = ''
  generatedPlain.value = ''
  hasGenerated.value = false
  error.value = null
  className.value = 'RootClass'
  language.value = 'java'
}

async function copyOutput() {
  if (!generatedPlain.value) return
  const ok = await clipboardCopy(generatedPlain.value)
  if (ok) {
    copyCopied.value = true
    setTimeout(() => { copyCopied.value = false }, 1200)
  }
}

// --- Keyboard shortcut: Ctrl+Enter ---
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handleGenerate()
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
    <!-- Error message -->
    <ErrorBanner v-if="error" :message="error" @dismiss="error = null" />

    <!-- Input Editor -->
    <div class="editor-header">
      <span class="editor-title">输入（JSON）</span>
      <div class="editor-actions">
        <button class="copy-btn" @click="handlePaste">粘贴</button>
        <button class="copy-btn" @click="handleClear">清空</button>
      </div>
    </div>
    <div class="editor-body">
      <div class="line-numbers" ref="lineNumbersRef">{{ lineNumbersText }}</div>
      <textarea
        class="editor-textarea"
        ref="textareaRef"
        v-model="input"
        spellcheck="false"
        placeholder='粘贴 JSON，如 {"name":"张三","age":25,"address":{"city":"北京"}}'
        @scroll="syncScroll"
      ></textarea>
    </div>

    <!-- Language select + Action Row -->
    <div class="action-row">
      <div class="lang-bar">
        <span class="lang-label">目标语言</span>
        <select class="option-select" v-model="language">
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="go">Go</option>
          <option value="typescript">TypeScript</option>
          <option value="csharp">C#</option>
          <option value="rust">Rust</option>
        </select>
      </div>
      <div class="option-group">
        <span class="lang-label">类名</span>
        <input type="text" class="option-input" v-model="className" placeholder="RootClass" />
      </div>
      <button class="btn-action" @click="handleGenerate" :disabled="!input.trim()">生成</button>
      <button class="btn-outline reset-btn" @click="handleReset">重置</button>
    </div>

    <!-- Output Header -->
    <div class="editor-header">
      <span class="editor-title">生成代码</span>
      <div class="editor-actions">
        <button
          class="copy-btn"
          :class="{ copied: copyCopied }"
          @click="copyOutput"
        >{{ copyCopied ? '已复制' : '复制' }}</button>
      </div>
    </div>

    <!-- Output Panel -->
    <div class="editor-body output">
      <div class="editor-output" :class="{ empty: !hasGenerated }">
        <template v-if="hasGenerated">
          <div v-html="generatedHtml"></div>
        </template>
        <template v-else>
          输入 JSON 后点击「生成」查看代码
        </template>
      </div>
    </div>

    <!-- Type Legend -->
    <div class="type-legend">
      <span class="type-legend-label">类型映射:</span>
      <div class="type-legend-item"><span class="type-badge badge-string">String</span></div>
      <div class="type-legend-item"><span class="type-badge badge-number">Number</span></div>
      <div class="type-legend-item"><span class="type-badge badge-boolean">Boolean</span></div>
      <div class="type-legend-item"><span class="type-badge badge-object">Object</span></div>
      <div class="type-legend-item"><span class="type-badge badge-array">Array</span></div>
      <div class="type-legend-item"><span class="type-badge badge-null">Null</span></div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}

.btn-action {
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

.btn-action:hover {
  opacity: 0.9;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-btn {
  padding: 7px 16px;
  font-size: 13px;
}

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

.copy-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.copy-btn.copied {
  color: #16a34a;
  border-color: #16a34a;
}

.lang-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}


/* Code syntax colors */
:deep(.code-keyword) {
  color: #7c3aed;
  font-weight: 500;
}

:deep(.code-type) {
  color: #2563eb;
}

:deep(.code-string) {
  color: #16a34a;
}

:deep(.code-comment) {
  color: #64748b;
  font-style: italic;
}

:deep(.code-annotation) {
  color: #d97706;
}

:deep(.code-number) {
  color: #7c3aed;
}

:deep(.code-bracket) {
  color: #475569;
}

/* Type Legend */
.type-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-code);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.type-legend-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  margin-right: 4px;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.badge-string {
  background: #dcfce7;
  color: #16a34a;
}

.badge-number {
  background: #dbeafe;
  color: #2563eb;
}

.badge-boolean {
  background: #fef9c3;
  color: #a16207;
}

.badge-object {
  background: #f1f5f9;
  color: #475569;
}

.badge-array {
  background: #f3e8ff;
  color: #7c3aed;
}

.badge-null {
  background: #fee2e2;
  color: #dc2626;
}
</style>
