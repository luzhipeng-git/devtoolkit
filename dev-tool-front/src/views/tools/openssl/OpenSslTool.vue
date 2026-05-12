<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import HistorySection from '@/components/common/HistorySection.vue'
import { useClipboard } from '@/composables/useClipboard'
import { getOpenSSLService } from '@/services'
import ErrorBanner from '@/components/common/ErrorBanner.vue'
import type { CertParseResponse } from '@/types/api'

const { copyWithFeedback } = useClipboard()

type TabId = 'command-builder' | 'cert-parse' | 'csr-generate' | 'format-convert'
const activeTab = ref<TabId>('command-builder')

const tabs = [
  { id: 'command-builder' as const, label: '命令构建' },
  { id: 'cert-parse' as const, label: '证书解析' },
  { id: 'csr-generate' as const, label: 'CSR 生成' },
  { id: 'format-convert' as const, label: '格式转换' },
]

// Command Builder state
const cmdCategory = ref('证书操作')
const cmdOperation = ref('查看证书信息')
const cmdInputFile = ref('cert.pem')
const cmdOutputFile = ref('')
const generatedCommand = ref('')

const commandTemplates: Record<string, Record<string, string>> = {
  '证书操作': {
    '查看证书信息': 'openssl x509 -in {input} -text -noout',
    '查看证书主题': 'openssl x509 -in {input} -noout -subject',
    '查看证书有效期': 'openssl x509 -in {input} -noout -dates',
    '验证证书': 'openssl verify -CAfile ca.pem {input}',
  },
  '密钥操作': {
    '生成私钥': 'openssl genrsa -out {output} 2048',
    '查看私钥信息': 'openssl rsa -in {input} -text -noout',
    '私钥转PKCS8': 'openssl pkcs8 -topk8 -inform PEM -outform PEM -in {input} -out {output} -nocrypt',
  },
  'CSR操作': {
    '生成CSR': 'openssl req -new -key {input} -out {output}',
    '查看CSR信息': 'openssl req -in {input} -text -noout',
    '验证CSR签名': 'openssl req -in {input} -verify -noout',
  },
}

const operations = computed(() => {
  return Object.keys(commandTemplates[cmdCategory.value] || {})
})

// Update command on change
function updateCommand() {
  const template = commandTemplates[cmdCategory.value]?.[cmdOperation.value]
  if (!template) { generatedCommand.value = ''; return }
  generatedCommand.value = template
    .replace('{input}', cmdInputFile.value || 'input.pem')
    .replace('{output}', cmdOutputFile.value || 'output.pem')
}

watch([cmdCategory, cmdOperation, cmdInputFile, cmdOutputFile], updateCommand)

watch(cmdCategory, () => {
  const ops = Object.keys(commandTemplates[cmdCategory.value] || {})
  if (!ops.includes(cmdOperation.value)) cmdOperation.value = ops[0] || ''
})

updateCommand()

// Cert Parse state
const certInput = ref('')
const certParsed = ref<CertParseResponse | null>(null)
const certParseError = ref('')
const certLoading = ref(false)

