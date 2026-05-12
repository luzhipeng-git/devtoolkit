<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'

const leftConfig = ref('')
const rightConfig = ref('')

interface DiffLine { type: 'same' | 'add' | 'remove'; content: string; leftNum?: number; rightNum?: number }

const diffResult = computed<DiffLine[]>(() => {
  if (!leftConfig.value && !rightConfig.value) return []
  const leftLines = leftConfig.value.split('\n')
  const rightLines = rightConfig.value.split('\n')

  // Simple LCS-based diff
  const m = leftLines.length, n = rightLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = leftLines[i - 1] === rightLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      result.unshift({ type: 'same', content: leftLines[i - 1], leftNum: i, rightNum: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', content: rightLines[j - 1], rightNum: j })
      j--
    } else if (i > 0) {
      result.unshift({ type: 'remove', content: leftLines[i - 1], leftNum: i })
      i--
    }
  }
  return result
})

function loadSample() {
  leftConfig.value = `server {
    listen 80;
    server_name example.com;
    location / {
        proxy_pass http://backend;
    }
}`
  rightConfig.value = `server {
    listen 443 ssl;
    server_name example.com;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    location / {
        proxy_pass http://backend;
        proxy_set_header X-Forwarded-Proto https;
    }
}`
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header"><h3 class="tool-title">Nginx 配置 Diff</h3></div>
    <div class="diff-inputs">
      <div class="diff-panel">
        <label class="form-label">原始配置</label>
        <textarea v-model="leftConfig" class="form-textarea" placeholder="粘贴原始 Nginx 配置..." rows="12" />
      </div>
      <div class="diff-panel">
        <label class="form-label">修改后配置</label>
        <textarea v-model="rightConfig" class="form-textarea" placeholder="粘贴修改后的 Nginx 配置..." rows="12" />
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" @click="loadSample">加载示例</button>
    </div>
    <div v-if="diffResult.length" class="diff-result">
      <div class="diff-stats">
        <span class="stat-add">+{{ diffResult.filter(d => d.type === 'add').length }} 新增</span>
        <span class="stat-remove">-{{ diffResult.filter(d => d.type === 'remove').length }} 删除</span>
        <span class="stat-same">{{ diffResult.filter(d => d.type === 'same').length }} 相同</span>
      </div>
      <div class="diff-content">
        <div v-for="(line, idx) in diffResult" :key="idx" class="diff-line" :class="'diff-' + line.type">
          <span class="line-num">{{ line.leftNum ?? '' }}</span>
          <span class="line-num">{{ line.rightNum ?? '' }}</span>
          <span class="line-marker">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ' }}</span>
          <span class="line-content">{{ line.content }}</span>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.diff-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.diff-panel { display: flex; flex-direction: column; gap: 4px; }

.btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }

.diff-stats { display: flex; gap: 16px; margin-bottom: 8px; font-size: 13px; font-weight: 500; }
.stat-add { color: #16a34a; }
.stat-remove { color: #dc2626; }
.stat-same { color: var(--text-secondary); }
.diff-content {
  border: 1px solid var(--border-card); border-radius: 6px;
  background: var(--bg-input); overflow-x: auto; font-family: monospace; font-size: 13px;
}
.diff-line { display: flex; min-height: 22px; }
.line-num { width: 40px; text-align: right; padding: 0 6px; color: var(--text-secondary); font-size: 12px; user-select: none; }
.line-marker { width: 20px; text-align: center; user-select: none; font-weight: 700; }
.line-content { flex: 1; padding-right: 8px; white-space: pre; }
.diff-add { background: rgba(22,163,74,0.1); }
.diff-add .line-marker { color: #16a34a; }
.diff-remove { background: rgba(220,38,38,0.1); }
.diff-remove .line-marker { color: #dc2626; }
.diff-same .line-marker { color: var(--text-secondary); }
</style>
