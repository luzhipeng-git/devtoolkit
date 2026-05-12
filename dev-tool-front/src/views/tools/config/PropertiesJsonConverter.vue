<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const mode = ref('toJson')
const tabs = [{ key: 'toJson', label: 'Properties → JSON' }, { key: 'toProps', label: 'JSON → Properties' }]
const input = ref('')
const output = ref('')
const error = ref('')

const placeholder = computed(() =>
  mode.value === 'toJson' ? 'server.port=8080\napp.name=MyApp' : '{"server":{"port":8080}}'
)

function parseProperties(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
  }
  return result
}

function propsToNested(obj: Record<string, string>): Record<string, any> {
  const root: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.')
    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }
  return root
}

function flattenJson(obj: any, prefix = ''): string[] {
  const lines: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(...flattenJson(value, fullKey))
    } else {
      lines.push(`${fullKey}=${Array.isArray(value) ? JSON.stringify(value) : value}`)
    }
  }
  return lines
}

function convert() {
  error.value = ''
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'toJson') {
      const props = parseProperties(input.value)
      const nested = propsToNested(props)
      output.value = JSON.stringify(nested, null, 2)
    } else {
      const parsed = JSON.parse(input.value)
      output.value = flattenJson(parsed).join('\n')
    }
  } catch (e: any) {
    error.value = e.message || '转换失败'
  }
}
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <div class="editor-header"><span class="editor-title">{{ mode === 'toJson' ? 'Properties 输入' : 'JSON 输入' }}</span></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="input" @input="convert" :placeholder="placeholder"></textarea></div>
    <div v-if="error" style="color:#dc2626;font-size:12px;margin:4px 0;">{{ error }}</div>
    <div class="editor-header" style="margin-top:12px"><span class="editor-title">{{ mode === 'toJson' ? 'JSON 输出' : 'Properties 输出' }}</span><CopyButton :text="output"/></div>
    <div class="editor-body output"><div class="editor-output">{{ output }}</div></div>
  </ToolContainer>
</template>