function wrapCertPem(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.includes('-----BEGIN')) return trimmed
  const b64 = trimmed.replace(/\s+/g, '')
  const lines = b64.match(/.{1,64}/g) || []
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`
}

watch(certInput, (val) => {
  const wrapped = wrapCertPem(val)
  if (wrapped !== val) certInput.value = wrapped
})

async function parseCert() {
  if (!certInput.value.trim()) {
    certParseError.value = '请输入证书内容'
    certParsed.value = null
    return
  }
  certParseError.value = ''
  certLoading.value = true
  try {
    const res = await getOpenSSLService().parseCertificate({ pem: certInput.value })
    if (res.success) {
      certParsed.value = res.data!
    } else {
      certParsed.value = null
      certParseError.value = res.error!.message
    }
  } catch (e: any) {
    certParsed.value = null
    certParseError.value = e.message
  } finally {
    certLoading.value = false
  }
}

// CSR Generate state
const csrCountry = ref('CN')
const csrState = ref('')
const csrOrg = ref('')
const csrCommonName = ref('')
const csrResult = ref('')

function generateCsrCommand() {
  const parts = [
    `openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.csr`,
    `-subj "/C=${csrCountry.value}/ST=${csrState.value || 'State'}/O=${csrOrg.value || 'Org'}/CN=${csrCommonName.value || 'example.com'}"`,
  ]
  csrResult.value = parts.join(' \\\n  ')
}

// Format Convert state
const convertInput = ref('')
const convertFrom = ref('PEM')
const convertTo = ref('DER')
const convertResult = ref('')
const convertError = ref('')
const convertLoading = ref(false)

const history = ref<any[]>([])

const FORMAT_MAP: Record<string, string> = { PEM: 'PEM', DER: 'DER', PKCS7: 'P7B', PKCS12: 'PFX' }

watch(convertInput, (val) => {
  const wrapped = wrapCertPem(val)
  if (wrapped !== val) convertInput.value = wrapped
})

async function doConvert() {
  if (!convertInput.value.trim()) {
    convertResult.value = ''
    convertError.value = '请输入证书内容'
    return
  }
  convertError.value = ''
  convertLoading.value = true
  try {
    const res = await getOpenSSLService().convertFormat({
      input: convertInput.value,
      inputFormat: FORMAT_MAP[convertFrom.value] as any,
      outputFormat: FORMAT_MAP[convertTo.value] as any,
    })
    if (res.success) convertResult.value = res.data!
    else { convertResult.value = ''; convertError.value = res.error!.message }
  } catch (e: any) {
    convertResult.value = ''
    convertError.value = e.message
  } finally {
    convertLoading.value = false
  }
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">OpenSSL 工具</h3>
    </div>
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Command Builder -->
    <div v-if="activeTab === 'command-builder'" class="tab-content">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">分类</label>
          <select v-model="cmdCategory" class="form-select">
            <option v-for="cat in Object.keys(commandTemplates)" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">操作</label>
          <select v-model="cmdOperation" class="form-select">
            <option v-for="op in operations" :key="op" :value="op">{{ op }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">输入文件</label>
          <input v-model="cmdInputFile" class="form-input" placeholder="input.pem" />
        </div>
        <div class="form-group">
          <label class="form-label">输出文件</label>
          <input v-model="cmdOutputFile" class="form-input" placeholder="output.pem" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">生成命令</label>
        <div class="result-row">
          <textarea :value="generatedCommand" class="form-textarea result-area" readonly rows="3" />
          <CopyButton :text="generatedCommand" />
        </div>
      </div>
    </div>

    <!-- Cert Parse -->
    <div v-if="activeTab === 'cert-parse'" class="tab-content">
      <div class="form-group">
        <label class="form-label">粘贴证书内容 (PEM)</label>
        <textarea v-model="certInput" class="form-textarea" placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----" rows="6" />
      </div>
      <button class="btn btn-primary" @click="parseCert" :disabled="certLoading">{{ certLoading ? '解析中...' : '解析证书' }}</button>
      <ErrorBanner v-if="certParseError" :message="certParseError" @dismiss="certParseError=''" />
      <div v-if="certParsed" class="cert-result">
        <div class="cert-field">
          <span class="cert-label">主题 (Subject)</span>
          <span class="cert-value">{{ certParsed.subject.CN || '-' }}{{ certParsed.subject.O ? ' · ' + certParsed.subject.O : '' }}{{ certParsed.subject.C ? ' · ' + certParsed.subject.C : '' }}</span>
        </div>
        <div class="cert-field">
          <span class="cert-label">颁发者 (Issuer)</span>
          <span class="cert-value">{{ certParsed.issuer.CN || '-' }}{{ certParsed.issuer.O ? ' · ' + certParsed.issuer.O : '' }}{{ certParsed.issuer.C ? ' · ' + certParsed.issuer.C : '' }}</span>
        </div>
        <div class="cert-field">
          <span class="cert-label">序列号</span>
          <span class="cert-value mono">{{ certParsed.serialNumber }}</span>
          <CopyButton :text="certParsed.serialNumber" />
        </div>
        <div class="cert-field">
          <span class="cert-label">有效期</span>
          <span class="cert-value">{{ certParsed.notBefore }} ~ {{ certParsed.notAfter }}</span>
        </div>
        <div class="cert-field">
          <span class="cert-label">签名算法</span>
          <span class="cert-value">{{ certParsed.signatureAlgorithm }}</span>
        </div>
        <div class="cert-field">
          <span class="cert-label">公钥算法</span>
          <span class="cert-value">{{ certParsed.publicKeyAlgorithm }} ({{ certParsed.publicKeyBits }} bit)</span>
        </div>
        <div v-if="certParsed.san?.length" class="cert-field">
          <span class="cert-label">SAN</span>
          <span class="cert-value">{{ certParsed.san.join(', ') }}</span>
        </div>
        <div class="cert-field">
          <span class="cert-label">指纹 (SHA-256)</span>
          <span class="cert-value mono">{{ certParsed.fingerprint }}</span>
          <CopyButton :text="certParsed.fingerprint" />
        </div>
      </div>
    </div>

    <!-- CSR Generate -->
    <div v-if="activeTab === 'csr-generate'" class="tab-content">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">国家 (C)</label>
          <input v-model="csrCountry" class="form-input" placeholder="CN" />
        </div>
        <div class="form-group">
          <label class="form-label">省/州 (ST)</label>
          <input v-model="csrState" class="form-input" placeholder="Beijing" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">组织 (O)</label>
          <input v-model="csrOrg" class="form-input" placeholder="My Company" />
        </div>
        <div class="form-group">
          <label class="form-label">通用名 (CN)</label>
          <input v-model="csrCommonName" class="form-input" placeholder="example.com" />
        </div>
      </div>
      <button class="btn btn-primary" @click="generateCsrCommand">生成命令</button>
      <div v-if="csrResult" class="form-group">
        <label class="form-label">生成命令</label>
        <div class="result-row">
          <pre class="result-pre">{{ csrResult }}</pre>
          <CopyButton :text="csrResult" />
        </div>
      </div>
    </div>

    <!-- Format Convert -->
    <div v-if="activeTab === 'format-convert'" class="tab-content">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">源格式</label>
          <select v-model="convertFrom" class="form-select">
            <option value="PEM">PEM</option>
            <option value="DER">DER</option>
            <option value="PKCS7">PKCS7</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">目标格式</label>
          <select v-model="convertTo" class="form-select">
            <option value="DER">DER</option>
            <option value="PEM">PEM</option>
            <option value="PKCS7">PKCS7</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">输入内容</label>
        <textarea v-model="convertInput" class="form-textarea" placeholder="粘贴证书/密钥内容..." rows="6" />
      </div>
      <button class="btn btn-primary" @click="doConvert" :disabled="convertLoading">{{ convertLoading ? '转换中...' : '转换' }}</button>
      <ErrorBanner v-if="convertError" :message="convertError" @dismiss="convertError=''" />
      <div v-if="convertResult" class="form-group">
        <label class="form-label">转换结果</label>
        <div class="result-row">
          <textarea :value="convertResult" class="form-textarea result-area" readonly rows="6" />
          <CopyButton :text="convertResult" />
        </div>
      </div>
    </div>

    <HistorySection :records="history" @restore="(r: any) => { /* restore command from history */ }" @clear="history = []" />
  </ToolContainer>
</template>

<style scoped>

.tab-bar { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--border-card); padding-bottom: 8px; }
.tab-btn {
  padding: 6px 12px; border: none; background: none; color: var(--text-muted);
  font-size: 13px; cursor: pointer; border-radius: 4px 4px 0 0; transition: all 0.15s;
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--primary); font-weight: 600; border-bottom: 2px solid var(--primary); }
.tab-content { display: flex; flex-direction: column; gap: 12px; }

.btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }

.result-area { flex: 1; }
.result-pre {
  padding: 12px; background: var(--bg-code); border-radius: 6px;
  font-family: monospace; font-size: 12px; color: var(--text-primary);
  white-space: pre-wrap; word-break: break-all; margin: 0;
}

.cert-result {
  display: flex; flex-direction: column; gap: 8px;
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: 8px; padding: 14px 16px;
}
.cert-field {
  display: flex; align-items: flex-start; gap: 8px; font-size: 12px;
}
.cert-label {
  min-width: 110px; color: var(--text-muted); flex-shrink: 0; padding-top: 1px;
}
.cert-value { color: var(--text-primary); flex: 1; word-break: break-all; }
.cert-value.mono { font-family: 'Consolas', monospace; font-size: 11px; color: var(--text-link); }

</style>
