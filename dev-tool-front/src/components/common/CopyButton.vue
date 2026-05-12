<script setup lang="ts">
import { ref } from 'vue'
import { useClipboard } from '@/composables/useClipboard'

const props = defineProps<{
  text: string
  label?: string
}>()

const { copy } = useClipboard()
const copied = ref(false)

async function handleCopy() {
  const ok = await copy(props.text)
  if (ok) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1200)
  }
}
</script>

<template>
  <button
    class="btn-outline"
    :class="{ 'btn-copied': copied }"
    @click="handleCopy"
  >
    {{ copied ? '已复制' : (label || '复制') }}
  </button>
</template>

<style scoped>
.btn-copied {
  background: #16a34a !important;
  color: white !important;
  border-color: #16a34a !important;
}
</style>
