<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useToolRegistryStore } from '@/stores/tool-registry'
import type { ToolCategory } from '@/types/tool'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const toolStore = useToolRegistryStore()

const expandedCategories = ref<Set<string>>(new Set())

const collapsed = computed(() => appStore.sidebarCollapsed)

const sortedCategories = computed(() => toolStore.sortedCategories)

const favoriteTools = computed(() =>
  toolStore.favorites
    .map(id => toolStore.getToolById(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
)

function toggleCategory(categoryId: string): void {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId)
  } else {
    expandedCategories.value.add(categoryId)
  }
}

function isCategoryExpanded(categoryId: string): boolean {
  return expandedCategories.value.has(categoryId)
}

function isItemActive(toolRoute: string): boolean {
  return route.path === toolRoute
}

function navigateTo(toolRoute: string): void {
  router.push(toolRoute)
}

function onSearchFocus(): void {
  appStore.toggleSearch()
}

function getCategoryTools(categoryId: ToolCategory) {
  return toolStore.toolsByCategory.get(categoryId) || []
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- Search -->
    <div v-if="!collapsed" class="sidebar-search">
      <input
        type="text"
        placeholder="搜索工具... (Ctrl+K)"
        readonly
        @focus="onSearchFocus"
      />
    </div>
    <div v-else class="sidebar-search collapsed-search">
      <span class="search-icon" @click="onSearchFocus">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </span>
    </div>

    <!-- Favorites -->
    <template v-if="favoriteTools.length > 0 && !collapsed">
      <div class="sidebar-group-title">收藏</div>
      <a
        v-for="tool in favoriteTools"
        :key="tool.id"
        class="sidebar-item"
        :class="{ active: isItemActive(tool.route) }"
        @click.prevent="navigateTo(tool.route)"
      >
        {{ tool.name }}
      </a>
    </template>

    <!-- Category Groups -->
    <template v-for="category in sortedCategories" :key="category.id">
      <template v-if="getCategoryTools(category.id).length > 0">
        <!-- Category Title -->
        <div
          v-if="!collapsed"
          class="sidebar-group-title sidebar-group-toggle"
          @click="toggleCategory(category.id)"
        >
          <span>{{ category.name }}</span>
          <span class="toggle-arrow" :class="{ expanded: isCategoryExpanded(category.id) }">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>

        <!-- Tool Items (expanded or collapsed mode) -->
        <template v-if="collapsed || isCategoryExpanded(category.id)">
          <a
            v-for="tool in getCategoryTools(category.id)"
            :key="tool.id"
            class="sidebar-item"
            :class="{ active: isItemActive(tool.route) }"
            :title="collapsed ? tool.name : undefined"
            @click.prevent="navigateTo(tool.route)"
          >
            {{ tool.name }}
          </a>
        </template>
      </template>
    </template>

    <!-- Collapse toggle button -->
    <button class="sidebar-collapse-btn" @click="appStore.toggleSidebar">
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        :style="{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  </aside>
</template>

<style scoped>
.sidebar-group-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  gap: 6px;
  padding-right: 16px;
}

.sidebar-group-toggle:hover {
  color: var(--text-muted);
}

.toggle-arrow {
  display: inline-flex;
  margin-left: auto;
  transition: transform 0.2s ease;
  color: var(--text-disabled);
}

.toggle-arrow.expanded {
  transform: rotate(90deg);
}

.collapsed .sidebar-item {
  justify-content: center;
  padding: 7px 0;
  margin: 1px 6px;
}

.collapsed-search {
  display: flex;
  justify-content: center;
  padding: 12px 0 8px;
}

.search-icon {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  background: var(--bg-white);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-placeholder);
  cursor: pointer;
  transition: all 0.15s ease;
}

.search-icon:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
