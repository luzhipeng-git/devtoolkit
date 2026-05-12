<script setup lang="ts">
import { ref } from 'vue'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

const input = ref(''); const output = ref(''); const error = ref<string|null>(null)
const mode = ref('json2xml')
const tabs = [{ key: 'json2xml', label: 'JSON → XML' }, { key: 'xml2json', label: 'XML → JSON' }]

function convert() {
  error.value = null; if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'json2xml') {
      const obj = JSON.parse(input.value)
      const builder = new XMLBuilder({ format: true, ignoreAttributes: false })
      output.value = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(obj)
    } else {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
      const obj = parser.parse(input.value)
      output.value = JSON.stringify(obj, null, 2)
    }
  } catch (e: any) { error.value = e.message }
}
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <ErrorBanner v-if="error" :message="error" @dismiss="error=null"/>
    <div class="editor-header"><span class="editor-title">输入（{{ mode === 'json2xml' ? 'JSON' : 'XML' }}）</span></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="input" @input="convert" :placeholder="mode === 'json2xml' ? '粘贴 JSON...' : '粘贴 XML...'"></textarea></div>
    <div class="editor-header" style="margin-top:12px"><span class="editor-title">输出（{{ mode === 'json2xml' ? 'XML' : 'JSON' }}）</span><CopyButton :text="output"/></div>
    <div class="editor-body output"><div class="editor-output">{{output}}</div></div>
  </ToolContainer>
</template>


