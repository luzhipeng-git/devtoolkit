<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'
import { getCryptoService } from '@/services'

const subMode = ref('keygen')
const subTabs = [
  { key: 'keygen', label: '密钥生成' },
  { key: 'encrypt', label: '加解密' },
  { key: 'sign', label: '签名验签' },
]
const keySize = ref<number>(2048)
const publicExponent = ref<number>(65537)
const keyFormat = ref<string>('PKCS8')
const publicKey = ref(''); const privateKey = ref('')
const modulusHex = ref(''); const pubExpHex = ref(''); const privExpHex = ref('')
const input = ref(''); const output = ref('')
const error = ref<string | null>(null); const loading = ref(false)
const isSwapping = ref(false)

// Encrypt/Decrypt tab state
const encMode = ref('encrypt')
const encTabs = [
  { key: 'encrypt', label: '加密' },
  { key: 'decrypt', label: '解密' },
]
const encPadding = ref('OAEP')
const encFormat = ref('Base64')

// Sign/Verify tab state
const signMode = ref('sign')
const signTabs = [
  { key: 'sign', label: '签名' },
  { key: 'verify', label: '验签' },
]
const signAlgo = ref('SHA256')

const exponentOptions = [
  { value: 3, label: '3' },
  { value: 17, label: '17' },
  { value: 65537, label: '65537 (0x10001)' },
]

// Swap input/output when switching encrypt/decrypt tab
watch(encMode, () => {
  if (isSwapping.value) {
    isSwapping.value = false
    return
  }
  const temp = input.value
  input.value = output.value
  output.value = temp
  nextTick(() => { isSwapping.value = false })
})

// Clean PEM: strip content after -----END ... KEY-----
function cleanPem(raw: string): string {
  if (!raw) return ''
  const match = raw.match(/^[\s\S]*?-----END[\s\w]*KEY-----/)
  return match ? match[0].trimEnd() : raw.trimEnd()
}

// Auto-clean + auto-wrap PEM in textarea
watch(publicKey, (val) => {
  const cleaned = cleanPem(val)
  const wrapped = wrapPem(cleaned, 'public')
  if (wrapped !== val) publicKey.value = wrapped
})

watch(privateKey, (val) => {
  const cleaned = cleanPem(val)
  const wrapped = wrapPem(cleaned, 'private')
  if (wrapped !== val) privateKey.value = wrapped
})

function wrapPem(raw: string, type: 'public' | 'private'): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  // Already has PEM header
  if (trimmed.includes('-----BEGIN')) return trimmed
  // Strip whitespace from base64 content and wrap at 64 chars
  const b64 = trimmed.replace(/\s+/g, '')
  const header = type === 'public' ? '-----BEGIN PUBLIC KEY-----' : '-----BEGIN PRIVATE KEY-----'
  const footer = type === 'public' ? '-----END PUBLIC KEY-----' : '-----END PRIVATE KEY-----'
  const lines = b64.match(/.{1,64}/g) || []
  return `${header}\n${lines.join('\n')}\n${footer}`
}

function loadKeyFromFile(target: 'publicKey' | 'privateKey') {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pem,.key,.pub,.txt,.cer,.crt'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const type = target === 'publicKey' ? 'public' : 'private'
      if (target === 'publicKey') {
        publicKey.value = wrapPem(text, type)
      } else {
        privateKey.value = wrapPem(text, type)
      }
    } catch {
      error.value = '文件读取失败'
    }
  }
  input.click()
}

async function generateKeyPair() {
  error.value = null; loading.value = true
  try {
    const res = await getCryptoService().rsaGenerateKeyPair({
      keySize: keySize.value as any,
      publicExponent: publicExponent.value,
      format: keyFormat.value as any,
    })
    if (res.success) {
      publicKey.value = res.data!.publicKey
      privateKey.value = res.data!.privateKey
      modulusHex.value = res.data!.modulusHex
      pubExpHex.value = res.data!.publicExponentHex
      privExpHex.value = res.data!.privateExponentHex
    }
    else error.value = res.error!.message
  } catch (e: any) { error.value = e.message } finally { loading.value = false }
}

async function encryptOrDecrypt() {
  error.value = null; loading.value = true
  try {
    const svc = getCryptoService()
    if (encMode.value === 'encrypt') {
      const pem = wrapPem(publicKey.value, 'public')
      const res = await svc.rsaEncrypt({
        plaintext: input.value,
        publicKey: pem,
        padding: encPadding.value as any,
      })
      if (res.success) output.value = res.data!
      else { output.value = ''; error.value = res.error!.message }
    } else {
      const pem = wrapPem(privateKey.value, 'private')
      const res = await svc.rsaDecrypt({
        ciphertext: input.value,
        privateKey: pem,
        padding: encPadding.value as any,
        inputFormat: encFormat.value as any,
      })
      if (res.success) output.value = res.data!
      else { output.value = ''; error.value = res.error!.message }
    }
  } catch (e: any) { output.value = ''; error.value = e.message } finally { loading.value = false }
}

