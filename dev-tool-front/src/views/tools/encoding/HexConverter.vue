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
  toolId: 'encoding-hex',
  debounceMs: 300,
})

const separator = ref('space')
const prefix = ref('')
const caseStyle = ref('upper')
const { copy } = useClipboard()

const tabs = [
  { key: 'encode', label: '编码' },
  { key: 'decode', label: '解码' },
  { key: 'case', label: '大小写转换' },
]

const caseTarget = ref('upper')

const optionItems = [
  { key: 'separator', label: '分隔符', type: 'select' as const, modelValue: separator.value, options: [{ value: 'space', label: '空格' }, { value: 'comma', label: '逗号' }, { value: 'none', label: '无' }] },
  { key: 'prefix', label: '前缀', type: 'select' as const, modelValue: prefix.value, options: [{ value: '', label: '无' }, { value: '0x', label: '0x' }, { value: '\\x', label: '\\x' }] },
  { key: 'caseStyle', label: '大小写', type: 'select' as const, modelValue: caseStyle.value, options: [{ value: 'upper', label: '大写' }, { value: 'lower', label: '小写' }] },
]

function updateOption(key: string, value: any) {
  if (key === 'separator') separator.value = value
  else if (key === 'prefix') prefix.value = value
  else if (key === 'caseStyle') caseStyle.value = value
}

const caseOptionItems = [
  { key: 'caseTarget', label: '目标格式', type: 'select' as const, modelValue: caseTarget.value, options: [{ value: 'upper', label: '大写 (0x4F)' }, { value: 'lower', label: '小写 (0x4f)' }] },
]

function updateCaseOption(key: string, value: any) {
  if (key === 'caseTarget') caseTarget.value = value
}

function textToHex(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let hexArr = Array.from(bytes).map(b => {
    const h = b.toString(16).padStart(2, '0')
    return caseStyle.value === 'upper' ? h.toUpperCase() : h
  })
  const sep = separator.value === 'space' ? ' ' : separator.value === 'comma' ? ',' : ''
  return hexArr.map(h => prefix.value + h).join(sep)
}

function hexToText(hex: string): string {
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length % 2 !== 0) throw new Error('Hex长度必须为偶数')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

function process() {
  error.value = null
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'encode') {
      output.value = textToHex(input.value)
    } else if (mode.value === 'decode') {
      output.value = hexToText(input.value)
    } else if (mode.value === 'case') {
      const cleaned = input.value.replace(/[^0-9a-fA-F]/g, '')
      if (!cleaned) throw new Error('请输入有效的 Hex 字符串')
      output.value = caseTarget.value === 'upper' ? cleaned.toUpperCase() : cleaned.toLowerCase()
    }
  } catch (e: any) {
    error.value = e.message || '转换失败'
  }
}

watch([input, separator, prefix, caseStyle, caseTarget], process)

const inputLabel = ref('输入（字符串）')
const outputLabel = ref('输出（Hex）')

watch(mode, (m) => {
  if (m === 'case') {
    inputLabel.value = '输入（Hex）'
    outputLabel.value = '输出（Hex）'
    input.value = ''
    output.value = ''
    process()
    return
  }
  if (isSwapping.value) {
    if (m === 'encode') {
      inputLabel.value = '输入（字符串）'
      outputLabel.value = '输出（Hex）'
    } else {
      inputLabel.value = '输入（Hex）'
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
    outputLabel.value = '输出（Hex）'
  } else {
    inputLabel.value = '输入（Hex）'
    outputLabel.value = '输出（字符串）'
  }
  process()
})
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <OptionsPanel v-if="mode === 'encode'" :options="optionItems" @update:option="updateOption" />
    <OptionsPanel v-if="mode === 'case'" :options="caseOptionItems" @update:option="updateCaseOption" />
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


