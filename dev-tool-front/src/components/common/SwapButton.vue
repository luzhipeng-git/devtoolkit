<script setup lang="ts">
const emit = defineEmits<{
  swap: []
}>()
</script>

<template>
  <div class="swap-btn-container">
    <button class="swap-btn" @click="emit('swap')">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M4 6L8 2L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 10L8 14L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      交换
    </button>
  </div>
</template>
