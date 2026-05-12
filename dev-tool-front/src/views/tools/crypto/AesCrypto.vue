<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import SwapButton from '@/components/common/SwapButton.vue'
import HistorySection from '@/components/common/HistorySection.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'
import { getCryptoService } from '@/services'

const mode = ref('encrypt')
const input = ref(''); const output = ref(''); const key = ref(''); const iv = ref('')
const aesMode = ref('CBC'); const padding = ref('PKCS7')
const keySize = ref<number>(256); const format = ref('Base64')
const error = ref<string|null>(null); const loading = ref(false)
const isSwapping = ref(false)
const history = ref<any[]>([]); const historyKey = 'aes-crypto-history'
const tabs = [{ key: 'encrypt', label: '加密' }, { key: 'decrypt', label: '解密' }]

const keyMaxChars = computed(() => keySize.value / 4) // 128→32, 192→48, 256→64
const keyBytes = computed(() => key.value.replace(/[^0-9a-fA-F]/g, '').length / 2)
const ivBytes = computed(() => iv.value.replace(/[^0-9a-fA-F]/g, '').length / 2)
const IV_BYTES = 16

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

// Clear key when size changes (old key length won't match)
watch(keySize, () => { key.value = '' })

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes); crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function execute() {
  error.value = null; loading.value = true
  try {
    if (mode.value === 'encrypt') {
      const res = await getCryptoService().aesEncrypt({
        plaintext: input.value, key: key.value, iv: aesMode.value !== 'ECB' ? iv.value : undefined,
        mode: aesMode.value as any, padding: padding.value as any, keySize: keySize.value as any, outputFormat: format.value as any,
      })
      if (res.success) { output.value = res.data!.ciphertext; if (res.data!.iv) iv.value = res.data!.iv }
      else { output.value = ''; error.value = res.error!.message }
    } else {
      const res = await getCryptoService().aesDecrypt({
        ciphertext: input.value, key: key.value, iv: aesMode.value !== 'ECB' ? iv.value : undefined,
        mode: aesMode.value as any, padding: padding.value as any, keySize: keySize.value as any, inputFormat: format.value as any,
      })
      if (res.success) output.value = res.data!
      else { output.value = ''; error.value = res.error!.message }
    }
  } catch (e: any) { output.value = ''; error.value = e.message } finally { loading.value = false }
}
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <div class="options-panel">
      <div class="option-group"><span class="option-label">模式</span>
        <select class="option-select" v-model="aesMode"><option>CBC</option><option>GCM</option><option>CTR</option><option>ECB</option></select></div>
      <div class="option-group"><span class="option-label">填充</span>
        <select class="option-select" v-model="padding"><option>PKCS7</option><option>None</option></select></div>
      <div class="option-group"><span class="option-label">密钥长度</span>
        <select class="option-select" v-model.number="keySize"><option :value="128">128</option><option :value="192">192</option><option :value="256">256</option></select></div>
      <div class="option-group"><span class="option-label">格式</span>
        <select class="option-select" v-model="format"><option>Base64</option><option>Hex</option></select></div>
    </div>
    <div class="key-row"><span class="key-label">密钥</span>
      <input class="key-input" v-model="key" :maxlength="keyMaxChars" placeholder="Hex 编码密钥" />
      <span class="key-count" :class="{ complete: keyBytes === keySize / 8 }">{{ keyBytes }}/{{ keySize / 8 }}</span>
      <button class="btn-outline" @click="key=randomHex(keySize/8)">随机生成</button></div>
    <div v-if="aesMode!=='ECB'" class="key-row"><span class="key-label">IV</span>
      <input class="key-input" v-model="iv" :maxlength="IV_BYTES * 2" placeholder="Hex 编码 IV（16字节）" />
      <span class="key-count" :class="{ complete: ivBytes === IV_BYTES }">{{ ivBytes }}/{{ IV_BYTES }}</span>
      <button class="btn-outline" @click="iv=randomHex(16)">随机生成</button></div>
    <ErrorBanner v-if="error" :message="error" @dismiss="error=null"/>
    <div class="editor-header"><span class="editor-title">{{ mode==='encrypt'?'明文':'密文' }}</span></div>
    <div class="editor-body"><textarea class="editor-textarea" v-model="input" :placeholder="mode==='encrypt'?'输入明文...':'输入密文...'"></textarea></div>
    <SwapButton @swap="() => { const t = input; input = output; output = t }" />
    <div style="display:flex;justify-content:center;padding:8px 0;">
      <button class="btn-primary" @click="execute" :disabled="loading">{{ loading?'处理中...':(mode==='encrypt'?'加密':'解密') }}</button></div>
    <div class="editor-header"><span class="editor-title">{{ mode==='encrypt'?'密文':'明文' }}</span><CopyButton :text="output"/></div>
    <div class="editor-body output"><div class="editor-output">{{output}}</div></div>
    <HistorySection :records="history" @restore="(r: any) => { input = r.input; output = r.output }" @clear="history = []" />
  </ToolContainer>
</template>

<style scoped>
.key-input{flex:1;height:32px;border-radius:6px;border:1px solid var(--border-input);padding:0 10px;font-size:12px;font-family:'Consolas',monospace;outline:none}
.key-count{font-size:11px;font-family:'Consolas',monospace;color:var(--text-placeholder);white-space:nowrap;min-width:48px;text-align:right}
.key-count.complete{color:#16a34a}
</style>
