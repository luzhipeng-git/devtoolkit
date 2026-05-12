<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { useClipboard } from '@/composables/useClipboard'
import md5 from 'crypto-js/md5'

const { copyWithFeedback } = useClipboard()

const inputText = ref('')
const hashResult = ref('')
const uppercase = ref(false)

watch([inputText, uppercase], ([text, upper]) => {
  if (!text) {
    hashResult.value = ''
    return
  }
  const result = md5(text).toString()
  hashResult.value = upper ? result.toUpperCase() : result
})
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">MD5 Hash 计算器</h3>
    </div>
    <div class="tool-content">
      <div class="form-group">
        <label class="form-label">输入文本</label>
        <textarea
          v-model="inputText"
          class="form-textarea"
          placeholder="输入要计算 MD5 哈希的文本..."
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
        <label class="form-label">MD5 结果</label>
        <div class="result-row">
          <input :value="hashResult" class="form-input result-input" readonly placeholder="MD5 哈希值将显示在这里" />
          <CopyButton :text="hashResult" />
        </div>
      </div>
      <div class="info-text">
        <p>注意: MD5 已不推荐用于安全场景，仅适用于文件校验、去重等非安全用途。</p>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.checkbox-group { flex-direction: row; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
.info-text { padding: 8px 12px; background: var(--bg-code); border-radius: 6px; }
.info-text p { font-size: 12px; color: var(--text-muted); margin: 0; }
</style>
