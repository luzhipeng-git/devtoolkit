export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  keywords: string[]
  route: string
  component: () => Promise<any>
}

export type ToolCategory =
  | 'encoding'
  | 'json'
  | 'crypto'
  | 'calculator'
  | 'qrcode'
  | 'http'
  | 'time'
  | 'cron'
  | 'regex'
  | 'grok'
  | 'nginx'
  | 'config'
  | 'codec'

export interface CategoryDefinition {
  id: ToolCategory
  name: string
  icon: string
  order: number
}
