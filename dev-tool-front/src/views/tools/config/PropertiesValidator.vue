<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'

const input = ref('')
const validationResult = ref<{ valid: boolean; errors: string[] } | null>(null)

function validate() {
  if (!input.value.trim()) {
    validationResult.value = { valid: false, errors: ['请输入 Properties 内容'] }
    return
  }

  const errors: string[] = []
  const lines = input.value.split('\n')
  const keys = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (!trimmed.includes('=')) {
      errors.push(`第 ${i + 1} 行：缺少等号分隔符 '='`)
      continue
    }

    const eqIdx = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIdx).trim()
    if (!key) {
      errors.push(`第 ${i + 1} 行：键名不能为空`)
      continue
    }

    if (/[\s]/.test(key)) {
      errors.push(`第 ${i + 1} 行：键名 "${key}" 包含空格`)
    }

    if (keys.has(key)) {
      errors.push(`第 ${i + 1} 行：重复的键 "${key}"`)
    }
    keys.add(key)
  }

  validationResult.value = { valid: errors.length === 0, errors }
}

function loadSample() {
  input.value = `# Server Configuration
server.port=8080
server.host=localhost
server.name=My Application

# Database
db.url=jdbc:mysql://localhost:3306/mydb
db.username=admin
db.password=secret
db.pool.max=10
db.pool.min=2

# Logging
logging.level=info
logging.file=/var/log/app.log`
  validationResult.value = null
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header"><h3 class="tool-title">Properties 校验</h3></div>
    <div class="tool-content">
      <div class="form-group">
        <label class="form-label">输入 Properties</label>
        <textarea v-model="input" class="form-textarea" placeholder="粘贴 Properties 内容..." rows="14" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" @click="validate">校验</button>
        <button class="btn btn-secondary" @click="loadSample">加载示例</button>
      </div>
      <div v-if="validationResult" class="validation-result" :class="{ success: validationResult.valid, error: !validationResult.valid }">
        <div class="result-icon">{{ validationResult.valid ? '✓' : '✗' }}</div>
        <div class="result-text">
          <div class="result-title">{{ validationResult.valid ? 'Properties 格式正确' : 'Properties 存在错误' }}</div>
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
.result-title { font-size: 14px; font-weight: 600; }
.success .result-title { color: #16a34a; }
.error .result-title { color: #dc2626; }
.error-list { margin-top: 4px; }
.error-item { font-size: 13px; color: #dc2626; padding: 2px 0; font-family: monospace; }
</style>
