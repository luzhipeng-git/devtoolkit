import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ToolDefinition, CategoryDefinition, ToolCategory } from '@/types/tool'

export const useToolRegistryStore = defineStore('tool-registry', () => {
  const tools = ref<ToolDefinition[]>([])
  const favorites = ref<string[]>(JSON.parse(localStorage.getItem('dt-favorites') || '[]'))
  const recentTools = ref<string[]>(JSON.parse(localStorage.getItem('dt-recent') || '[]'))

  const categories = ref<CategoryDefinition[]>([
    { id: 'encoding', name: '字符编码', icon: '', order: 1 },
    { id: 'json', name: 'JSON 工具', icon: '', order: 2 },
    { id: 'crypto', name: '加密解密', icon: '', order: 3 },
    { id: 'calculator', name: '数字计算', icon: '', order: 4 },
    { id: 'qrcode', name: '二维码', icon: '', order: 5 },
    { id: 'http', name: 'HTTP Client', icon: '', order: 6 },
    { id: 'time', name: '时间计算', icon: '', order: 7 },
    { id: 'cron', name: 'Cron', icon: '', order: 8 },
    { id: 'regex', name: '正则调试', icon: '', order: 9 },
    { id: 'grok', name: 'Grok', icon: '', order: 10 },
    { id: 'nginx', name: 'Nginx', icon: '', order: 11 },
    { id: 'config', name: '配置转换', icon: '', order: 12 },
    { id: 'codec', name: '编码解码', icon: '', order: 13 },
  ])

  const toolsByCategory = computed(() => {
    const map = new Map<ToolCategory, ToolDefinition[]>()
    for (const tool of tools.value) {
      if (!map.has(tool.category)) {
        map.set(tool.category, [])
      }
      map.get(tool.category)!.push(tool)
    }
    return map
  })

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => a.order - b.order)
  )

  function registerTool(tool: ToolDefinition) {
    if (!tools.value.find(t => t.id === tool.id)) {
      tools.value.push(tool)
    }
  }

  function registerTools(toolList: ToolDefinition[]) {
    for (const tool of toolList) {
      registerTool(tool)
    }
  }

  function getToolById(id: string): ToolDefinition | undefined {
    return tools.value.find(t => t.id === id)
  }

  function searchTools(query: string): Map<ToolCategory, ToolDefinition[]> {
    const q = query.toLowerCase().trim()
    const result = new Map<ToolCategory, ToolDefinition[]>()
    if (!q) {
      return toolsByCategory.value
    }
    for (const tool of tools.value) {
      const matches =
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.keywords.some(k => k.toLowerCase().includes(q)) ||
        categories.value.find(c => c.id === tool.category)?.name.toLowerCase().includes(q)
      if (matches) {
        if (!result.has(tool.category)) {
          result.set(tool.category, [])
        }
        result.get(tool.category)!.push(tool)
      }
    }
    return result
  }

  function toggleFavorite(toolId: string) {
    const idx = favorites.value.indexOf(toolId)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push(toolId)
    }
    localStorage.setItem('dt-favorites', JSON.stringify(favorites.value))
  }

  function isFavorite(toolId: string): boolean {
    return favorites.value.includes(toolId)
  }

  function addRecent(toolId: string) {
    const idx = recentTools.value.indexOf(toolId)
    if (idx >= 0) {
      recentTools.value.splice(idx, 1)
    }
    recentTools.value.unshift(toolId)
    if (recentTools.value.length > 10) {
      recentTools.value = recentTools.value.slice(0, 10)
    }
    localStorage.setItem('dt-recent', JSON.stringify(recentTools.value))
  }

  return {
    tools,
    categories,
    favorites,
    recentTools,
    toolsByCategory,
    sortedCategories,
    registerTool,
    registerTools,
    getToolById,
    searchTools,
    toggleFavorite,
    isFavorite,
    addRecent,
  }
})
