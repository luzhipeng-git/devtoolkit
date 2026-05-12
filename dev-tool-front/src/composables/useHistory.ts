import { computed } from 'vue'
import { useHistoryStore } from '@/stores/history'
import type { HistoryRecord } from '@/types/history'

export function useHistory(toolId: string) {
  const historyStore = useHistoryStore()

  const records = computed(() => historyStore.getRecords(toolId))

  function addRecord(input: string, output: string, mode?: string) {
    historyStore.addRecord({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      toolId,
      input: input.slice(0, 500),
      output: output.slice(0, 500),
      mode,
      timestamp: Date.now(),
    })
  }

  function clearHistory() {
    historyStore.clearRecords(toolId)
  }

  return { records, addRecord, clearHistory }
}
