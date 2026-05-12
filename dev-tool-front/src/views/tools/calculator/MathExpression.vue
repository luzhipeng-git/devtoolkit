<script setup lang="ts">
import { ref } from 'vue'
import { evaluate } from 'mathjs'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const expression = ref('')
const result = ref('')
const error = ref('')
const history = ref<{ expr: string; result: string }[]>([])

function calculate() {
  error.value = ''
  if (!expression.value.trim()) { result.value = ''; return }
  try {
    const evalResult = evaluate(expression.value)
    result.value = String(evalResult)
    history.value.unshift({ expr: expression.value, result: result.value })
    if (history.value.length > 20) history.value.splice(20)
  } catch (e: any) {
    error.value = e.message || '计算错误'
    result.value = ''
  }
}
</script>

<template>
  <ToolContainer>
    <div class="editor-header"><span class="editor-title">数学表达式</span></div>
    <div class="editor-body" style="display: flex; gap: 8px; padding: 8px;">
      <input class="calc-input" style="flex:1;" v-model="expression" placeholder="输入表达式，如 2+3*4, sin(PI/4)" @keydown.enter="calculate" />
      <button class="btn-outline" style="padding: 6px 16px; font-size: 13px;" @click="calculate">计算</button>
    </div>
    <div v-if="error" style="color: #dc2626; font-size: 12px; margin-top: 8px;">{{ error }}</div>
    <div v-if="result" class="result-card" style="margin-top: 12px;">
      <div class="result-label">计算结果</div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="result-value">{{ result }}</span>
        <CopyButton :text="result" />
      </div>
    </div>
    <div v-if="history.length > 0" style="margin-top: 16px;">
      <div class="editor-header"><span class="editor-title">历史记录</span></div>
      <div v-for="(h, i) in history" :key="i" class="calc-history-item" @click="expression = h.expr; calculate()">
        <span class="hist-expr">{{ h.expr }}</span>
        <span class="hist-eq">=</span>
        <span class="hist-result">{{ h.result }}</span>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.calc-history-item { display: flex; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-family: 'Consolas', monospace; font-size: 12px; }
.calc-history-item:hover { background: var(--bg-hover); }
.hist-expr { color: var(--text-secondary); }
.hist-eq { color: var(--text-placeholder); }
.hist-result { color: var(--accent-blue); }
</style>
