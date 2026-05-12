<script setup lang="ts">
const props = defineProps<{
  tabs: { key: string; label: string }[]
  activeTab: string
}>()

const emit = defineEmits<{
  'update:activeTab': [value: string]
}>()

function switchTab(key: string) {
  if (key === props.activeTab) return
  emit('update:activeTab', key)
}
</script>

<template>
  <div class="tool-header">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tool-tab"
      :class="{ active: tab.key === activeTab }"
      @click="switchTab(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
