<script setup lang="ts">
import { ref } from 'vue'
import yaml from 'js-yaml'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

const input = ref(''); const output = ref(''); const error = ref<string|null>(null)
const mode = ref('json2yaml')
const tabs = [{ key: 'json2yaml', label: 'JSON → YAML' }, { key: 'yaml2json', label: 'YAML → JSON' }]

function convert() {
  error.value = null; if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'json2yaml') {
      const obj = JSON.parse(input.value)
      output.value = yaml.dump(obj, { indent: 2, lineWidth: 120 })
    } else {
      const obj = yaml.load(input.value)
      output.value = JSON.stringify(obj, null, 2)
    }
  } catch (e: any) { error.value = e.message }
}
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <ErrorBanner v-if="error" :message="error" @dismiss="error=null"/>
    <div class="editor-header"><span class="editor-title">输入（{{ mode === 'json2yaml' ? 'JSON' : 'YAML' }}）</span></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="input" @input="convert" :placeholder="mode === 'json2yaml' ? '粘贴 JSON...' : '粘贴 YAML...'"></textarea></div>
    <div class="editor-header" style="margin-top:12px"><span class="editor-title">输出（{{ mode === 'json2yaml' ? 'YAML' : 'JSON' }}）</span><CopyButton :text="output"/></div>
    <div class="editor-body output"><div class="editor-output">{{output}}</div></div>
  </ToolContainer>
</template>


