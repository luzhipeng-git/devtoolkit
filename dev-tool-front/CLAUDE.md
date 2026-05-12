# DevToolkit Frontend Development Guide

## Project Overview

Vue 3 + Vite developer tools application with 28 UI pages (51 features merged via tabs). Backend via Rust (Tauri 2).

## Prototype Authority Rules (CRITICAL)

### Prototype HTML is the ONLY authority for UI structure

The prototype files in `docs/ui-html/` define:
- **Page layout** (sections, tabs, panels, cards — all must be on the same page structure)
- **Interactive elements** (tabs, selects, radio groups, KV tables, swap buttons, history sections)
- Sidebar categories and menu items (see `docs/ui-structure.json`)
- Element hierarchy (no icons on submenu items, no icons on category titles)
- CSS class names and values (see `docs/ui-html/common.css`)

**NEVER** derive UI layout from the requirements doc or your own interpretation. The requirements doc describes *what* features exist; the prototype HTML defines *how* they are structured on the page.

### MANDATORY: Read prototype BEFORE implementing

Before writing or modifying any tool page component, you MUST:
1. Read the corresponding `docs/ui-html/*.html` prototype file first
2. Identify all structural elements: sections, tabs, input types, buttons, tables, selects, radios
3. Implement the Vue component to match that exact structure
4. Run `pnpm run prototype:audit` to verify conformance

### Common implementation mistakes (enforced by prototype:audit)

| Prototype has | Wrong implementation | Correct implementation |
|---|---|---|
| Multiple sections on one page | Tab switching (one section visible at a time) | All sections visible simultaneously |
| Separate date + time inputs | Single combined input | Two separate input fields |
| Select dropdown for format | Text input for format pattern | `<select>` with preset options |
| History section at bottom | No history | `history-section` with items |
| Swap button between I/O | No swap | `swap-btn` with swap behavior |
| Radio group (ms/s) | Auto-detect | Explicit radio buttons |
| KV table for headers/params | No structured table | `<table class="kv-table">` |

## CSS Architecture Rules (CRITICAL)

### Single Source of Truth: `src/assets/styles/common.css`

All shared UI styles are defined in `common.css`. This is the **only** place for:
- Editor areas (`.editor-header`, `.editor-body`, `.editor-textarea`, `.editor-output`)
- Buttons (`.btn-primary`, `.btn-outline`, `.btn-secondary`)
- Options panel (`.options-panel`, `.option-group`, `.option-select`, `.option-input`)
- Tool layout (`.tool-header`, `.tool-tab`, `.tool-card`, `.tool-title`, `.tool-content`)
- Swap button (`.swap-btn`, `.swap-btn-container`)
- Toggle switch (`.toggle-switch`)
- History section (`.history-section`, `.history-header`, `.history-item`)
- Sidebar items (`.sidebar-item`, `.sidebar-group-title`)
- Form layout (`.form-group`, `.form-label`, `.form-input`, `.form-textarea`, `.form-select`, `.form-row`, `.form-actions`)
- Result display (`.result-card`, `.result-row`, `.result-label`, `.result-value`, `.result-input`)
- Status text (`.error-text`, `.success`)
- Calculator input (`.calc-input`)
- Crypto key row (`.key-row`, `.key-label`)
- Tags (`.tag`, `.tag-blue`, `.tag-green`, etc.)
- Utility classes (`.flex`, `.gap-*`, `.mt-*`, `.mb-*`)

### Scoped Style Rules

1. **NEVER** define `<style scoped>` classes that already exist in `common.css`. Scoped styles have higher specificity due to `data-v-xxx` attributes and will silently override the global design system.

2. Only add `<style scoped>` for styles **unique** to that component (e.g., `.key-row` in AesCrypto, `.diff-item` in JsonDiff).

3. If you need to customize a global class for one component, use a modifier class (e.g., `.editor-body.compact`) rather than redefining the base class.

## DOM Structure Rules (CRITICAL)

1. Submenu items (`sidebar-item`) must NOT have icons. Prototype uses plain text links.
2. Category titles (`sidebar-group-title`) must NOT have icons.
3. Sidebar has exactly 13 categories and 26 menu items (per `docs/ui-structure.json`).
4. Features not in the prototype sidebar must be implemented as tabs/sections within existing pages.

## How to Check

```bash
pnpm run prototype:audit  # Verify tool pages match prototype structure (MANDATORY before commit)
pnpm run css:audit        # Detect scoped style conflicts with common.css
pnpm run dom:audit        # Detect menu/icon/structure deviations from prototype
```

All three must show 0 violations before committing.

## Component Pattern

New tool pages must follow this structure:

```vue
<script setup lang="ts">
// 1. Imports from composables and common components only
import { useToolBase } from '@/composables/useToolBase'
import ToolContainer from '@/components/common/ToolContainer.vue'
// ... other common components
</script>

<template>
  <ToolContainer>
    <!-- Use common.css classes directly, NO scoped overrides -->
  </ToolContainer>
</template>

<!-- Only add <style scoped> for truly unique styles -->
```

## Key Files

| File | Purpose |
|------|---------|
| `docs/ui-structure.json` | Prototype sidebar structure (authority) |
| `docs/ui-html/` | Prototype HTML files (UI authority) |
| `src/assets/styles/variables.css` | CSS variables / design tokens |
| `src/assets/styles/common.css` | Global component styles (single source of truth) |
| `src/utils/registry.ts` | Tool registration (must match ui-structure.json) |
| `src/stores/tool-registry.ts` | Category definitions (must match ui-structure.json) |
| `src/services/index.ts` | Service locator (http/tauri mode) |
| `src/composables/useToolBase.ts` | Shared tool state management |

## Testing

### Backend Architecture (CRITICAL for E2E)

The app uses a **dual-service architecture**:
1. **Vite dev server** (`localhost:1420`) — serves the Vue frontend
2. **Rust HTTP server** (`localhost:3030`) — provides crypto/openssl/http API endpoints

The Rust server binary is `devtoolkit-server` (defined in `src-tauri/src/bin/server.rs`), using **axum** with CORS enabled for `localhost:1420`.

**E2E tests MUST start both services** or crypto/openssl/http features will fail silently. The frontend service locator (`src/services/index.ts`) detects Tauri vs HTTP mode and calls `http://localhost:3030/api/*` endpoints in web mode.

### Starting the Rust Backend for Tests
```bash
cd src-tauri && cargo run --bin devtoolkit-server
# Server starts on 0.0.0.0:3030
# API: /api/crypto/*, /api/openssl/*, /api/http/*
```

### Functional Tests
```bash
pnpm exec playwright test --config playwright.config.ts
```

### Visual Regression Tests
```bash
pnpm exec playwright test --config playwright.visual.config.ts
```

### Audits
```bash
pnpm run prototype:audit  # Prototype conformance (tool page structure)
pnpm run css:audit        # CSS conflict detection
pnpm run dom:audit        # DOM structure audit (sidebar)
```
