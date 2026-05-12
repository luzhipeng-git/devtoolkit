<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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
  toolId: 'encoding-unicode',
  debounceMs: 300,
})

const prefixStyle = ref('\\u')
const separator = ref('none')
const skipUrl = ref(false)
const { copy } = useClipboard()

const tabs = [
  { key: 'encode', label: '编码' },
  { key: 'decode', label: '解码' },
]

const optionItems = computed(() => {
  const items: any[] = [
    { key: 'prefixStyle', label: '前缀格式', type: 'select' as const, modelValue: prefixStyle.value, options: [{ value: '\\u', label: '\\uXXXX' }, { value: '\\U', label: '\\UXXXXXXXX' }, { value: '&#x', label: '&#xHH;' }, { value: 'U+', label: 'U+XXXX' }] },
    { key: 'separator', label: '分隔符', type: 'select' as const, modelValue: separator.value, options: [{ value: 'none', label: '无' }, { value: 'space', label: '空格' }, { value: 'comma', label: '逗号' }] },
  ]
  if (mode.value === 'encode') {
    items.push({ key: 'skipUrl', label: 'URL', type: 'toggle' as const, modelValue: skipUrl.value, options: [{ value: 'true', label: '保留URL，仅转换查询参数' }] })
  }
  return items
})

function updateOption(key: string, value: any) {
  if (key === 'prefixStyle') prefixStyle.value = value
  else if (key === 'separator') separator.value = value
  else if (key === 'skipUrl') skipUrl.value = value
}

function textToUnicode(text: string): string {
  const results: string[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)
    if (code === undefined) continue
    // Skip surrogate pair low
    if (code > 0xFFFF) i++
    switch (prefixStyle.value) {
      case '\\u':
        if (code > 0xFFFF) {
          results.push(`\\u{${code.toString(16).toUpperCase()}}`)
        } else {
          results.push(`\\u${code.toString(16).toUpperCase().padStart(4, '0')}`)
        }
        break
      case '\\U':
        results.push(`\\U${code.toString(16).toUpperCase().padStart(8, '0')}`)
        break
      case '&#x':
        results.push(`&#x${code.toString(16).toUpperCase()};`)
        break
      case 'U+':
        results.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')}`)
        break
    }
  }
  const sep = separator.value === 'space' ? ' ' : separator.value === 'comma' ? ', ' : ''
  return results.join(sep)
}

function unicodeToText(unicode: string): string {
  let result = ''
  // Try different patterns
  const patterns = [
    /\\u\{([0-9a-fA-F]+)\}/g,
    /\\u([0-9a-fA-F]{4})/g,
    /\\U([0-9a-fA-F]{8})/g,
    /&#x([0-9a-fA-F]+);/g,
    /U\+([0-9a-fA-F]{4,6})/g,
  ]

  let remaining = unicode
  const replacements: Array<{ match: string; char: string }> = []

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(unicode)) !== null) {
      const code = parseInt(match[1], 16)
      replacements.push({ match: match[0], char: String.fromCodePoint(code) })
    }
  }

  // Apply replacements (longest first to avoid partial matches)
  replacements.sort((a, b) => b.match.length - a.match.length)
  for (const { match, char } of replacements) {
    remaining = remaining.replaceAll(match, char)
  }

  result = remaining
  if (result.length === 0) {
    throw new Error('未能识别有效的Unicode转义序列')
  }
  return result
}

function process() {
  error.value = null
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'encode') {
      if (skipUrl.value) {
        const qIdx = input.value.indexOf('?')
        if (qIdx >= 0) {
          const urlPart = input.value.substring(0, qIdx + 1)
          const queryPart = input.value.substring(qIdx + 1)
          output.value = urlPart + textToUnicode(queryPart)
        } else {
          output.value = input.value
        }
      } else {
        output.value = textToUnicode(input.value)
      }
    } else {
      output.value = unicodeToText(input.value)
    }
  } catch (e: any) {
    error.value = e.message || '转换失败'
  }
}

watch([input, prefixStyle, separator, skipUrl], process)

const inputLabel = ref('输入（字符串）')
const outputLabel = ref('输出（Unicode）')

watch(mode, (m) => {
  if (isSwapping.value) {
    if (m === 'encode') {
      inputLabel.value = '输入（字符串）'
      outputLabel.value = '输出（Unicode）'
    } else {
      inputLabel.value = '输入（Unicode）'
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
    outputLabel.value = '输出（Unicode）'
  } else {
    inputLabel.value = '输入（Unicode）'
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
