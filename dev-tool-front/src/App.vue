<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'

const appStore = useAppStore()
const { isDark, applyTheme } = useTheme()

// Apply theme on load and watch for changes
applyTheme()

watch(isDark, () => {
  applyTheme()
})

// Listen for system theme changes (for 'system' mode)
let mediaQuery: MediaQueryList | null = null
function onSystemThemeChange() {
  if (appStore.themeMode === 'system') {
    applyTheme()
  }
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', onSystemThemeChange)
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', onSystemThemeChange)
})

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#3b82f6',
    primaryColorHover: '#2563eb',
    primaryColorPressed: '#1d4ed8',
    borderRadius: '6px',
    fontSize: '14px',
  },
}
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : undefined" :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NMessageProvider>
        <router-view />
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
