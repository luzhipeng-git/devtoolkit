<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const hexInput = ref('#3b82f6')
const r = ref(59), g = ref(130), b = ref(246)
const h = ref(217), s = ref(91), l = ref(60)
const error = ref('')

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) throw new Error('无效的HEX颜色')
  return { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hh = 0, ss = 0
  const ll = (max + min) / 2
  if (max !== min) {
    const d = max - min
    ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: hh = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: hh = ((b - r) / d + 2) / 6; break
      case b: hh = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(hh * 360), s: Math.round(ss * 100), l: Math.round(ll * 100) }
}

function updateFromHex() {
  try {
    error.value = ''
    const rgb = hexToRgb(hexInput.value)
    r.value = rgb.r; g.value = rgb.g; b.value = rgb.b
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    h.value = hsl.h; s.value = hsl.s; l.value = hsl.l
  } catch (e: any) { error.value = e.message }
}

watch(hexInput, updateFromHex, { immediate: true })
</script>

<template>
  <ToolContainer>
    <div class="editor-header"><span class="editor-title">颜色输入</span></div>
    <div class="color-input-row">
      <div class="color-preview" :style="{ background: hexInput }"></div>
      <input class="color-text-input" v-model="hexInput" placeholder="#3b82f6" />
      <input type="color" class="color-picker" v-model="hexInput" />
    </div>
    <div v-if="error" style="color:#dc2626;font-size:12px;margin-top:4px;">{{ error }}</div>
    <div style="margin-top:16px;">
      <div class="result-card">
        <div class="result-label">HEX</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="result-value">{{ hexInput }}</span>
          <CopyButton :text="hexInput" />
        </div>
      </div>
      <div class="result-card">
        <div class="result-label">RGB</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="result-value">rgb({{ r }}, {{ g }}, {{ b }})</span>
          <CopyButton :text="`rgb(${r}, ${g}, ${b})`" />
        </div>
      </div>
      <div class="result-card">
        <div class="result-label">HSL</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="result-value">hsl({{ h }}, {{ s }}%, {{ l }}%)</span>
          <CopyButton :text="`hsl(${h}, ${s}%, ${l}%)`" />
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.color-input-row{display:flex;gap:10px;align-items:center}
.color-preview{width:40px;height:40px;border-radius:8px;border:1px solid var(--border-card);flex-shrink:0}
.color-text-input{flex:1;padding:10px 12px;border:1px solid var(--border-input);border-radius:6px;font-family:'Consolas',monospace;font-size:14px;color:var(--text-primary);outline:none}
.color-text-input:focus{border-color:var(--primary)}
.color-picker{width:40px;height:40px;border:none;padding:0;cursor:pointer;border-radius:6px;background:none}

</style>
