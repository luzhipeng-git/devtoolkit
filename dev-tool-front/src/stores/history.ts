import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HistoryRecord } from '@/types/history'

export const useHistoryStore = defineStore('history', () => {
  const recordsByTool = ref<Map<string, HistoryRecord[]>>(new Map())

  function getRecords(toolId: string): HistoryRecord[] {
    return recordsByTool.value.get(toolId) || []
  }

  function addRecord(record: HistoryRecord) {
    const list = recordsByTool.value.get(record.toolId) || []
    list.unshift(record)
    if (list.length > 20) {
      list.splice(20)
    }
    recordsByTool.value.set(record.toolId, list)
  }

  function clearRecords(toolId: string) {
    recordsByTool.value.delete(toolId)
  }

  return { recordsByTool, getRecords, addRecord, clearRecords }
})
