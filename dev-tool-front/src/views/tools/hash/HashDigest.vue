<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import CryptoJS from 'crypto-js'

const inputText = ref('')
const algorithm = ref('SHA-256')
const hmacKey = ref('')
const mainResult = ref('')
const expanded = ref(false)
const otherResults = ref<Record<string, string>>({})
const loading = ref(false)
const history = ref<string[]>([])
const MAX_HISTORY = 5

const ALL_ALGOS = [
  'MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512',
  'HMAC-SHA256', 'HMAC-SHA384', 'HMAC-SHA512', 'CRC32',
]

const isHmac = computed(() => algorithm.value.startsWith('HMAC-'))

// SHA algorithm name → crypto-js function name mapping
const SHA_FN: Record<string, string> = {
  'SHA-1': 'SHA1',
  'SHA-256': 'SHA256',
  'SHA-384': 'SHA384',
  'SHA-512': 'SHA512',
}

// CRC32 lookup table
const crc32Table = (() => {
  const table: number[] = []
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1)
    }
    table.push(crc >>> 0)
  }
  return table
})()

function computeCRC32(text: string): string {
  if (!text) return ''
  const data = new TextEncoder().encode(text)
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xFF]
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0')
}

function computeSingle(algo: string, text: string, key: string): string {
  if (!text) return ''
  if (algo === 'CRC32') return computeCRC32(text)
  if (algo === 'MD5') return CryptoJS.MD5(text).toString()

  if (algo.startsWith('HMAC-')) {
    const hmacFnName = 'Hmac' + algo.replace('HMAC-', '') // e.g. 'HmacSHA256'
    const fn = (CryptoJS as any)[hmacFnName]
    if (!fn) return ''
    return fn(text, key || '').toString()
  }

  // SHA algorithms via crypto-js
  const fnName = SHA_FN[algo]
  if (!fnName) return ''
  const fn = (CryptoJS as any)[fnName]
  if (!fn) return ''
  return fn(text).toString()
}

async function compute() {
  if (!inputText.value.trim()) {
    mainResult.value = ''
    return
  }
  loading.value = true
  try {
    const result = computeSingle(algorithm.value, inputText.value, hmacKey.value)
    mainResult.value = result
    addHistory(algorithm.value, inputText.value, result)

    const otherAlgos = ALL_ALGOS.filter(a => a !== algorithm.value)
    const entries = otherAlgos.map(algo => {
      try {
        return [algo, computeSingle(algo, inputText.value, hmacKey.value)] as const
      } catch {
        return [algo, '计算失败'] as const
      }
    })
    otherResults.value = Object.fromEntries(entries)
  } catch (e: any) {
    mainResult.value = '计算失败: ' + e.message
  } finally {
    loading.value = false
  }
}

function addHistory(algo: string, input: string, hash: string) {
  const preview = input.length > 12 ? input.substring(0, 12) + '...' : input
  const hashPreview = hash.length > 8 ? hash.substring(0, 8) + '...' : hash
  history.value.unshift(`${algo} • "${preview}" → ${hashPreview}`)
  if (history.value.length > MAX_HISTORY) history.value.pop()
}

function clearHistory() {
  history.value = []
}
</script>

<template>
  <ToolContainer>
    <div class="options-panel">
      <div class="option-group">
        <span class="option-label">算法</span>
        <select class="option-select" v-model="algorithm">
          <option v-for="algo in ALL_ALGOS" :key="algo" :value="algo">{{ algo }}</option>
        </select>
      </div>
    </div>

    <!-- HMAC key input -->
    <div v-if="isHmac" class="key-row">
      <span class="key-label">Secret Key</span>
      <input class="hmac-key-input" v-model="hmacKey" placeholder="输入 HMAC 密钥" />
    </div>

    <!-- Input editor -->
    <div class="editor-header">
      <span class="editor-title">输入（文本）</span>
    </div>
    <div class="editor-body">
      <textarea class="editor-textarea" v-model="inputText" placeholder="输入要计算哈希的文本..."></textarea>
    </div>

    <!-- Compute button -->
    <div style="display:flex;justify-content:center;padding:8px 0;">
      <button class="btn-primary" @click="compute" :disabled="loading">{{ loading ? '计算中...' : '计算' }}</button>
    </div>

    <!-- Main result card -->
    <div v-if="mainResult" class="result-card">
      <div class="result-card-header">
        <div class="result-algo-label">
          {{ algorithm }}
          <span class="tag tag-blue">{{ mainResult.length }} 字符</span>
        </div>
        <CopyButton :text="mainResult" />
      </div>
      <div class="result-hash-value">{{ mainResult }}</div>
    </div>

    <!-- Expand other results -->
    <div v-if="mainResult" class="expand-link" @click="expanded = !expanded">
      <span>{{ expanded ? '收起其他算法结果 ▴' : '查看其他算法结果 ▾' }}</span>
      <span class="expand-arrow" :class="{ open: expanded }">&#9662;</span>
    </div>

    <!-- Other algorithm results grid -->
    <div v-if="expanded && mainResult" class="other-results">
      <div class="other-results-grid">
        <div v-for="algo in ALL_ALGOS.filter(a => a !== algorithm)" :key="algo" class="other-result-item">
          <div class="other-result-header">
            <span class="other-result-algo">{{ algo }}</span>
            <CopyButton :text="otherResults[algo] || ''" />
          </div>
          <div class="other-result-value">{{ otherResults[algo] || '计算中...' }}</div>
        </div>
      </div>
    </div>

    <!-- History -->
    <div v-if="history.length" class="history-section">
      <div class="history-header">
        <span class="history-title">历史记录（最近 {{ MAX_HISTORY }} 条）</span>
        <span class="history-clear" @click="clearHistory">清空</span>
      </div>
      <div class="history-items">
        <div v-for="(item, idx) in history" :key="idx" class="history-item">{{ item }}</div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.hmac-key-input {
  flex: 1;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border-input);
  padding: 0 10px;
  font-size: 12px;
  font-family: 'Consolas', monospace;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
}
.hmac-key-input:focus { border-color: var(--primary); }

.result-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.result-algo-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.result-hash-value {
  font-size: 12px;
  font-family: 'Consolas', monospace;
  color: var(--text-link);
  word-break: break-all;
  line-height: 1.6;
  padding: 8px 12px;
  background: var(--bg-code);
  border-radius: 6px;
}

.expand-link {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-link);
  cursor: pointer;
  user-select: none;
}
.expand-link:hover { text-decoration: underline; }
.expand-arrow {
  font-size: 10px;
  transition: transform 0.2s;
  display: inline-block;
}
.expand-arrow.open { transform: rotate(180deg); }

.other-results { margin-top: 12px; }
.other-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.other-result-item {
  background: var(--bg-code);
  border: 1px solid var(--border-card);
  border-radius: 6px;
  padding: 10px 12px;
}
.other-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.other-result-algo {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}
.other-result-value {
  font-size: 11px;
  font-family: 'Consolas', monospace;
  color: var(--text-link);
  word-break: break-all;
  line-height: 1.5;
}
</style>
