<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import HistorySection from '@/components/common/HistorySection.vue'

const inputValue = ref('')
const sourceBase = ref('10')
const error = ref('')
const history = ref<any[]>([])

interface BaseResult { label: string; value: string; prefix: string }
const results = ref<BaseResult[]>([])

// Batch conversion state
const batchInput = ref('')
const batchResults = ref<{ input: string; bin: string; oct: string; dec: string; hex: string }[]>([])
const batchVisible = ref(false)

function convert() {
  error.value = ''
  if (!inputValue.value.trim()) { results.value = []; return }
  try {
    const base = parseInt(sourceBase.value)
    let cleaned = inputValue.value.trim()
    // Auto-detect prefixes
    if (base === 10) {
      if (/^0x/i.test(cleaned)) { sourceBase.value = '16'; cleaned = cleaned.slice(2) }
      else if (/^0b/i.test(cleaned)) { sourceBase.value = '2'; cleaned = cleaned.slice(2) }
      else if (/^0o/i.test(cleaned)) { sourceBase.value = '8'; cleaned = cleaned.slice(2) }
    }
    const actualBase = parseInt(sourceBase.value)
    const num = parseInt(cleaned, actualBase)
    if (isNaN(num)) throw new Error('无效的数字')
    results.value = [
      { label: '二进制 (Binary)', value: num.toString(2), prefix: '0b' },
      { label: '八进制 (Octal)', value: num.toString(8), prefix: '0o' },
      { label: '十进制 (Decimal)', value: num.toString(10), prefix: '' },
      { label: '十六进制 (Hex)', value: num.toString(16).toUpperCase(), prefix: '0x' },
    ]
  } catch (e: any) {
    error.value = e.message || '转换失败'
    results.value = []
  }
}

function batchConvert() {
  const lines = batchInput.value.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return
  batchResults.value = []
  const base = parseInt(sourceBase.value)
  for (const line of lines) {
    let cleaned = line
    let parseBase = base
    if (base === 10) {
      if (/^0x/i.test(cleaned)) { parseBase = 16; cleaned = cleaned.slice(2) }
      else if (/^0b/i.test(cleaned)) { parseBase = 2; cleaned = cleaned.slice(2) }
      else if (/^0o/i.test(cleaned)) { parseBase = 8; cleaned = cleaned.slice(2) }
    }
    const num = parseInt(cleaned, parseBase)
    if (isNaN(num)) {
      batchResults.value.push({ input: line, bin: '无效', oct: '无效', dec: '无效', hex: '无效' })
    } else {
      batchResults.value.push({ input: line, bin: num.toString(2), oct: num.toString(8), dec: num.toString(10), hex: num.toString(16).toUpperCase() })
    }
  }
  batchVisible.value = true
}

watch([inputValue, sourceBase], convert)
</script>

<template>
  <ToolContainer>
    <div class="options-panel">
      <div class="option-group">
        <span class="option-label">源进制</span>
        <select class="option-select" v-model="sourceBase">
          <option value="10">十进制</option>
          <option value="2">二进制</option>
          <option value="8">八进制</option>
          <option value="16">十六进制</option>
        </select>
      </div>
    </div>
    <div class="editor-header">
      <span class="editor-title">输入数值</span>
    </div>
    <div class="editor-body">
      <input class="calc-input" v-model="inputValue" placeholder="在此输入数值..." />
    </div>
    <div v-if="error" class="error-text">{{ error }}</div>

    <!-- Result cards grid -->
    <div style="margin-top: 16px;">
      <div v-for="r in results" :key="r.label" class="result-card">
        <div class="result-label">{{ r.label }}</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="result-value">{{ r.prefix }}{{ r.value }}</span>
          <CopyButton :text="r.prefix + r.value" label="复制" />
        </div>
      </div>
    </div>

    <!-- Batch conversion section -->
    <div style="margin-top: 20px; border: 1px solid var(--border-card); border-radius: 8px; padding: 16px;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">批量转换</div>
      <div class="editor-body" style="margin-bottom: 12px;">
        <textarea class="editor-textarea" v-model="batchInput" placeholder="每行一个数值，如：&#10;255&#10;128&#10;64" style="min-height: 100px;"></textarea>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button class="btn-primary" @click="batchConvert">批量转换</button>
        <button class="btn-outline" @click="batchInput = ''; batchResults = []; batchVisible = false">清空</button>
      </div>
      <table v-if="batchVisible && batchResults.length > 0" class="batch-table">
        <thead>
          <tr>
            <th>输入值</th>
            <th>二进制</th>
            <th>八进制</th>
            <th>十进制</th>
            <th>十六进制</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in batchResults" :key="i">
            <td>{{ r.input }}</td>
            <td>{{ r.bin }}</td>
            <td>{{ r.oct }}</td>
            <td>{{ r.dec }}</td>
            <td>{{ r.hex }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <HistorySection :records="history" @restore="(r: any) => { inputValue = r.input }" @clear="history = []" />
  </ToolContainer>
</template>

<style scoped>
.batch-table { width: 100%; border-collapse: collapse; font-size: 13px; font-family: 'Consolas', 'Monaco', monospace; }
.batch-table th { background: var(--bg-code); color: var(--text-muted); font-weight: 500; font-size: 12px; padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border-card); }
.batch-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
.batch-table tr:last-child td { border-bottom: none; }
.batch-table tbody tr:hover { background: var(--bg-code); }
</style>
