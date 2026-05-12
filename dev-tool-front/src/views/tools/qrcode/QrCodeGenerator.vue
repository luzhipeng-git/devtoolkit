<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import QRCode from 'qrcode'

const inputText = ref('')
const qrSize = ref(256)
const qrMargin = ref(4)
const qrFormat = ref<'PNG' | 'SVG'>('PNG')
const errorCorrection = ref<'L' | 'M' | 'Q' | 'H'>('M')
const qrDataUrl = ref('')
const qrSvg = ref('')
const errorMessage = ref('')
const loading = ref(false)

const charCount = computed(() => inputText.value.length)

const errorLevels = [
  { value: 'L' as const, label: 'L (低 ~7%)' },
  { value: 'M' as const, label: 'M (中 ~15%)' },
  { value: 'Q' as const, label: 'Q (较高 ~25%)' },
  { value: 'H' as const, label: 'H (高 ~30%)' },
]

const hasQR = computed(() => !!qrDataUrl.value || !!qrSvg.value)

async function generateQR() {
  if (!inputText.value.trim()) {
    qrDataUrl.value = ''
    qrSvg.value = ''
    errorMessage.value = ''
    return
  }
  loading.value = true
  try {
    errorMessage.value = ''
    if (qrFormat.value === 'SVG') {
      qrSvg.value = await QRCode.toString(inputText.value, {
        type: 'svg',
        width: qrSize.value,
        margin: qrMargin.value,
        errorCorrectionLevel: errorCorrection.value,
      })
      qrDataUrl.value = ''
    } else {
      qrDataUrl.value = await QRCode.toDataURL(inputText.value, {
        width: qrSize.value,
        margin: qrMargin.value,
        errorCorrectionLevel: errorCorrection.value,
      })
      qrSvg.value = ''
    }
  } catch (e: any) {
    errorMessage.value = inputText.value.length > 2953
      ? '内容过长，无法生成二维码，请缩短内容或提高容错级别'
      : (e.message || '生成失败')
    qrDataUrl.value = ''
    qrSvg.value = ''
  } finally {
    loading.value = false
  }
}

function downloadQR() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const filename = `qrcode_${timestamp}`

  if (qrFormat.value === 'SVG' && qrSvg.value) {
    const blob = new Blob([qrSvg.value], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${filename}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  } else if (qrDataUrl.value) {
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = qrDataUrl.value
    link.click()
  }
}

let debounceTimer: ReturnType<typeof setTimeout>
watch([inputText, qrSize, qrMargin, qrFormat, errorCorrection], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(generateQR, 300)
})
</script>

<template>
  <ToolContainer>
    <div class="qr-layout">
      <div class="qr-input-panel">
        <div style="margin-bottom:8px;">
          <label class="qr-option-label" style="display:block;margin-bottom:6px;">内容</label>
          <textarea
            v-model="inputText"
            class="qr-textarea"
            placeholder="输入文本或 URL，如 https://example.com"
          />
          <div class="char-count">{{ charCount }} 字符</div>
        </div>
        <div class="qr-options">
          <div class="qr-option-item">
            <span class="qr-option-label">容错级别</span>
            <select v-model="errorCorrection" class="qr-option-select">
              <option v-for="level in errorLevels" :key="level.value" :value="level.value">{{ level.label }}</option>
            </select>
          </div>
          <div class="qr-option-item">
            <span class="qr-option-label">尺寸 (px)</span>
            <input v-model.number="qrSize" type="number" class="qr-option-input" min="64" max="1024" step="32" />
          </div>
          <div class="qr-option-item">
            <span class="qr-option-label">边距 (模块)</span>
            <input v-model.number="qrMargin" type="number" class="qr-option-input" min="0" max="50" step="1" />
          </div>
          <div class="qr-option-item">
            <span class="qr-option-label">格式</span>
            <select v-model="qrFormat" class="qr-option-select">
              <option value="PNG">PNG</option>
              <option value="SVG">SVG</option>
            </select>
          </div>
        </div>
      </div>
      <div class="qr-output-panel">
        <div class="qr-preview" :class="{ 'has-image': hasQR }">
          <template v-if="loading">
            <div class="qr-preview-loading"><div class="spinner" /></div>
          </template>
          <template v-else-if="errorMessage">
            <div style="color:#dc2626;font-size:12px;text-align:center;padding:12px;">{{ errorMessage }}</div>
          </template>
          <template v-else-if="qrFormat === 'SVG' && qrSvg">
            <div v-html="qrSvg" />
          </template>
          <template v-else-if="qrDataUrl">
            <img :src="qrDataUrl" alt="QR Code" />
          </template>
          <template v-else>
            <div class="qr-preview-icon">&#9638;</div>
            <div class="qr-preview-text">输入内容后实时预览</div>
          </template>
        </div>
        <button class="btn-download" :disabled="!hasQR" @click="downloadQR">下载 {{ qrFormat }}</button>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.qr-layout { display: flex; gap: 20px; margin-top: 16px; }
.qr-input-panel { flex: 1; min-width: 0; }
.qr-output-panel {
  width: 280px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.qr-textarea {
  width: 100%; height: 100px; border-radius: 6px;
  border: 1px solid var(--border-input); padding: 10px 12px;
  font-size: 13px; color: var(--text-primary); background: var(--bg-white);
  outline: none; resize: vertical; line-height: 1.6;
}
.qr-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
.qr-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin-top: 12px; }
.qr-option-item { display: flex; flex-direction: column; gap: 4px; }
.qr-option-label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.qr-option-select {
  height: 32px; border-radius: 6px; border: 1px solid var(--border-input);
  padding: 0 10px; font-size: 13px; color: var(--text-primary);
  background: var(--bg-white); outline: none;
}
.qr-option-select:focus { border-color: var(--primary); }
.qr-option-input {
  height: 32px; border-radius: 6px; border: 1px solid var(--border-input);
  padding: 0 10px; font-size: 13px; color: var(--text-primary);
  background: var(--bg-white); outline: none; width: 100%;
}
.qr-option-input:focus { border-color: var(--primary); }
.qr-preview {
  width: 240px; height: 240px;
  border: 2px dashed var(--border-input); border-radius: 8px;
  background: var(--bg-code);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--text-placeholder); position: relative; overflow: hidden;
}
.qr-preview.has-image { border-style: solid; border-color: var(--border-card); }
.qr-preview canvas, .qr-preview img, .qr-preview svg { max-width: 100%; max-height: 100%; display: block; }
.qr-preview-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.5; }
.qr-preview-text { font-size: 12px; }
.qr-preview-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.8);
}
.spinner {
  width: 28px; height: 28px; border: 3px solid var(--border-light);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.btn-download {
  width: 100%; padding: 8px 16px; border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover, #2563eb));
  color: white; font-size: 13px; font-weight: 500;
  border: none; cursor: pointer; transition: opacity 0.15s;
}
.btn-download:hover { opacity: 0.9; }
.btn-download:disabled { opacity: 0.5; cursor: not-allowed; }
.char-count { font-size: 10px; color: var(--text-disabled); margin-top: 4px; text-align: right; }
</style>
