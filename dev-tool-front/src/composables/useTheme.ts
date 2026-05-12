import { computed } from 'vue'
import { useAppStore, type ThemeMode } from '@/stores/app'

export function useTheme() {
  const appStore = useAppStore()

  const isDark = computed(() => {
    if (appStore.themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return appStore.themeMode === 'dark'
  })

  function applyTheme() {
    const html = document.documentElement
    if (isDark.value) {
      html.setAttribute('data-theme', 'dark')
    } else {
      html.setAttribute('data-theme', 'light')
    }
  }

  function setTheme(mode: ThemeMode) {
    appStore.setThemeMode(mode)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { isDark, setTheme, toggleTheme, applyTheme, themeMode: computed(() => appStore.themeMode) }
}
