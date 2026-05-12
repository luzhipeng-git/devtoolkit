<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'
import { JSONPath } from 'jsonpath-plus'
const jsonInput = ref(''); const pathExpr = ref('$..*'); const result = ref(''); const error = ref<string|null>(null)
function query(){error.value=null;if(!jsonInput.value.trim()){result.value='';return}try{const data=JSON.parse(jsonInput.value);const res=JSONPath({path:pathExpr.value,json:data});result.value=JSON.stringify(res,null,2)}catch(e:any){error.value=e.message}}
</script>
<template>
  <ToolContainer>
    <div class="editor-header"><span class="editor-title">JSON 输入</span></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="jsonInput" placeholder="粘贴 JSON 数据..."></textarea></div>
    <div style="margin:12px 0;display:flex;gap:8px;align-items:center;">
      <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">JSONPath:</span>
      <input class="path-input" v-model="pathExpr" placeholder="$.store.book[0].title" @input="query"/>
      <button class="btn-outline" @click="query">查询</button>
    </div>
    <ErrorBanner v-if="error" :message="error" @dismiss="error=null"/>
    <div class="editor-header"><span class="editor-title">查询结果</span><CopyButton :text="result"/></div>
    <div class="editor-body output"><div class="editor-output">{{result}}</div></div>
  </ToolContainer>
</template>
<style scoped>
.path-input{flex:1;height:30px;border-radius:4px;border:1px solid var(--border-input);padding:0 8px;font-family:'Consolas',monospace;font-size:12px;outline:none;color:var(--text-primary)}
.path-input:focus{border-color:var(--primary)}
</style>
