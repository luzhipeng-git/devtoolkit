<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'
import { getCryptoService } from '@/services'

// Tab state
const subMode = ref('random')
const subTabs = [
  { key: 'random', label: '随机密钥' },
  { key: 'kcv', label: 'KCV 计算' },
]

// ===== Random Key =====
const keyAlgo = ref('aes')
const aesKeySize = ref(128)
const desKeyLength = ref<'single' | 'double' | 'triple'>('single')
const keyFormat = ref<'Hex' | 'Base64'>('Hex')
const randomCase = ref<'upper' | 'lower'>('upper')
const keyQuantity = ref(1)
const generatedKeys = ref<string[]>([])

const aesKeySizeOptions = [
  { value: 128, label: '128 bit (16字节)' },
  { value: 192, label: '192 bit (24字节)' },
  { value: 256, label: '256 bit (32字节)' },
]

const desKeyLengthOptions = [
  { value: 'single', label: '单倍长 (8字节)' },
  { value: 'double', label: '双倍长 (16字节)' },
  { value: 'triple', label: '三倍长 (24字节)' },
]

const keyBytes = computed(() => {
  if (keyAlgo.value === 'aes') return aesKeySize.value / 8
  if (desKeyLength.value === 'single') return 8
  if (desKeyLength.value === 'double') return 16
  return 24
})

function generateRandomKey(bytes: number, format: string): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  if (format === 'Base64') return btoa(String.fromCharCode(...arr))
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function generateKeys() {
  const bytes = keyBytes.value
  const keys: string[] = []
  for (let i = 0; i < keyQuantity.value; i++) {
    keys.push(generateRandomKey(bytes, keyFormat.value))
  }
  generatedKeys.value = keys
}

// ===== KCV =====
const kcvKey = ref('')
const kcvAlgoFamily = ref<'aes' | 'des'>('aes')
const kcvAesSize = ref(128)
const kcvDesLength = ref<'single' | 'double' | 'triple'>('single')
const kcvResult = ref('')
const kcvError = ref<string | null>(null)
const kcvLoading = ref(false)

const kcvKeyBytes = computed(() => {
  if (kcvAlgoFamily.value === 'aes') return kcvAesSize.value / 8
  if (kcvDesLength.value === 'single') return 8
  if (kcvDesLength.value === 'double') return 16
  return 24
})

const kcvKeyMaxChars = computed(() => kcvKeyBytes.value * 2)

const kcvKeyInputBytes = computed(() => kcvKey.value.replace(/[^0-9a-fA-F]/g, '').length / 2)

const kcvBackendAlgo = computed<'AES' | 'DES' | '3DES'>(() => {
  if (kcvAlgoFamily.value === 'aes') return 'AES'
  return kcvDesLength.value === 'single' ? 'DES' : '3DES'
})

function onKcvKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  if (e.key.length === 1 && !/^[0-9a-fA-F]$/.test(e.key)) e.preventDefault()
}

function onKcvKeyPaste(e: ClipboardEvent) {
  e.preventDefault()
  const pasted = (e.clipboardData?.getData('text') || '').replace(/[^0-9a-fA-F]/g, '')
  kcvKey.value = (kcvKey.value + pasted).slice(0, kcvKeyMaxChars.value)
}

const kcvCase = ref<'upper' | 'lower'>('upper')
const kcvDisplayResult = computed(() => {
  if (!kcvResult.value) return ''
  return kcvCase.value === 'upper' ? kcvResult.value.toUpperCase() : kcvResult.value.toLowerCase()
})

function onKcvAlgoChange() {
  kcvKey.value = kcvKey.value.slice(0, kcvKeyMaxChars.value)
}

watch(kcvKey, (val) => {
  const filtered = val.replace(/[^0-9a-fA-F]/g, '')
  if (filtered !== val) kcvKey.value = filtered
})

async function computeKcv() {
  kcvError.value = null; kcvLoading.value = true
  try {
    const res = await getCryptoService().calculateKcv({
      key: kcvKey.value,
      algorithm: kcvBackendAlgo.value,
    })
    if (res.success) kcvResult.value = res.data!
    else { kcvResult.value = ''; kcvError.value = res.error!.message }
  } catch (e: any) { kcvResult.value = ''; kcvError.value = e.message } finally { kcvLoading.value = false }
}

function copyAllKeys() {
  const keys = keyFormat.value === 'Hex' && randomCase.value === 'lower'
    ? generatedKeys.value.map(k => k.toLowerCase())
    : generatedKeys.value
  navigator.clipboard.writeText(keys.join('\n'))
}

// Generate on first load
generateKeys()
</script>

