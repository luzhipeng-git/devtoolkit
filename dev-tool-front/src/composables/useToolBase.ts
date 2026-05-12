import { ref, watch, nextTick } from 'vue'
import { useHistoryStore } from '@/stores/history'

interface UseToolBaseOptions {
  toolId: string
  debounceMs?: number
}

export function useToolBase(options: UseToolBaseOptions) {
  const input = ref('')
  const output = ref('')
  const mode = ref('encode')  // or 'encrypt', etc.
  const error = ref<string | null>(null)
  const loading = ref(false)
  const isSwapping = ref(false)

  const historyStore = useHistoryStore()

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const debounceMs = options.debounceMs ?? 300

  function swap() {
    isSwapping.value = true
    const temp = input.value
    input.value = output.value
    output.value = temp
    // Toggle mode
    if (mode.value === 'encode') mode.value = 'decode'
    else if (mode.value === 'decode') mode.value = 'encode'
    else if (mode.value === 'encrypt') mode.value = 'decrypt'
    else if (mode.value === 'decrypt') mode.value = 'encrypt'
    nextTick(() => { isSwapping.value = false })
  }

  function clear() {
    input.value = ''
    output.value = ''
    error.value = null
  }

  function addHistory() {
    if (!input.value && !output.value) return
    historyStore.addRecord({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      toolId: options.toolId,
      input: input.value.slice(0, 500),
      output: output.value.slice(0, 500),
      mode: mode.value,
      timestamp: Date.now(),
    })
  }

  function restoreFromHistory(record: { input: string; output: string; mode?: string }) {
    input.value = record.input
    output.value = record.output
    if (record.mode) mode.value = record.mode
  }

  function debouncedProcess(processFn: () => void) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      processFn()
    }, debounceMs)
  }

  return {
    input,
    output,
    mode,
    error,
    loading,
    isSwapping,
    swap,
    clear,
    addHistory,
    restoreFromHistory,
    debouncedProcess,
    history: historyStore.getRecords(options.toolId),
    clearHistory: () => historyStore.clearRecords(options.toolId),
  }
}
