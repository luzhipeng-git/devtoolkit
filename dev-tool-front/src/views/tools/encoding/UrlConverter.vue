<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToolBase } from '@/composables/useToolBase'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import SwapButton from '@/components/common/SwapButton.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import HistorySection from '@/components/common/HistorySection.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

const { input, output, mode, error, isSwapping, swap, clear, history, clearHistory, restoreFromHistory } = useToolBase({
  toolId: 'encoding-url',
  debounceMs: 300,
})

const encodeMode = ref('component')
const { copy } = useClipboard()

const tabs = [
  { key: 'encode', label: '编码' },
  { key: 'decode', label: '解码' },
]

function urlEncode(text: string): string {
  if (encodeMode.value === 'component') {
    return encodeURIComponent(text)
  }
  return encodeURI(text)
}

function urlDecode(text: string): string {
  if (encodeMode.value === 'component') {
    return decodeURIComponent(text)
  }
  return decodeURI(text)
}

function process() {
  error.value = null
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'encode') {
      output.value = urlEncode(input.value)
    } else {
      output.value = urlDecode(input.value)
    }
  } catch (e: any) {
    error.value = e.message || '转换失败'
  }
}

watch([input, encodeMode], process)

const inputLabel = ref('输入（字符串）')
const outputLabel = ref('输出（URL编码）')

watch(mode, (m) => {
  if (isSwapping.value) {
    if (m === 'encode') {
      inputLabel.value = '输入（字符串）'
      outputLabel.value = '输出（URL编码）'
    } else {
      inputLabel.value = '输入（URL编码）'
      outputLabel.value = '输出（字符串）'
    }
    process()
    return
  }
  const temp = input.value
  input.value = output.value
  output.value = temp
  if (m === 'encode') {
    inputLabel.value = '输入（字符串）'
    outputLabel.value = '输出（URL编码）'
  } else {
    inputLabel.value = '输入（URL编码）'
    outputLabel.value = '输出（字符串）'
  }
  process()
})
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <div class="radio-group">
      <label class="radio-item">
        <input type="radio" name="encodeMode" value="component" v-model="encodeMode" />
        <span>组件编码 (encodeURIComponent)</span>
      </label>
      <label class="radio-item">
        <input type="radio" name="encodeMode" value="uri" v-model="encodeMode" />
        <span>URI 编码 (encodeURI)</span>
      </label>
    </div>
    <ErrorBanner v-if="error" :message="error" @dismiss="error = null" />

    <div class="editor-header">
      <span class="editor-title">{{ inputLabel }}</span>
      <div class="editor-actions">
        <button class="btn-outline" @click="clear">清空</button>
      </div>
    </div>
    <div class="editor-body">
      <textarea
        class="editor-textarea"
        v-model="input"
        placeholder="在此输入文本或URL..."
      ></textarea>
    </div>

    <SwapButton @swap="swap" />

    <div class="editor-header">
      <span class="editor-title">{{ outputLabel }}</span>
      <div class="editor-actions">
        <CopyButton :text="output" />
      </div>
    </div>
    <div class="editor-body output">
      <div class="editor-output">{{ output }}</div>
    </div>

    <HistorySection
      :records="history"
      @restore="restoreFromHistory"
      @clear="clearHistory"
    />
  </ToolContainer>
</template>

<style scoped>
.radio-group { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.radio-item { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: var(--text-secondary); }
.radio-item input[type="radio"] { accent-color: var(--primary); cursor: pointer; }
</style>
