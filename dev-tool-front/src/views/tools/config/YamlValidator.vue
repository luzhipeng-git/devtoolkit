<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import yaml from 'js-yaml'

const input = ref('')
const validationResult = ref<{ valid: boolean; message: string; line?: number } | null>(null)

function validate() {
  if (!input.value.trim()) {
    validationResult.value = { valid: false, message: '请输入 YAML 内容' }
    return
  }
  try {
    yaml.load(input.value, { schema: yaml.DEFAULT_SCHEMA, onWarning: (w) => {} })
    validationResult.value = { valid: true, message: 'YAML 格式正确' }
  } catch (e: any) {
    const lineMatch = e.message?.match(/at line (\d+)/)
    validationResult.value = {
      valid: false,
      message: e.message || 'YAML 格式错误',
      line: lineMatch ? parseInt(lineMatch[1]) : undefined,
    }
  }
}

function loadSample() {
  input.value = `server:
  port: 8080
  host: localhost

database:
  url: jdbc:mysql://localhost:3306/mydb
  username: admin
  password: secret
  pool:
    max: 10
    min: 2

logging:
  level: info
  file: /var/log/app.log`
  validationResult.value = null
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header"><h3 class="tool-title">YAML 校验</h3></div>
    <div class="tool-content">
      <div class="form-group">
        <label class="form-label">输入 YAML</label>
        <textarea v-model="input" class="form-textarea" placeholder="粘贴 YAML 内容..." rows="14" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" @click="validate">校验</button>
        <button class="btn btn-secondary" @click="loadSample">加载示例</button>
      </div>
      <div v-if="validationResult" class="validation-result" :class="{ success: validationResult.valid, error: !validationResult.valid }">
        <div class="result-icon">{{ validationResult.valid ? '✓' : '✗' }}</div>
        <div class="result-text">
          <div class="result-title">{{ validationResult.valid ? 'YAML 格式正确' : 'YAML 格式错误' }}</div>
          <div v-if="!validationResult.valid" class="result-message">{{ validationResult.message }}</div>
          <div v-if="validationResult.line" class="result-line">错误位置：第 {{ validationResult.line }} 行</div>
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
.result-title { font-size: 14px; font-weight: 600; }
.success .result-title { color: #16a34a; }
.error .result-title { color: #dc2626; }
.result-message { font-size: 13px; color: #dc2626; font-family: monospace; margin-top: 4px; word-break: break-all; }
.result-line { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
</style>
