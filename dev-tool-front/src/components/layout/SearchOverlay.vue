<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useToolRegistryStore } from '@/stores/tool-registry'
import type { ToolCategory, ToolDefinition } from '@/types/tool'

const router = useRouter()
const appStore = useAppStore()
const toolStore = useToolRegistryStore()

const query = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)

const searchResults = computed(() => {
  if (!query.value.trim()) {
    return toolStore.toolsByCategory
  }
  return toolStore.searchTools(query.value)
})

const flattenedResults = computed(() => {
  const items: Array<{ category: string; tool: ToolDefinition }> = []
  for (const [categoryId, tools] of searchResults.value) {
    for (const tool of tools) {
      items.push({ category: categoryId, tool })
    }
  }
  return items
})

const hasResults = computed(() => flattenedResults.value.length > 0)

watch(
  () => appStore.searchOpen,
  (visible) => {
    if (visible) {
      query.value = ''
      selectedIndex.value = 0
      nextTick(() => {
        searchInput.value?.focus()
      })
    }
  }
)

function getCategoryName(categoryId: ToolCategory): string {
  const cat = toolStore.categories.find(c => c.id === categoryId)
  return cat?.name ?? categoryId
}

function selectTool(tool: ToolDefinition): void {
  appStore.searchOpen = false
  router.push(tool.route)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    appStore.searchOpen = false
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (selectedIndex.value < flattenedResults.value.length - 1) {
      selectedIndex.value++
      scrollToSelected()
    }
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
      scrollToSelected()
    }
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const selected = flattenedResults.value[selectedIndex.value]
    if (selected) {
      selectTool(selected.tool)
    }
    return
  }
}

function scrollToSelected(): void {
  nextTick(() => {
    const el = document.querySelector(`.search-result-item[data-index="${selectedIndex.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function onBackdropClick(event: MouseEvent): void {
  if ((event.target as HTMLElement).classList.contains('search-backdrop')) {
    appStore.searchOpen = false
  }
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && appStore.searchOpen) {
    appStore.searchOpen = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <Transition name="search-fade">
    <div
      v-if="appStore.searchOpen"
      class="search-backdrop"
      @click="onBackdropClick"
    >
      <div class="search-modal">
        <!-- Search Input -->
        <div class="search-input-wrapper">
          <svg class="search-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            class="search-input"
            placeholder="搜索工具..."
            @keydown="handleKeydown"
          />
          <kbd class="search-kbd">ESC</kbd>
        </div>

        <!-- Results -->
        <div class="search-results">
          <template v-if="hasResults">
            <template v-for="[categoryId, tools] of searchResults" :key="categoryId">
              <div class="search-category-label">
                {{ getCategoryName(categoryId) }}
              </div>
              <div
                v-for="tool in tools"
                :key="tool.id"
                class="search-result-item"
                :class="{
                  selected:
                    flattenedResults[selectedIndex]?.tool.id === tool.id,
                }"
                :data-index="
                  flattenedResults.findIndex(f => f.tool.id === tool.id)
                "
                @click="selectTool(tool)"
                @mouseenter="
                  selectedIndex = flattenedResults.findIndex(
                    f => f.tool.id === tool.id,
                  )
                "
              >
                <div class="search-result-info">
                  <span class="search-result-name">{{ tool.name }}</span>
                  <span class="search-result-desc">{{ tool.description }}</span>
                </div>
              </div>
            </template>
          </template>
          <div v-else class="search-empty">
            未找到相关工具
          </div>
        </div>

        <!-- Footer hint -->
        <div class="search-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> 导航</span>
          <span><kbd>Enter</kbd> 选择</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 1000;
}

.search-modal {
  width: 520px;
  max-height: 460px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Search Input */
.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  gap: 10px;
}

.search-input-icon {
  flex-shrink: 0;
  color: var(--text-placeholder);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--text-primary);
  background: transparent;
  font-family: var(--font-family);
}

.search-input::placeholder {
  color: var(--text-placeholder);
}

.search-kbd {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-disabled);
  border: 1px solid var(--border-light);
  font-family: var(--font-family);
}

/* Results */
.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 340px;
}

.search-results::-webkit-scrollbar {
  width: 4px;
}

.search-results::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 2px;
}

.search-results::-webkit-scrollbar-track {
  background: transparent;
}

.search-category-label {
  font-size: 11px;
  color: var(--text-placeholder);
  font-weight: 600;
  padding: 8px 16px 4px;
  letter-spacing: 0.5px;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 10px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.search-result-item:hover,
.search-result-item.selected {
  background: var(--bg-hover);
}

.search-result-item.selected {
  background: var(--primary-light);
}

.search-result-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.search-result-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-result-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.search-result-desc {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Empty State */
.search-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-placeholder);
  font-size: 13px;
}

/* Footer */
.search-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid var(--border-light);
  font-size: 11px;
  color: var(--text-disabled);
}

.search-footer kbd {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  font-family: var(--font-family);
  color: var(--text-muted);
}

/* Transition */
.search-fade-enter-active {
  transition: opacity 150ms ease;
}

.search-fade-leave-active {
  transition: opacity 120ms ease;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}
</style>
