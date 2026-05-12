<script setup lang="ts">
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const baseInput = ref('')
const operation = ref<'add' | 'subtract'>('add')
const years = ref(0)
const months = ref(0)
const days = ref(0)
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
const formatPattern = ref('YYYY-MM-DD HH:mm:ss')
const error = ref('')

function useCurrentTime() {
  baseInput.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

const result = computed(() => {
  error.value = ''
  const raw = baseInput.value.trim()
  if (!raw) return null

  let d = dayjs(raw)
  if (!d.isValid()) {
    error.value = '无效的日期/时间戳'
    return null
  }

  const op = operation.value === 'add' ? 'add' : 'subtract'
  d = d[op](years.value, 'year')
  d = d[op](months.value, 'month')
  d = d[op](days.value, 'day')
  d = d[op](hours.value, 'hour')
  d = d[op](minutes.value, 'minute')
  d = d[op](seconds.value, 'second')

  return d
})

const formattedResult = computed(() => {
  if (!result.value) return ''
  return result.value.format(formatPattern.value)
})

const resultTs = computed(() => {
  if (!result.value) return ''
  return String(Math.floor(result.value.valueOf() / 1000))
})

const resultIso = computed(() => {
  if (!result.value) return ''
  return result.value.toISOString()
})

const diffDisplay = computed(() => {
  const parts: string[] = []
  if (years.value) parts.push(`${years.value}年`)
  if (months.value) parts.push(`${months.value}月`)
  if (days.value) parts.push(`${days.value}天`)
  if (hours.value) parts.push(`${hours.value}时`)
  if (minutes.value) parts.push(`${minutes.value}分`)
  if (seconds.value) parts.push(`${seconds.value}秒`)
  const op = operation.value === 'add' ? '+' : '-'
  return parts.length > 0 ? `${op} ${parts.join(' ')}` : '未设置偏移量'
})
</script>

<template>
  <ToolContainer>
    <div class="editor-header">
      <span class="editor-title">基准时间</span>
      <div class="editor-actions">
        <button class="btn-outline" @click="useCurrentTime">当前时间</button>
      </div>
    </div>
    <div class="editor-body">
      <input class="calc-input" v-model="baseInput" placeholder="输入日期或时间戳，如 2024-01-01 12:00:00" />
    </div>

    <div class="options-panel" style="margin-top: 16px;">
      <div class="option-group">
        <span class="option-label">操作</span>
        <select class="option-select" v-model="operation">
          <option value="add">加 (+)</option>
          <option value="subtract">减 (-)</option>
        </select>
      </div>
    </div>

    <div style="margin-top: 12px;">
      <div class="editor-header"><span class="editor-title">偏移量设置</span></div>
      <div class="offset-grid">
        <div class="offset-item">
          <label class="offset-label">年</label>
          <input class="offset-input" type="number" v-model.number="years" min="0" />
        </div>
        <div class="offset-item">
          <label class="offset-label">月</label>
          <input class="offset-input" type="number" v-model.number="months" min="0" />
        </div>
        <div class="offset-item">
          <label class="offset-label">天</label>
          <input class="offset-input" type="number" v-model.number="days" min="0" />
        </div>
        <div class="offset-item">
          <label class="offset-label">时</label>
          <input class="offset-input" type="number" v-model.number="hours" min="0" />
        </div>
        <div class="offset-item">
          <label class="offset-label">分</label>
          <input class="offset-input" type="number" v-model.number="minutes" min="0" />
        </div>
        <div class="offset-item">
          <label class="offset-label">秒</label>
          <input class="offset-input" type="number" v-model.number="seconds" min="0" />
        </div>
      </div>
    </div>

    <div class="format-row">
      <span class="format-label">格式化:</span>
      <input class="format-input" v-model="formatPattern" />
    </div>

    <div v-if="error" style="color: #dc2626; font-size: 12px; margin-top: 8px;">{{ error }}</div>

    <div v-if="formattedResult" style="margin-top: 16px;">
      <div class="diff-display">{{ diffDisplay }}</div>
      <div class="result-card">
        <div class="result-label">结果日期</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="result-value">{{ formattedResult }}</span>
          <CopyButton :text="formattedResult" />
        </div>
      </div>
      <div class="result-card">
        <div class="result-label">时间戳 (秒)</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="result-value">{{ resultTs }}</span>
          <CopyButton :text="resultTs" />
        </div>
      </div>
      <div class="result-card">
        <div class="result-label">ISO 8601</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="result-value" style="font-size: 13px;">{{ resultIso }}</span>
          <CopyButton :text="resultIso" />
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.offset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.offset-item { display: flex; flex-direction: column; gap: 4px; }
.offset-label { font-size: 11px; color: var(--text-muted); }
.offset-input { width: 100%; padding: 6px 8px; border: 1px solid var(--border-input); border-radius: 4px; font-family: 'Consolas', monospace; font-size: 13px; color: var(--text-primary); background: var(--bg-code); outline: none; text-align: center; }
.offset-input:focus { border-color: var(--primary); }
.format-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.format-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.format-input { flex: 1; padding: 6px 10px; border: 1px solid var(--border-input); border-radius: 4px; font-family: 'Consolas', monospace; font-size: 12px; color: var(--text-primary); background: var(--bg-code); outline: none; }
.format-input:focus { border-color: var(--primary); }
.diff-display { padding: 8px 12px; background: var(--bg-code); border-radius: 6px; font-size: 13px; color: var(--accent-blue); font-family: 'Consolas', monospace; margin-bottom: 12px; text-align: center; }
</style>
