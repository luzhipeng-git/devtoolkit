<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const dividend = ref('')
const divisor = ref('')
const error = ref('')

const intQuotient = computed(() => {
  const a = parseFloat(dividend.value)
  const b = parseFloat(divisor.value)
  if (isNaN(a) || isNaN(b) || b === 0) return ''
  return String(Math.floor(a / b))
})

const floorQuotient = computed(() => {
  const a = parseFloat(dividend.value)
  const b = parseFloat(divisor.value)
  if (isNaN(a) || isNaN(b) || b === 0) return ''
  return String(Math.floor(a / b))
})

const truncQuotient = computed(() => {
  const a = parseFloat(dividend.value)
  const b = parseFloat(divisor.value)
  if (isNaN(a) || isNaN(b) || b === 0) return ''
  return String(Math.trunc(a / b))
})

const exactResult = computed(() => {
  const a = parseFloat(dividend.value)
  const b = parseFloat(divisor.value)
  if (isNaN(a) || isNaN(b) || b === 0) return ''
  return String(a / b)
})

watch([dividend, divisor], () => {
  const a = parseFloat(dividend.value)
  const b = parseFloat(divisor.value)
  if (dividend.value.trim() === '' || divisor.value.trim() === '') {
    error.value = ''
    return
  }
  if (isNaN(a) || isNaN(b)) {
    error.value = '请输入有效的数字'
  } else if (b === 0) {
    error.value = '除数不能为 0'
  } else {
    error.value = ''
  }
})
</script>

<template>
  <ToolContainer>
    <div class="editor-header"><span class="editor-title">整数除法 (Integer Division)</span></div>
    <div class="input-row">
      <div class="input-group">
        <label class="input-label">被除数 (Dividend)</label>
        <input class="calc-input" v-model="dividend" placeholder="如 17" />
      </div>
      <span class="operator">//</span>
      <div class="input-group">
        <label class="input-label">除数 (Divisor)</label>
        <input class="calc-input" v-model="divisor" placeholder="如 5" />
      </div>
    </div>

    <div v-if="error" style="color: #dc2626; font-size: 12px; margin-top: 8px;">{{ error }}</div>

    <div style="margin-top: 16px;">
      <div class="result-card">
        <div class="result-label">整数商 (Truncate 向零取整)</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="result-value">{{ truncQuotient || '-' }}</span>
          <CopyButton v-if="truncQuotient" :text="truncQuotient" />
        </div>
      </div>
      <div class="result-card">
        <div class="result-label">整数商 (Floor 向下取整)</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="result-value">{{ floorQuotient || '-' }}</span>
          <CopyButton v-if="floorQuotient" :text="floorQuotient" />
        </div>
      </div>
      <div class="result-card">
        <div class="result-label">精确结果 (Exact)</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="result-value">{{ exactResult || '-' }}</span>
          <CopyButton v-if="exactResult" :text="exactResult" />
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.input-row { display: flex; gap: 12px; align-items: flex-end; }
.input-group { flex: 1; }
.input-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }

.operator { font-family: 'Consolas', monospace; font-size: 14px; color: var(--text-muted); font-weight: 600; padding-bottom: 10px; }
</style>
