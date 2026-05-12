<script setup lang="ts">
import type { HistoryRecord } from '@/types/history'

defineProps<{
  records: HistoryRecord[]
}>()

const emit = defineEmits<{
  restore: [record: HistoryRecord]
  clear: []
}>()
</script>

<template>
  <div v-if="records.length > 0" class="history-section">
    <div class="history-header">
      <span class="history-title">历史记录（最近 {{ records.length }} 条）</span>
      <span class="history-clear" @click="emit('clear')">清空</span>
    </div>
    <div class="history-items">
      <div
        v-for="record in records"
        :key="record.id"
        class="history-item"
        @click="emit('restore', record)"
      >
        <span class="history-item-input">{{ record.input.slice(0, 30) }}{{ record.input.length > 30 ? '...' : '' }}</span>
        <span class="history-item-time">{{ new Date(record.timestamp).toLocaleTimeString() }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-item-input {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}
.history-item-time {
  font-size: 11px;
  color: var(--text-placeholder);
  white-space: nowrap;
}
</style>