<template>
  <ToolContainer>
    <!-- Sub tabs -->
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border-light);margin-bottom:16px;">
      <button v-for="t in subTabs" :key="t.key" class="sub-tab" :class="{active:subMode===t.key}" @click="subMode=t.key">{{t.label}}</button>
    </div>

    <!-- Random Key Generation -->
    <template v-if="subMode==='random'">
      <div class="options-panel">
        <div class="option-group">
          <span class="option-label">算法</span>
          <select class="option-select" v-model="keyAlgo">
            <option value="aes">AES</option>
            <option value="des">DES / 3DES</option>
          </select>
        </div>
        <div v-if="keyAlgo==='aes'" class="option-group">
          <span class="option-label">密钥长度</span>
          <select class="option-select" v-model.number="aesKeySize">
            <option v-for="opt in aesKeySizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div v-else class="option-group">
          <span class="option-label">密钥长度</span>
          <select class="option-select" v-model="desKeyLength">
            <option v-for="opt in desKeyLengthOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="option-group">
          <span class="option-label">格式</span>
          <select class="option-select" v-model="keyFormat"><option>Hex</option><option>Base64</option></select>
        </div>
        <div class="option-group">
          <span class="option-label">数量</span>
          <input type="number" class="number-input" v-model.number="keyQuantity" min="1" max="100" />
        </div>
      </div>
      <div style="display:flex;justify-content:center;padding:8px 0;">
        <button class="btn-primary" @click="generateKeys">生成</button>
        <button v-if="generatedKeys.length > 1" class="btn-outline" style="margin-left:8px;" @click="copyAllKeys">批量复制</button>
      </div>
      <div v-if="generatedKeys.length && keyFormat==='Hex'" class="case-toggle-row">
        <button class="case-btn" :class="{active: randomCase==='upper'}" @click="randomCase='upper'">大写</button>
        <button class="case-btn" :class="{active: randomCase==='lower'}" @click="randomCase='lower'">小写</button>
      </div>
      <div v-if="generatedKeys.length" class="key-list">
        <div v-for="(key, idx) in generatedKeys" :key="idx" class="key-item">
          <span class="key-index">{{ idx + 1 }}.</span>
          <span class="key-value">{{ keyFormat === 'Hex' ? (randomCase === 'upper' ? key.toUpperCase() : key.toLowerCase()) : key }}</span>
          <CopyButton :text="keyFormat === 'Hex' ? (randomCase === 'upper' ? key.toUpperCase() : key.toLowerCase()) : key" />
        </div>
      </div>
    </template>

    <!-- KCV -->
    <template v-if="subMode==='kcv'">
      <div class="options-panel">
        <div class="option-group">
          <span class="option-label">算法</span>
          <select class="option-select" v-model="kcvAlgoFamily" @change="onKcvAlgoChange">
            <option value="aes">AES</option>
            <option value="des">DES / 3DES</option>
          </select>
        </div>
        <div v-if="kcvAlgoFamily==='aes'" class="option-group">
          <span class="option-label">密钥长度</span>
          <select class="option-select" v-model.number="kcvAesSize" @change="onKcvAlgoChange">
            <option v-for="opt in aesKeySizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div v-else class="option-group">
          <span class="option-label">密钥长度</span>
          <select class="option-select" v-model="kcvDesLength" @change="onKcvAlgoChange">
            <option v-for="opt in desKeyLengthOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
      <div class="key-row">
        <span class="key-label">密钥</span>
        <input class="key-input" v-model="kcvKey" @keydown="onKcvKeyDown" @paste="onKcvKeyPaste" :maxlength="kcvKeyMaxChars" placeholder="输入 Hex 格式密钥" />
        <span class="key-count" :class="{ complete: kcvKeyInputBytes === kcvKeyBytes }">{{ kcvKeyInputBytes }}/{{ kcvKeyBytes }}</span>
      </div>
      <div style="display:flex;justify-content:center;padding:8px 0;">
        <button class="btn-primary" @click="computeKcv" :disabled="kcvLoading || kcvKeyInputBytes !== kcvKeyBytes">{{ kcvLoading ? '计算中...' : '计算 KCV' }}</button>
      </div>
      <ErrorBanner v-if="kcvError" :message="kcvError" @dismiss="kcvError=null"/>
      <div v-if="kcvResult" class="editor-header">
        <span class="editor-title">KCV 结果</span>
        <div class="result-actions">
          <button class="case-btn" :class="{active: kcvCase==='upper'}" @click="kcvCase='upper'">大写</button>
          <button class="case-btn" :class="{active: kcvCase==='lower'}" @click="kcvCase='lower'">小写</button>
          <CopyButton :text="kcvDisplayResult"/>
        </div>
      </div>
      <div v-if="kcvResult" class="editor-body output"><div class="editor-output">{{ kcvDisplayResult }}</div></div>
    </template>
  </ToolContainer>
</template>

<style scoped>
.sub-tab{padding:8px 20px;font-size:13px;font-weight:500;border:none;background:none;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent}
.sub-tab.active{color:var(--primary);border-bottom-color:var(--primary)}

.number-input{width:80px;height:30px;border-radius:6px;border:1px solid var(--border-input);padding:0 8px;font-size:12px;font-family:'Consolas',monospace;outline:none}

.key-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.key-item{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-code);border:1px solid var(--border-card);border-radius:6px}
.key-index{color:var(--text-muted);min-width:24px;font-size:12px}
.key-value{flex:1;font-family:'Consolas',monospace;font-size:12px;color:var(--text-secondary);word-break:break-all}
.key-input{flex:1;height:32px;border-radius:6px;border:1px solid var(--border-input);padding:0 10px;font-size:12px;font-family:'Consolas',monospace;outline:none}
.case-toggle-row{display:flex;gap:6px;margin-bottom:8px}
.key-count{font-size:11px;font-family:'Consolas',monospace;color:var(--text-placeholder);white-space:nowrap;min-width:48px;text-align:right}
.key-count.complete{color:#16a34a}
.result-actions{display:flex;align-items:center;gap:6px}
.case-btn{padding:2px 10px;font-size:11px;border-radius:4px;border:1px solid var(--border-input);background:none;color:var(--text-muted);cursor:pointer;font-family:'Consolas',monospace}
.case-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}
</style>
