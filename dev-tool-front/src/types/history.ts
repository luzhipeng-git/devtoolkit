export interface HistoryRecord {
  id: string
  toolId: string
  input: string
  output: string
  mode?: string
  timestamp: number
}
