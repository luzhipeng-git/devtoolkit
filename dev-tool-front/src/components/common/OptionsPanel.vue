<script setup lang="ts">
interface OptionItem {
  key: string
  label: string
  type: 'select' | 'input' | 'toggle'
  options?: { value: string; label: string }[]
  modelValue: any
}

defineProps<{
  options: OptionItem[]
}>()

const emit = defineEmits<{
  'update:option': [key: string, value: any]
}>()
</script>

<template>
  <div class="options-panel">
    <div v-for="opt in options" :key="opt.key" class="option-group">
      <span class="option-label">{{ opt.label }}</span>
      <select
        v-if="opt.type === 'select'"
        class="option-select"
        :value="opt.modelValue"
        @change="emit('update:option', opt.key, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="o in opt.options" :key="o.value" :value="o.value">
          {{ o.label }}
        </option>
      </select>
      <input
        v-else-if="opt.type === 'input'"
        class="option-input"
        :value="opt.modelValue"
        @input="emit('update:option', opt.key, ($event.target as HTMLInputElement).value)"
      />
      <label v-else-if="opt.type === 'toggle'" class="option-toggle">
        <span
          class="toggle-switch"
          :class="{ active: opt.modelValue }"
          @click.prevent="emit('update:option', opt.key, !opt.modelValue)"
        ></span>
        <span class="toggle-text">{{ opt.options?.[0]?.label ?? '' }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.option-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.toggle-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
