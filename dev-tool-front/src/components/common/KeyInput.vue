<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  showGenerate?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  generate: []
}>()

const visible = ref(false)
</script>

<template>
  <div class="key-input-wrap">
    <input
      class="key-input"
      :class="{ masked: !visible }"
      :value="modelValue"
      :placeholder="placeholder || '请输入密钥'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <div class="key-actions">
      <button class="icon-btn" @click="visible = !visible" :title="visible ? '隐藏' : '显示'">
        {{ visible ? '🙈' : '👁' }}
      </button>
      <button
        v-if="showGenerate"
        class="btn-generate"
        @click="emit('generate')"
      >
        随机生成
      </button>
    </div>
  </div>
</template>

<style scoped>
.key-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.key-input {
  flex: 1;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  padding: 0 80px 0 10px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
}
.key-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
.key-input.masked {
  -webkit-text-security: disc;
}
.key-actions {
  position: absolute;
  right: 4px;
  display: flex;
  gap: 2px;
  align-items: center;
}
.icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.icon-btn:hover {
  background: var(--bg-hover);
}
.btn-generate {
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--bg-white);
  color: var(--text-muted);
  font-size: 11px;
  border: 1px solid var(--border-input);
  cursor: pointer;
  white-space: nowrap;
}
.btn-generate:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
}
</style>
