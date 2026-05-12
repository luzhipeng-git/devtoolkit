<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import SwapButton from '@/components/common/SwapButton.vue'
import HistorySection from '@/components/common/HistorySection.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'
import { getCryptoService } from '@/services'

const mode = ref('encrypt'); const algo = ref('des')
const input = ref(''); const output = ref(''); const key = ref(''); const iv = ref('')
const desMode = ref('CBC'); const format = ref('Base64')
const keyLength = ref('double')
const error = ref<string|null>(null); const loading = ref(false)
const isSwapping = ref(false)
const history = ref<any[]>([]); const historyKey = 'des-crypto-history'
const tabs = [{ key: 'encrypt', label: '加密' }, { key: 'decrypt', label: '解密' }]
const algoTabs = [{ key: 'des', label: 'DES' }, { key: '3des', label: '3DES' }]

const keyBytesRequired = computed(() => {
  if (algo.value === 'des') return 8
  return keyLength.value === 'double' ? 16 : 24
})

const keyMaxChars = computed(() => keyBytesRequired.value * 2)

const keyBytes = computed(() => key.value.replace(/[^0-9a-fA-F]/g, '').length / 2)
const ivBytes = computed(() => iv.value.replace(/[^0-9a-fA-F]/g, '').length / 2)
const IV_BYTES = 8

const keyPlaceholder = computed(() => {
  if (algo.value === 'des') return '16位Hex（8字节，单倍长）'
  return keyLength.value === 'double' ? '32位Hex（16字节，双倍长）' : '48位Hex（24字节，三倍长）'
})

watch(mode, () => {
  if (isSwapping.value) {
    isSwapping.value = false
    return
  }
  const temp = input.value
  input.value = output.value
  output.value = temp
  nextTick(() => { isSwapping.value = false })
})

// Clamp key/iv to hex-only and max length
watch(key, (val) => {
  const hex = val.replace(/[^0-9a-fA-F]/g, '').slice(0, keyMaxChars.value)
  if (hex !== val) key.value = hex
})

watch(iv, (val) => {
  const hex = val.replace(/[^0-9a-fA-F]/g, '').slice(0, IV_BYTES * 2)
  if (hex !== val) iv.value = hex
})

// Clear key when algo or key length changes
watch([algo, keyLength], () => { key.value = '' })

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes); crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function execute() {
  error.value = null; loading.value = true
  try {
    const keyHex = key.value.trim()
    if (!keyHex) { error.value = '请输入密钥'; loading.value = false; return }
    if (!/^[0-9a-fA-F]+$/.test(keyHex)) { error.value = '密钥必须是有效的 Hex 编码'; loading.value = false; return }
    const actualBytes = keyHex.length / 2
    if (actualBytes !== keyBytesRequired.value) {
      error.value = `密钥必须 ${keyBytesRequired.value} 字节，当前 ${actualBytes} 字节`; loading.value = false; return
    }
    const svc = getCryptoService()
    const req = { plaintext: mode.value === 'encrypt' ? input.value : '', ciphertext: mode.value === 'decrypt' ? input.value : '', key: key.value, iv: desMode.value !== 'ECB' ? iv.value : undefined, mode: desMode.value as any, padding: 'PKCS7' as const, outputFormat: format.value as any, inputFormat: format.value as any }
    let res: any
    if (mode.value === 'encrypt') {
      res = algo.value === '3des' ? await svc.tripleDesEncrypt(req) : await svc.desEncrypt(req)
      if (res.success) { output.value = res.data!.ciphertext; if (res.data!.iv) iv.value = res.data!.iv }
      else { output.value = ''; error.value = res.error!.message }
    } else {
      res = algo.value === '3des' ? await svc.tripleDesDecrypt(req) : await svc.desDecrypt(req)
      if (res.success) output.value = res.data!
      else { output.value = ''; error.value = res.error!.message }
    }
  } catch (e: any) { output.value = ''; error.value = e.message } finally { loading.value = false }
}
</script>

<template>
  <ToolContainer>
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border-light);margin-bottom:16px;">
      <button v-for="t in algoTabs" :key="t.key" class="algo-tab" :class="{active:algo===t.key}" @click="algo=t.key">{{t.label}}</button>
    </div>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <div class="options-panel">
      <div class="option-group"><span class="option-label">模式</span><select class="option-select" v-model="desMode"><option>CBC</option><option>ECB</option></select></div>
      <div v-if="algo==='3des'" class="option-group"><span class="option-label">密钥长度</span>
        <select class="option-select" v-model="keyLength">
          <option value="double">双倍长（16字节）</option>
          <option value="triple">三倍长（24字节）</option>
        </select>
      </div>
      <div class="option-group"><span class="option-label">格式</span><select class="option-select" v-model="format"><option>Base64</option><option>Hex</option></select></div>
    </div>
    <div class="key-row"><span class="key-label">密钥</span>
      <input class="key-input" v-model="key" :maxlength="keyMaxChars" :placeholder="keyPlaceholder" />
      <span class="key-count" :class="{ complete: keyBytes === keyBytesRequired }">{{ keyBytes }}/{{ keyBytesRequired }}</span>
      <button class="btn-outline" @click="key=randomHex(keyBytesRequired)">随机生成</button></div>
    <div v-if="desMode!=='ECB'" class="key-row"><span class="key-label">IV</span>
      <input class="key-input" v-model="iv" :maxlength="IV_BYTES * 2" placeholder="16位Hex（8字节）" />
      <span class="key-count" :class="{ complete: ivBytes === IV_BYTES }">{{ ivBytes }}/{{ IV_BYTES }}</span>
      <button class="btn-outline" @click="iv=randomHex(8)">随机生成</button></div>
    <ErrorBanner v-if="error" :message="error" @dismiss="error=null"/>
    <div class="editor-header"><span class="editor-title">{{mode==='encrypt'?'明文':'密文'}}</span></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="input" :placeholder="mode==='encrypt'?'输入明文...':'输入密文...'"></textarea></div>
    <SwapButton @swap="() => { const t = input; input = output; output = t }" />
    <div style="display:flex;justify-content:center;padding:8px 0;"><button class="btn-primary" @click="execute" :disabled="loading">{{loading?'处理中...':(mode==='encrypt'?'加密':'解密')}}</button></div>
    <div class="editor-header"><span class="editor-title">{{mode==='encrypt'?'密文':'明文'}}</span><CopyButton :text="output"/></div>
    <div class="editor-body output"><div class="editor-output">{{output}}</div></div>
    <HistorySection :records="history" @restore="(r: any) => { input = r.input; output = r.output }" @clear="history = []" />
  </ToolContainer>
</template>

<style scoped>
.algo-tab{padding:8px 20px;font-size:13px;font-weight:500;border:none;background:none;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent}
.algo-tab.active{color:var(--primary);border-bottom-color:var(--primary)}

.key-input{flex:1;height:32px;border-radius:6px;border:1px solid var(--border-input);padding:0 10px;font-size:12px;font-family:'Consolas',monospace;outline:none}
.key-count{font-size:11px;font-family:'Consolas',monospace;color:var(--text-placeholder);white-space:nowrap;min-width:48px;text-align:right}
.key-count.complete{color:#16a34a}
</style>
