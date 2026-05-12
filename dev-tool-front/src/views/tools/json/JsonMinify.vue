<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

const input = ref('')
const output = ref('')
const error = ref<string | null>(null)
const { copyWithFeedback } = useClipboard()

const inputSize = computed(() => new Blob([input.value]).size)
const outputSize = computed(() => new Blob([output.value]).size)
const ratio = computed(() => {
  if (inputSize.value === 0) return 0
  return ((1 - outputSize.value / inputSize.value) * 100).toFixed(1)
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function process() {
  error.value = null
  if (!input.value.trim()) { output.value = ''; return }
  try {
    const parsed = JSON.parse(input.value)
    output.value = JSON.stringify(parsed)
  } catch (e: any) {
    error.value = e.message || 'JSON解析失败'
  }
}

watch(input, process)
</script>

<template>
  <ToolContainer>
    <div class="editor-header">
      <span class="editor-title">输入（JSON）</span>
      <div class="editor-actions">
        <button class="btn-outline" @click="input = ''; output = ''">清空</button>
      </div>
    </div>
    <div class="editor-body">
      <textarea class="editor-textarea" v-model="input" placeholder='粘贴 JSON，例如: {"name": "test"}'></textarea>
    </div>

    <div style="height: 12px"></div>

    <ErrorBanner v-if="error" :message="error" @dismiss="error = null" />

    <div v-if="inputSize > 0 && !error" class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">原始大小</span>
        <span class="stat-value">{{ formatBytes(inputSize) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">压缩后</span>
        <span class="stat-value">{{ formatBytes(outputSize) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">压缩率</span>
        <span class="stat-value highlight">{{ ratio }}%</span>
      </div>
    </div>

    <div class="editor-header">
      <span class="editor-title">输出（压缩）</span>
      <div class="editor-actions">
        <CopyButton :text="output" />
      </div>
    </div>
    <div class="editor-body output">
      <div class="editor-output">{{ output }}</div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.stats-bar {
  display: flex;
  gap: 16px;
  padding: 10px 14px;
  background: var(--bg-code);
  border: 1px solid var(--border-input);
  border-radius: 6px;
  margin-bottom: 12px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-label {
  font-size: 11px;
  color: var(--text-muted);
}
.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
.stat-value.highlight {
  color: var(--accent-green, #52c41a);
}
</style>
