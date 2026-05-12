import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import router, { registerToolRoutes } from './router'
import { registerAllTools } from './utils/registry'
import { initServices } from './services'

import '@/assets/styles/variables.css'
import '@/assets/styles/common.css'
import '@/assets/styles/naive-overrides.css'

import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Initialize services:
// - Tauri mode: running inside Tauri desktop app (Windows exe)
// - HTTP mode: Rust backend running at http://127.0.0.1:3030
if (window.__TAURI__) {
  initServices('tauri')
} else {
  initServices('http')
}

// Register all tools into the store
registerAllTools()

// Register tool routes BEFORE app.use(router) to ensure
// dynamic routes exist when initial navigation resolves
registerToolRoutes()

app.use(router)
app.use(naive)

app.mount('#app')
