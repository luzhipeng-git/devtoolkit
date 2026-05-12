<script setup lang="ts">
import { computed } from 'vue'
import * as icons from '@vicons/ionicons5'

const props = defineProps<{ name: string }>()

function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

const iconComponent = computed(() => {
  const pascalName = kebabToPascal(props.name)
  return (icons as any)[pascalName] ?? null
})
</script>

<template>
  <component :is="iconComponent" v-if="iconComponent" class="app-icon" />
  <span v-else class="app-icon-fallback">{{ name.charAt(0) }}</span>
</template>

<style scoped>
.app-icon {
  width: 1em;
  height: 1em;
}
.app-icon-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}
</style>
