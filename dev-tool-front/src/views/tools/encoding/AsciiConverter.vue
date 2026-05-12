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
  toolId: 'encoding-ascii',
  debounceMs: 300,
})

const format = ref('decimal')
const separator = ref('space')
const { copy } = useClipboard()

const tabs = [
  { key: 'encode', label: '编码' },
  { key: 'decode', label: '解码' },
]

const optionItems = [
  { key: 'format', label: '格式', type: 'select' as const, modelValue: format.value, options: [{ value: 'decimal', label: '十进制' }, { value: 'hex', label: '十六进制' }, { value: 'octal', label: '八进制' }, { value: 'binary', label: '二进制' }] },
  { key: 'separator', label: '分隔符', type: 'select' as const, modelValue: separator.value, options: [{ value: 'space', label: '空格' }, { value: 'comma', label: '逗号' }, { value: 'none', label: '无' }] },
]

function updateOption(key: string, value: any) {
  if (key === 'format') format.value = value
  else if (key === 'separator') separator.value = value
}

function charToAsciiCode(charCode: number): string {
  switch (format.value) {
    case 'hex': return charCode.toString(16).toUpperCase().padStart(2, '0')
    case 'octal': return charCode.toString(8).padStart(3, '0')
    case 'binary': return charCode.toString(2).padStart(8, '0')
    default: return charCode.toString(10)
  }
}

function textToAscii(text: string): string {
  const codes: string[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code > 127) {
      throw new Error(`非ASCII字符: "${text[i]}" (位置 ${i})，ASCII仅支持0-127`)
    }
    codes.push(charToAsciiCode(code))
  }
  const sep = separator.value === 'space' ? ' ' : separator.value === 'comma' ? ',' : ''
  return codes.join(sep)
}

function asciiToText(ascii: string): string {
  const sep = separator.value === 'space' ? ' ' : separator.value === 'comma' ? ',' : ' '
  const parts = ascii.split(sep).filter(p => p.trim().length > 0)
  const chars: string[] = []
  for (const part of parts) {
    const trimmed = part.trim()
    let code: number
    switch (format.value) {
      case 'hex': code = parseInt(trimmed, 16); break
      case 'octal': code = parseInt(trimmed, 8); break
      case 'binary': code = parseInt(trimmed, 2); break
      default: code = parseInt(trimmed, 10)
    }
    if (isNaN(code) || code < 0 || code > 127) {
      throw new Error(`无效的ASCII码: "${trimmed}"`)
    }
    chars.push(String.fromCharCode(code))
  }
  return chars.join('')
}

function process() {
  error.value = null
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'encode') {
      output.value = textToAscii(input.value)
    } else {
      output.value = asciiToText(input.value)
    }
  } catch (e: any) {
    error.value = e.message || '转换失败'
  }
}

watch([input, format, separator], process)

const inputLabel = ref('输入（字符串）')
const outputLabel = ref('输出（ASCII码）')

watch(mode, (m) => {
  if (isSwapping.value) {
    if (m === 'encode') {
      inputLabel.value = '输入（字符串）'
      outputLabel.value = '输出（ASCII码）'
    } else {
      inputLabel.value = '输入（ASCII码）'
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
    outputLabel.value = '输出（ASCII码）'
  } else {
    inputLabel.value = '输入（ASCII码）'
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


