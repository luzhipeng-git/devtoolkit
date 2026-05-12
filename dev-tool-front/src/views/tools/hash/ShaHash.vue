<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copyWithFeedback, feedbackVisible } = useClipboard()

const inputText = ref('')
const algorithm = ref<'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256')
const hashResult = ref('')
const uppercase = ref(false)

const algorithms = [
  { value: 'SHA-1' as const, label: 'SHA-1' },
  { value: 'SHA-256' as const, label: 'SHA-256' },
  { value: 'SHA-384' as const, label: 'SHA-384' },
  { value: 'SHA-512' as const, label: 'SHA-512' },
]

async function computeHash(text: string, algo: string): Promise<string> {
  if (!text) return ''
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest(algo, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

watch([inputText, algorithm, uppercase], async ([text, algo, upper]) => {
  const result = await computeHash(text, algo)
  hashResult.value = upper ? result.toUpperCase() : result
})

function handleCopy() {
  if (hashResult.value) {
    copyWithFeedback(hashResult.value)
  }
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">SHA Hash 计算器</h3>
    </div>
    <div class="tool-content">
      <div class="form-group">
        <label class="form-label">输入文本</label>
        <textarea
          v-model="inputText"
          class="form-textarea"
          placeholder="输入要计算哈希的文本..."
          rows="4"
        />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">算法</label>
          <select v-model="algorithm" class="form-select">
            <option v-for="algo in algorithms" :key="algo.value" :value="algo.value">
              {{ algo.label }}
            </option>
          </select>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input v-model="uppercase" type="checkbox" />
            <span>大写输出</span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">哈希结果</label>
        <div class="result-row">
          <input :value="hashResult" class="form-input result-input" readonly placeholder="哈希值将显示在这里" />
          <CopyButton :text="hashResult" />
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.checkbox-group { justify-content: flex-end; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
</style>
