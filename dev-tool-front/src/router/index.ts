import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useToolRegistryStore } from '@/stores/tool-registry'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'layout',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let _registered = false

export function registerToolRoutes() {
  if (_registered) return
  _registered = true

  const store = useToolRegistryStore()
  for (const tool of store.tools) {
    router.addRoute('layout', {
      path: tool.route.replace(/^\//, ''),
      name: `tool-${tool.id}`,
      component: tool.component,
      meta: { title: tool.name, toolId: tool.id },
    })
  }
}

export default router
