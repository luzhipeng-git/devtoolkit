<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useToolRegistryStore } from '@/stores/tool-registry'

const route = useRoute()
const toolStore = useToolRegistryStore()

const currentTool = computed(() => {
  const toolId = route.meta.toolId as string | undefined
  if (!toolId) return null
  return toolStore.getToolById(toolId) ?? null
})

const categoryName = computed(() => {
  if (!currentTool.value) return ''
  const cat = toolStore.categories.find(
    (c) => c.id === currentTool.value!.category,
  )
  return cat?.name ?? ''
})
</script>

<template>
  <div v-if="currentTool" class="breadcrumb">
    <span class="breadcrumb-category">{{ categoryName }}</span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-current">{{ currentTool.name }}</span>
  </div>
</template>
