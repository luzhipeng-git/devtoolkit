<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const input = ref(''); const output = ref('')
const mode = ref('encode')
const tabs = [{ key: 'encode', label: '编码' }, { key: 'decode', label: '解码' }]

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', ' ': '&nbsp;' }
const reverseEntities: Record<string, string> = Object.fromEntries(Object.entries(entities).map(([k, v]) => [v, k]))

function encode(text: string): string {
  return text.replace(/[&<>"']/g, c => entities[c] || c)
}

function decode(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);/gi, entity => {
    if (reverseEntities[entity]) return reverseEntities[entity]
    const numMatch = entity.match(/^&#(x?)(\d+);$/i)
    if (numMatch) return String.fromCharCode(parseInt(numMatch[2], numMatch[1] ? 16 : 10))
    return entity
  })
}

function process() {
  output.value = mode.value === 'encode' ? encode(input.value) : decode(input.value)
}
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <div class="editor-header"><span class="editor-title">输入</span></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="input" @input="process" placeholder="输入文本..."></textarea></div>
    <div class="editor-header" style="margin-top:12px"><span class="editor-title">输出</span><CopyButton :text="output"/></div>
    <div class="editor-body output"><div class="editor-output">{{output}}</div></div>
  </ToolContainer>
</template>


