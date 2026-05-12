<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { useClipboard } from '@/composables/useClipboard'
import jsQR from 'jsqr'

const { copyWithFeedback } = useClipboard()

const parsedResult = ref('')
const errorMessage = ref('')
const loading = ref(false)
const isDragging = ref(false)
const previewUrl = ref('')
const imageMeta = ref('')

function decodeQR(img: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) { showError('Canvas 不可用'); return }
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  if (code) {
    parsedResult.value = code.data
    errorMessage.value = ''
    imageMeta.value = `图片尺寸: ${canvas.width}x${canvas.height} | 二维码格式: QR_CODE`
  } else {
    parsedResult.value = ''
    showError('未检测到有效的二维码')
  }
}

function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    showError('不支持的图片格式，请上传 PNG / JPG / BMP / GIF 文件')
    return
  }
  hideAllStates()
  loading.value = true
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      previewUrl.value = e.target?.result as string
      setTimeout(() => {
        decodeQR(img)
        loading.value = false
      }, 200)
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) processFile(file)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) processFile(file)
      break
    }
  }
}

function showError(msg: string) {
  errorMessage.value = msg
  parsedResult.value = ''
}

function hideAllStates() {
  errorMessage.value = ''
  parsedResult.value = ''
  previewUrl.value = ''
  imageMeta.value = ''
}

function resetState() {
  hideAllStates()
  loading.value = false
}

function copyResult() {
  if (parsedResult.value) copyWithFeedback(parsedResult.value)
}
</script>

<template>
  <ToolContainer>
    <!-- Upload Drop Zone -->
    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragging, 'has-image': !!previewUrl }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @paste="handlePaste"
    >
      <template v-if="previewUrl">
        <img :src="previewUrl" alt="Preview" class="upload-thumb" />
      </template>
      <template v-else>
        <div class="drop-zone-icon">&#128228;</div>
        <div class="drop-zone-main-text">拖拽二维码图片到此处</div>
        <div class="drop-zone-sub-text" @click.stop="($refs.fileInput as HTMLInputElement)?.click()">或点击选择文件</div>
        <div class="drop-zone-info">支持 Ctrl+V 粘贴截图 | PNG / JPG / BMP / GIF</div>
      </template>
      <input ref="fileInput" type="file" accept=".png,.jpg,.jpeg,.bmp,.gif,image/*" class="file-input-hidden" @change="handleFileSelect" />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <span style="font-size:13px;color:var(--text-muted);">正在解析...</span>
    </div>

    <!-- Error State -->
    <div v-if="errorMessage" class="error-msg-box">
      {{ errorMessage }}
      <button class="btn-outline" style="margin-left:8px;" @click="resetState">重新上传</button>
    </div>

    <!-- Result Section -->
    <div v-if="parsedResult" class="parse-result-layout">
      <div class="parse-image-preview">
        <img v-if="previewUrl" :src="previewUrl" alt="Preview" />
        <span v-else style="font-size:12px;color:var(--text-placeholder);">图片预览</span>
      </div>
      <div class="parse-result-content">
        <div class="parse-result-label">解析结果</div>
        <div class="parse-result-box">
          <div class="parse-result-text">{{ parsedResult }}</div>
        </div>
        <div class="parse-result-actions">
          <button class="btn-outline" @click="copyResult">复制内容</button>
          <button class="btn-outline" @click="resetState">重新上传</button>
        </div>
        <div class="parse-meta">{{ imageMeta }}</div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.drop-zone {
  width: 100%; max-width: 520px; height: 220px;
  border: 2px dashed var(--border-input); border-radius: 12px;
  background: var(--bg-code);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; cursor: pointer; transition: all 0.15s; margin: 0 auto 20px;
  position: relative;
}
.drop-zone:hover, .drop-zone.drag-over {
  border-color: var(--primary); background: rgba(59,130,246,0.05);
}
.drop-zone.has-image { border-style: solid; cursor: default; padding: 12px; }
.drop-zone-icon { font-size: 36px; color: var(--text-placeholder); margin-bottom: 4px; }
.drop-zone-main-text { font-size: 14px; color: var(--text-secondary); font-weight: 500; }
.drop-zone-sub-text { font-size: 13px; color: var(--primary); cursor: pointer; }
.drop-zone-info { font-size: 11px; color: var(--text-placeholder); margin-top: 4px; }
.file-input-hidden { display: none; }
.upload-thumb {
  max-width: 100%; max-height: 180px; border-radius: 6px;
  object-fit: contain; display: block;
}
.loading-state {
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.spinner {
  width: 28px; height: 28px; border: 3px solid var(--border-light);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin 0.7s linear infinite; margin-right: 10px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-msg-box {
  background: #fef2f2; color: #dc2626; border-radius: 8px; padding: 16px;
  text-align: center; font-size: 13px; display: flex; align-items: center; justify-content: center;
}
.parse-result-layout { display: flex; gap: 24px; align-items: flex-start; }
.parse-image-preview {
  width: 200px; height: 200px;
  border: 1px solid var(--border-card); border-radius: 8px;
  background: var(--bg-code); display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; overflow: hidden;
}
.parse-image-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
.parse-result-content { flex: 1; min-width: 0; }
.parse-result-label { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
.parse-result-box {
  background: var(--bg-code); border: 1px solid var(--border-card); border-radius: 8px;
  padding: 12px 16px; margin-bottom: 12px;
}
.parse-result-text {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px; color: var(--accent-blue, #2563eb); line-height: 1.6; word-break: break-all;
  white-space: pre-wrap;
}
.parse-result-actions { display: flex; gap: 8px; }
.parse-meta { font-size: 12px; color: var(--text-muted); margin-top: 8px; }
</style>
