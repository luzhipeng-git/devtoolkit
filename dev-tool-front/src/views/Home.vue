<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToolRegistryStore } from '@/stores/tool-registry'

const router = useRouter()
const registry = useToolRegistryStore()

const recentTools = computed(() =>
  registry.recentTools
    .map(id => registry.getToolById(id))
    .filter(Boolean)
)

const favoriteTools = computed(() =>
  registry.favorites
    .map(id => registry.getToolById(id))
    .filter(Boolean)
)

function navigateTo(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="home-page">
    <div class="home-header">
      <h1 class="home-title">开发者工具箱</h1>
      <p class="home-subtitle">按 Ctrl+K 快速搜索工具，Ctrl+B 切换侧栏</p>
    </div>

    <!-- Favorites -->
    <div v-if="favoriteTools.length > 0" class="category-section">
      <h3 class="category-title">收藏工具</h3>
      <div class="tool-grid">
        <div
          v-for="tool in favoriteTools"
          :key="tool!.id"
          class="tool-card-link"
          @click="navigateTo(tool!.route)"
        >
          <div class="tool-card-inner">
            <div class="tool-card-icon">{{ tool!.name.charAt(0) }}</div>
            <div class="tool-card-text">
              <div class="tool-card-name">{{ tool!.name }}</div>
              <div class="tool-card-desc">{{ tool!.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent -->
    <div v-if="recentTools.length > 0" class="recent-section">
      <h3 class="category-title">最近使用</h3>
      <div class="tool-grid">
        <div
          v-for="tool in recentTools"
          :key="tool!.id"
          class="tool-card-link"
          @click="navigateTo(tool!.route)"
        >
          <div class="tool-card-inner">
            <div class="tool-card-icon">{{ tool!.name.charAt(0) }}</div>
            <div class="tool-card-text">
              <div class="tool-card-name">{{ tool!.name }}</div>
              <div class="tool-card-desc">{{ tool!.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- All categories -->
    <div v-for="category in registry.sortedCategories" :key="category.id" class="category-section">
      <h3 class="category-title">{{ category.name }}</h3>
      <div class="tool-grid">
        <div
          v-for="tool in registry.toolsByCategory.get(category.id) || []"
          :key="tool.id"
          class="tool-card-link"
          @click="navigateTo(tool.route)"
        >
          <div class="tool-card-inner">
            <div class="tool-card-icon">{{ tool.name.charAt(0) }}</div>
            <div class="tool-card-text">
              <div class="tool-card-name">{{ tool.name }}</div>
              <div class="tool-card-desc">{{ tool.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  padding: var(--content-padding);
  height: 100%;
  overflow-y: auto;
}
.home-header {
  margin-bottom: 24px;
}
.home-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.home-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}
.category-section {
  margin-bottom: 24px;
}
.category-title {
  font-size: 12px;
  color: var(--text-placeholder);
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0 0 10px;
}
.recent-section {
  margin-bottom: 24px;
}
</style>
