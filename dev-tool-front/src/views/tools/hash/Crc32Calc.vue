<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copyWithFeedback } = useClipboard()

const inputText = ref('')
const crcResult = ref('')
const uppercase = ref(false)

// CRC32 lookup table
const crc32Table = (() => {
  const table: number[] = []
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320
      } else {
        crc = crc >>> 1
      }
    }
    table.push(crc >>> 0)
  }
  return table
})()

function computeCRC32(text: string): string {
  if (!text) return ''
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xFF]
  }
  crc = (crc ^ 0xFFFFFFFF) >>> 0
  return crc.toString(16).padStart(8, '0')
}

watch([inputText, uppercase], ([text, upper]) => {
  const result = computeCRC32(text)
  crcResult.value = upper ? result.toUpperCase() : result
})
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">CRC32 计算器</h3>
    </div>
    <div class="tool-content">
      <div class="form-group">
        <label class="form-label">输入文本</label>
        <textarea
          v-model="inputText"
          class="form-textarea"
          placeholder="输入要计算 CRC32 的文本..."
          rows="4"
        />
      </div>
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input v-model="uppercase" type="checkbox" />
          <span>大写输出</span>
        </label>
      </div>
      <div class="form-group">
        <label class="form-label">CRC32 结果</label>
        <div class="result-row">
          <input :value="crcResult" class="form-input result-input" readonly placeholder="CRC32 值将显示在这里" />
          <CopyButton :text="crcResult" />
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.checkbox-group { flex-direction: row; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
</style>
