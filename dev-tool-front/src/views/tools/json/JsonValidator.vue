<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const input = ref('')
const errorInfo = ref<{ message: string; line?: number } | null>(null)
const isValid = ref<boolean|null>(null)

function validate() {
  if (!input.value.trim()) { errorInfo.value = null; isValid.value = null; return }
  try {
    JSON.parse(input.value)
    isValid.value = true
    errorInfo.value = null
  } catch (e: any) {
    isValid.value = false
    const msg = e.message || 'JSON 解析失败'
    const posMatch = msg.match(/position\s+(\d+)/)
    let line: number | undefined
    if (posMatch) {
      const pos = parseInt(posMatch[1])
      line = input.value.substring(0, pos).split('\n').length
    }
    errorInfo.value = { message: msg, line }
  }
}
</script>

<template>
  <ToolContainer>
    <div class="editor-header"><span class="editor-title">输入 JSON</span><CopyButton :text="input"/></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="input" @input="validate" placeholder="粘贴 JSON 进行校验..."></textarea></div>
    <div v-if="isValid === true" class="valid-banner">JSON 格式正确</div>
    <div v-if="errorInfo" class="error-banner">
      <div>JSON 格式错误</div>
      <div class="error-detail">{{ errorInfo.message }}</div>
      <div v-if="errorInfo.line" class="error-line">错误位置：约第 {{ errorInfo.line }} 行</div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.valid-banner{margin-top:12px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;color:#16a34a;font-size:13px;font-weight:500}
.error-banner{margin-top:12px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#dc2626}
.error-detail{font-size:12px;margin-top:4px;font-family:'Consolas',monospace}
.error-line{font-size:12px;margin-top:2px;color:#b91c1c}
</style>
