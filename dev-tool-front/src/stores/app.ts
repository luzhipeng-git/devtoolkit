import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useAppStore = defineStore('app', () => {
  const themeMode = ref<ThemeMode>(
    (localStorage.getItem('dt-theme') as ThemeMode) || 'light'
  )
  const sidebarCollapsed = ref(false)
  const currentToolId = ref<string | null>(null)
  const globalLoading = ref(false)
  const searchOpen = ref(false)

  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode
    localStorage.setItem('dt-theme', mode)
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleSearch() {
    searchOpen.value = !searchOpen.value
  }

  function setCurrentTool(toolId: string | null) {
    currentToolId.value = toolId
  }

  return {
    themeMode,
    sidebarCollapsed,
    currentToolId,
    globalLoading,
    searchOpen,
    setThemeMode,
    toggleSidebar,
    toggleSearch,
    setCurrentTool,
  }
})
