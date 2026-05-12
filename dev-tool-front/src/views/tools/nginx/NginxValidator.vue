<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'

const inputConfig = ref('')
const validationResult = ref<{ valid: boolean; errors: string[] } | null>(null)

function validateNginx() {
  if (!inputConfig.value.trim()) {
    validationResult.value = { valid: false, errors: ['请输入 Nginx 配置'] }
    return
  }

  const errors: string[] = []
  const lines = inputConfig.value.split('\n')
  const braceStack: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    for (const ch of trimmed) {
      if (ch === '{') {
        braceStack.push(`第 ${i + 1} 行`)
      } else if (ch === '}') {
        if (braceStack.length === 0) {
          errors.push(`第 ${i + 1} 行：多余的 '}'`)
        } else {
          braceStack.pop()
        }
      }
    }

    if (trimmed.endsWith(';') === false && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('#') && trimmed.length > 0) {
      if (!trimmed.includes('{') && !trimmed.includes('}')) {
        // Could be a directive missing semicolon, but not all lines need one
      }
    }
  }

  if (braceStack.length > 0) {
    errors.push(`缺少 ${braceStack.length} 个闭合 '}'，未闭合的块始于：${braceStack.join(', ')}`)
  }

  validationResult.value = { valid: errors.length === 0, errors }
}

function loadSample() {
  inputConfig.value = `server {
    listen 80;
    server_name example.com;
    location / {
        proxy_pass http://backend;
    }
}`
  validationResult.value = null
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header"><h3 class="tool-title">Nginx 配置校验</h3></div>
    <div class="tool-content">
      <div class="form-group">
        <label class="form-label">输入 Nginx 配置</label>
        <textarea v-model="inputConfig" class="form-textarea" placeholder="粘贴 Nginx 配置..." rows="12" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" @click="validateNginx">校验</button>
        <button class="btn btn-secondary" @click="loadSample">加载示例</button>
      </div>
      <div v-if="validationResult" class="validation-result" :class="{ success: validationResult.valid, error: !validationResult.valid }">
        <div class="result-icon">{{ validationResult.valid ? '✓' : '✗' }}</div>
        <div class="result-text">
          <div class="result-title">{{ validationResult.valid ? '配置校验通过' : '配置存在错误' }}</div>
          <div v-if="validationResult.errors.length" class="error-list">
            <div v-for="(err, idx) in validationResult.errors" :key="idx" class="error-item">{{ err }}</div>
          </div>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }

.validation-result {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 16px; border-radius: 8px; margin-top: 4px;
}
.validation-result.success { background: #f0fdf4; border: 1px solid #bbf7d0; }
.validation-result.error { background: #fef2f2; border: 1px solid #fecaca; }
.result-icon { font-size: 20px; font-weight: 700; flex-shrink: 0; }
.success .result-icon { color: #16a34a; }
.error .result-icon { color: #dc2626; }
.result-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.success .result-title { color: #16a34a; }
.error .result-title { color: #dc2626; }
.error-list { margin-top: 4px; }
.error-item { font-size: 13px; color: #dc2626; padding: 2px 0; font-family: monospace; }
</style>