async function signOrVerify() {
  error.value = null; loading.value = true
  try {
    const svc = getCryptoService()
    if (signMode.value === 'sign') {
      const pem = wrapPem(privateKey.value, 'private')
      const res = await svc.rsaSign({
        data: input.value,
        privateKey: pem,
        algorithm: signAlgo.value as any,
      })
      if (res.success) output.value = res.data!
      else { output.value = ''; error.value = res.error!.message }
    } else {
      const pem = wrapPem(publicKey.value, 'public')
      const res = await svc.rsaVerify({
        data: input.value,
        signature: output.value,
        publicKey: pem,
        algorithm: signAlgo.value as any,
      })
      if (res.success) {
        const valid = res.data
        error.value = valid ? '验签通过 ✓' : '验签失败 ✗'
      } else {
        error.value = res.error!.message
      }
    }
  } catch (e: any) { output.value = ''; error.value = e.message } finally { loading.value = false }
}
</script>

<template>
  <ToolContainer>
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border-light);margin-bottom:16px;">
      <button v-for="t in subTabs" :key="t.key" class="sub-tab" :class="{active:subMode===t.key}" @click="subMode=t.key">{{t.label}}</button>
    </div>

    <!-- KeyGen -->
    <template v-if="subMode==='keygen'">
      <div class="options-panel">
        <div class="option-group"><span class="option-label">密钥长度</span>
          <select class="option-select" v-model.number="keySize"><option :value="1024">1024</option><option :value="2048">2048</option><option :value="4096">4096</option></select></div>
        <div class="option-group"><span class="option-label">公钥指数</span>
          <select class="option-select" v-model.number="publicExponent">
            <option v-for="opt in exponentOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select></div>
        <div class="option-group"><span class="option-label">输出格式</span>
          <select class="option-select" v-model="keyFormat"><option value="PKCS8">PKCS#8</option><option value="PKCS1">PKCS#1</option></select></div>
      </div>
      <button class="btn-primary" @click="generateKeyPair" :disabled="loading">{{loading?'生成中...':'生成密钥对'}}</button>
      <ErrorBanner v-if="error && subMode==='keygen'" :message="error" @dismiss="error=null"/>
      <div v-if="publicKey" style="margin-top:16px;">
        <div class="rsa-params">
          <div class="param-row">
            <span class="param-label">模数 n</span>
            <span class="param-value">{{ modulusHex }}</span>
            <CopyButton :text="modulusHex" />
          </div>
          <div class="param-row">
            <span class="param-label">公钥指数 e</span>
            <span class="param-value">{{ pubExpHex }}</span>
            <CopyButton :text="pubExpHex" />
          </div>
          <div class="param-row">
            <span class="param-label">私钥指数 d</span>
            <span class="param-value">{{ privExpHex }}</span>
            <CopyButton :text="privExpHex" />
          </div>
        </div>
        <div class="editor-header"><span class="editor-title">公钥</span><CopyButton :text="publicKey"/></div>
        <div class="editor-body output"><div class="editor-output">{{publicKey}}</div></div>
        <div class="editor-header" style="margin-top:12px"><span class="editor-title">私钥</span><CopyButton :text="privateKey"/></div>
        <div class="editor-body output"><div class="editor-output">{{privateKey}}</div></div>
      </div>
    </template>

    <!-- Encrypt/Decrypt -->
    <template v-if="subMode==='encrypt'">
      <div style="display:flex;gap:0;border-bottom:1px solid var(--border-light);margin-bottom:12px;">
        <button v-for="t in encTabs" :key="t.key" class="sub-tab" :class="{active:encMode===t.key}" @click="encMode=t.key">{{t.label}}</button>
      </div>
      <div class="options-panel">
        <div class="option-group"><span class="option-label">填充模式</span>
          <select class="option-select" v-model="encPadding"><option value="OAEP">OAEP</option><option value="PKCS1">PKCS1</option></select></div>
        <div v-if="encMode==='decrypt'" class="option-group"><span class="option-label">密文格式</span>
          <select class="option-select" v-model="encFormat"><option value="Base64">Base64</option><option value="Hex">Hex</option></select></div>
      </div>
      <div class="key-row" v-if="encMode==='encrypt'">
        <span class="key-label">公钥</span>
        <button class="btn-outline btn-sm" @click="loadKeyFromFile('publicKey')">上传文件</button>
      </div>
      <div class="key-row" v-else>
        <span class="key-label">私钥</span>
        <button class="btn-outline btn-sm" @click="loadKeyFromFile('privateKey')">上传文件</button>
      </div>
      <div class="editor-body" style="margin-bottom:8px;">
        <textarea v-if="encMode==='encrypt'" class="editor-textarea" style="height:80px;"
          v-model="publicKey" placeholder="粘贴公钥（PEM 或 Base64 内容）"></textarea>
        <textarea v-else class="editor-textarea" style="height:80px;"
          v-model="privateKey" placeholder="粘贴私钥（PEM 或 Base64 内容）"></textarea>
      </div>
      <div class="editor-header"><span class="editor-title">{{encMode==='encrypt'?'明文':'密文'}}</span></div>
      <div class="editor-body"><textarea class="editor-textarea" v-model="input" :placeholder="encMode==='encrypt'?'输入明文...':'输入密文...'"></textarea></div>
      <div style="display:flex;gap:8px;justify-content:center;padding:8px 0;">
        <button class="btn-primary" @click="encryptOrDecrypt" :disabled="loading">{{loading?'处理中...':(encMode==='encrypt'?'加密':'解密')}}</button>
      </div>
      <ErrorBanner v-if="error && subMode==='encrypt'" :message="error" @dismiss="error=null"/>
      <div class="editor-header"><span class="editor-title">{{encMode==='encrypt'?'密文':'明文'}}</span><CopyButton :text="output"/></div>
      <div class="editor-body output"><div class="editor-output">{{output}}</div></div>
    </template>

    <!-- Sign/Verify -->
    <template v-if="subMode==='sign'">
      <div style="display:flex;gap:0;border-bottom:1px solid var(--border-light);margin-bottom:12px;">
        <button v-for="t in signTabs" :key="t.key" class="sub-tab" :class="{active:signMode===t.key}" @click="signMode=t.key">{{t.label}}</button>
      </div>
      <div class="options-panel">
        <div class="option-group"><span class="option-label">哈希算法</span>
          <select class="option-select" v-model="signAlgo"><option value="SHA256">SHA-256</option><option value="SHA384">SHA-384</option><option value="SHA512">SHA-512</option></select></div>
      </div>
      <div class="key-row" v-if="signMode==='sign'">
        <span class="key-label">私钥</span>
        <button class="btn-outline btn-sm" @click="loadKeyFromFile('privateKey')">上传文件</button>
      </div>
      <div class="key-row" v-else>
        <span class="key-label">公钥</span>
        <button class="btn-outline btn-sm" @click="loadKeyFromFile('publicKey')">上传文件</button>
      </div>
      <div class="editor-body" style="margin-bottom:8px;">
        <textarea v-if="signMode==='sign'" class="editor-textarea" style="height:80px;"
          v-model="privateKey" placeholder="粘贴私钥（PEM 或 Base64 内容）"></textarea>
        <textarea v-else class="editor-textarea" style="height:80px;"
          v-model="publicKey" placeholder="粘贴公钥（PEM 或 Base64 内容）"></textarea>
      </div>
      <div class="editor-header"><span class="editor-title">待签名数据</span></div>
      <div class="editor-body"><textarea class="editor-textarea" v-model="input" placeholder="输入数据..."></textarea></div>
      <div style="display:flex;gap:8px;justify-content:center;padding:8px 0;">
        <button class="btn-primary" @click="signOrVerify" :disabled="loading">{{loading?'处理中...':(signMode==='sign'?'签名':'验签')}}</button>
      </div>
      <ErrorBanner v-if="error && subMode==='sign'" :message="error" @dismiss="error=null"/>
      <div class="editor-header"><span class="editor-title">签名结果</span><CopyButton v-if="signMode==='sign'" :text="output"/></div>
      <div v-if="signMode==='sign'" class="editor-body output"><div class="editor-output">{{output}}</div></div>
      <div v-if="signMode==='verify'" class="editor-body">
        <textarea class="editor-textarea" v-model="output" placeholder="粘贴签名结果（Base64）..."></textarea>
      </div>
    </template>
  </ToolContainer>
</template>

<style scoped>
.sub-tab{padding:8px 20px;font-size:13px;font-weight:500;border:none;background:none;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent}
.sub-tab.active{color:var(--primary);border-bottom-color:var(--primary)}

.rsa-params{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;padding:12px 16px;background:var(--bg-code);border:1px solid var(--border-card);border-radius:8px}
.param-row{display:flex;align-items:center;gap:8px}
.param-label{font-size:12px;font-weight:500;color:var(--text-muted);white-space:nowrap;min-width:72px}
.param-value{flex:1;font-family:'Consolas',monospace;font-size:11px;color:var(--text-secondary);word-break:break-all;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}

.btn-sm{font-size:11px;padding:3px 10px}
</style>
