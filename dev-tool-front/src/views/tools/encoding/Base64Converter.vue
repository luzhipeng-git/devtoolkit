<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToolBase } from '@/composables/useToolBase'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import OptionsPanel from '@/components/common/OptionsPanel.vue'
import SwapButton from '@/components/common/SwapButton.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import HistorySection from '@/components/common/HistorySection.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

const { input, output, mode, error, isSwapping, swap, clear, history, clearHistory, restoreFromHistory } = useToolBase({
  toolId: 'encoding-base64',
  debounceMs: 300,
})

const charset = ref('utf-8')
const lineWrap = ref('none')
const { copy } = useClipboard()

const tabs = [
  { key: 'encode', label: '编码' },
  { key: 'decode', label: '解码' },
]

const optionItems = [
  { key: 'charset', label: '字符集', type: 'select' as const, modelValue: charset.value, options: [{ value: 'utf-8', label: 'UTF-8' }, { value: 'ascii', label: 'ASCII' }] },
  { key: 'lineWrap', label: '换行', type: 'select' as const, modelValue: lineWrap.value, options: [{ value: 'none', label: '无' }, { value: '64', label: '64字符' }, { value: '76', label: '76字符' }] },
]

function updateOption(key: string, value: any) {
  if (key === 'charset') charset.value = value
  else if (key === 'lineWrap') lineWrap.value = value
}

function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  let encoded = btoa(binary)
  if (lineWrap.value !== 'none') {
    const wrapAt = parseInt(lineWrap.value)
    const lines: string[] = []
    for (let i = 0; i < encoded.length; i += wrapAt) {
      lines.push(encoded.substring(i, i + wrapAt))
    }
    encoded = lines.join('\n')
  }
  return encoded
}

function base64ToText(base64: string): string {
  const cleaned = base64.replace(/\s/g, '')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

function process() {
  error.value = null
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'encode') {
      output.value = textToBase64(input.value)
    } else {
      output.value = base64ToText(input.value)
    }
  } catch (e: any) {
    error.value = e.message || '转换失败'
  }
}

watch([input, charset, lineWrap], process)

const inputLabel = ref('输入（字符串）')
const outputLabel = ref('输出（Base64）')

watch(mode, (m) => {
  if (isSwapping.value) {
    if (m === 'encode') {
      inputLabel.value = '输入（字符串）'
      outputLabel.value = '输出（Base64）'
    } else {
      inputLabel.value = '输入（Base64）'
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
    outputLabel.value = '输出（Base64）'
  } else {
    inputLabel.value = '输入（Base64）'
    outputLabel.value = '输出（字符串）'
  }
  process()
})
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <OptionsPanel :options="optionItems" @update:option="updateOption" />
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
        placeholder="在此输入文本..."
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


