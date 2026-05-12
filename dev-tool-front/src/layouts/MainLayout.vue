<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import TitleBar from '@/components/layout/TitleBar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import SearchOverlay from '@/components/layout/SearchOverlay.vue'
import Breadcrumb from '@/components/layout/Breadcrumb.vue'

const appStore = useAppStore()
const { toggleTheme } = useTheme()

function handleGlobalKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    appStore.toggleSearch()
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
    event.preventDefault()
    appStore.toggleSidebar()
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'T' || event.key === 't')) {
    event.preventDefault()
    toggleTheme()
    return
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="app-container">
    <TitleBar />
    <div class="main-layout">
      <Sidebar />
      <div class="content-area">
        <Breadcrumb />
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </div>
    <SearchOverlay />
  </div>
</template>
