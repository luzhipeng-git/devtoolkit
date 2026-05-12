<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copyWithFeedback } = useClipboard()

const inputText = ref('')
const secretKey = ref('')
const algorithm = ref<'SHA-256' | 'SHA-1' | 'SHA-384' | 'SHA-512'>('SHA-256')
const hmacResult = ref('')
const uppercase = ref(false)

const algorithms = [
  { value: 'SHA-256' as const, label: 'HMAC-SHA256' },
  { value: 'SHA-1' as const, label: 'HMAC-SHA1' },
  { value: 'SHA-384' as const, label: 'HMAC-SHA384' },
  { value: 'SHA-512' as const, label: 'HMAC-SHA512' },
]

async function computeHmac(message: string, key: string, algo: string): Promise<string> {
  if (!message || !key) return ''
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const messageData = encoder.encode(message)
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: algo }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

watch([inputText, secretKey, algorithm, uppercase], async ([text, key, algo, upper]) => {
  const result = await computeHmac(text, key, algo)
  hmacResult.value = upper ? result.toUpperCase() : result
})
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">HMAC 计算器</h3>
    </div>
    <div class="tool-content">
      <div class="form-group">
        <label class="form-label">输入文本</label>
        <textarea
          v-model="inputText"
          class="form-textarea"
          placeholder="输入要计算 HMAC 的文本..."
          rows="4"
        />
      </div>
      <div class="form-group">
        <label class="form-label">密钥 (Secret Key)</label>
        <input v-model="secretKey" class="form-input" type="password" placeholder="输入密钥..." />
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
        <label class="form-label">HMAC 结果</label>
        <div class="result-row">
          <input :value="hmacResult" class="form-input result-input" readonly placeholder="HMAC 值将显示在这里" />
          <CopyButton :text="hmacResult" />
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.checkbox-group { justify-content: flex-end; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
</style>
