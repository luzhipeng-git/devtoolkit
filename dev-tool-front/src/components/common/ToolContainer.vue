<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="tool-page">
    <div class="tool-card">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  padding: var(--content-padding);
  height: 100%;
  overflow-y: auto;
}
</style>
