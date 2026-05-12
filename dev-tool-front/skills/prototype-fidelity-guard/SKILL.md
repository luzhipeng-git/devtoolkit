---
name: prototype-fidelity-guard
description: Enforce strict fidelity between prototype HTML and Vue implementation. Prevents 3 classes of drift: (1) CSS style values diverging from design system, (2) DOM structure (menu items, element hierarchy, icon usage) diverging from prototype, (3) sidebar menu items not matching prototype. Includes CSS audit script, DOM structure audit, visual regression testing, and component scaffold template.
---

# Prototype Fidelity Guard — Prevent Drift Between Prototype and Implementation

## The Problem

When converting HTML prototypes to component-based frameworks (Vue, React, Svelte), three classes of silent drift occur:

### Problem 1: Scoped Style Override

Component `<style scoped>` blocks **silently override** the global design system because:
1. **Global design system** (`common.css`) defines polished UI styles
2. **Component scoped styles** define simpler versions of the same CSS classes
3. Scoped styles win due to higher specificity (attribute selectors like `data-v-xxx`)
4. Result: a polished design system completely ignored across 40+ files
5. **Playwright functional tests pass** because they test behavior, not visual fidelity

### Problem 2: DOM Structure Drift

The coding agent modifies DOM structure without checking the prototype:
1. **Prototype HTML** defines exact element hierarchy (icons, classes, nesting)
2. **Agent adds/removes elements** based on "improvement" assumptions
3. Example: prototype sidebar has **no icons** on menu items, but agent adds `<AppIcon>` to every item
4. Example: prototype sidebar has **no icons** on category titles, but agent adds icons there too
5. No test catches this because functional tests check behavior, not DOM structure

### Problem 3: Menu Structure Mismatch

The coding agent uses the **requirements feature list** instead of the **prototype sidebar**:
1. **Requirements doc** lists 51 functional features (the "what")
2. **Prototype HTML** organizes them into 28 sidebar items (the "how")
3. Agent creates 51 separate routes/components, one per feature
4. Result: 45+ sidebar items where prototype has 28
5. Categories get split (e.g., one "加密解密" becomes four: crypto, hash, key, openssl)

## Root Cause

When a coding agent generates code from requirements docs + prototypes:

| Input Source | Defines | Agent Mistake |
|---|---|---|
| Requirements doc | Feature list (what exists) | Treats each feature as a separate sidebar item |
| Prototype HTML | UI structure (how it looks) | Ignores DOM structure, adds "improvements" |
| common.css | Style values (how it renders) | Overrides with scoped styles |

The agent lacks a constraint that says: **"The prototype HTML is the authoritative source for UI structure and styles."**

## The Solution: 4-Layer Defense

```
┌──────────────────────────────────────────────────┐
│  Layer 1: Rules (CLAUDE.md)                      │
│  Agent reads rules before generating code         │
│  - CSS: no scoped overrides of common.css         │
│  - DOM: match prototype element structure          │
│  - Menu: sidebar items must match prototype        │
├──────────────────────────────────────────────────┤
│  Layer 2: Structure Manifest                     │
│  docs/ui-structure.json extracted from prototype  │
│  Scripts auto-validate registry.ts against it     │
├──────────────────────────────────────────────────┤
│  Layer 3: Audit Scripts                          │
│  CSS audit: detect scoped/global conflicts        │
│  DOM audit: detect menu/icon differences          │
│  Run: pnpm run css:audit / pnpm run dom:audit    │
├──────────────────────────────────────────────────┤
│  Layer 4: Visual Regression Tests                │
│  Screenshot comparison catches any drift          │
│  Run: pnpm run test:visual                       │
└──────────────────────────────────────────────────┘
```

## When to Use This Skill

- Starting a new frontend project with a CSS design system
- Adding components to an existing project with prototypes
- After a coding agent generates multiple components
- When you notice UI inconsistency across pages
- Before committing any style or layout changes

## Step-by-Step Setup

### Step 1: Create CLAUDE.md

Add to your project root `CLAUDE.md`:

```markdown
## Prototype Fidelity Rules (CRITICAL)

### Prototype HTML is the authoritative source

All UI structure and styles are defined in `docs/ui-html/` prototype files.
These are the **only** source of truth for:
- Sidebar menu items and categories
- Element hierarchy (icons, classes, nesting)
- CSS class values and design tokens

### CSS Architecture Rules

1. **Single Source of Truth**: `src/assets/styles/common.css` for shared styles
2. **NEVER** define `<style scoped>` classes that already exist in common.css
3. Only add `<style scoped>` for styles **unique** to that component

### DOM Structure Rules

1. Sidebar menu items must match `docs/ui-html/01-main-framework.html` exactly
2. If prototype has **no icons** on submenu items, do NOT add icons
3. If prototype has **no icons** on category titles, do NOT add icons
4. Element class names and nesting must match the prototype DOM

### Menu Structure Rules

1. Sidebar categories and items must match the prototype sidebar exactly
2. Features listed in requirements docs but not in prototype sidebar → implement as tabs/sections within existing pages
3. **NEVER** create a new sidebar item without a matching prototype entry

### How to Check

Run: `pnpm run css:audit` and `pnpm run dom:audit`
```

### Step 2: Extract Structure Manifest from Prototype

Create `scripts/extract-structure.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROTOTYPE="$PROJECT_DIR/docs/ui-html/01-main-framework.html"
OUTPUT="$PROJECT_DIR/docs/ui-structure.json"

if [ ! -f "$PROTOTYPE" ]; then
  echo "ERROR: Prototype file not found: $PROTOTYPE"
  exit 1
fi

# Extract sidebar structure using python
python3 -c "
import re, json, sys

with open('$PROTOTYPE', 'r') as f:
    html = f.read()

# Find sidebar section
sidebar_match = re.search(r'<div class=\"sidebar\"[^>]*>(.*?)</div>\s*<!-- Content', html, re.DOTALL)
if not sidebar_match:
    sidebar_match = re.search(r'<div class=\"sidebar\"[^>]*>(.*?)<button', html, re.DOTALL)

if not sidebar_match:
    print('ERROR: Could not find sidebar section', file=sys.stderr)
    sys.exit(1)

sidebar = sidebar_match.group(1)

categories = []
current_category = None

# Parse sidebar items
for line in sidebar.split('\n'):
    line = line.strip()
    
    # Category title
    title_match = re.search(r'<div class=\"sidebar-group-title\"[^>]*>(.*?)</div>', line)
    if title_match:
        current_category = {'name': title_match.group(1).strip(), 'items': []}
        categories.append(current_category)
        continue
    
    # Menu item
    item_match = re.search(r'<a class=\"sidebar-item\"[^>]*>(.*?)</a>', line)
    if item_match:
        item_name = item_match.group(1).strip()
        if current_category is not None:
            current_category['items'].append(item_name)

result = {
    'source': '$PROTOTYPE',
    'categories': categories,
    'total_items': sum(len(c['items']) for c in categories),
    'total_categories': len(categories),
    'rules': {
        'submenu_icons': False,
        'category_icons': False,
        'notes': 'Prototype has NO icons on submenu items or category titles'
    }
}

print(json.dumps(result, ensure_ascii=False, indent=2))
" > "$OUTPUT"

echo "Extracted structure to $OUTPUT"
echo "Categories: $(python3 -c "import json; d=json.load(open('$OUTPUT')); print(d['total_categories'])")"
echo "Menu items: $(python3 -c "import json; d=json.load(open('$OUTPUT')); print(d['total_items'])")"
```

Run: `bash scripts/extract-structure.sh`

This generates `docs/ui-structure.json`:

```json
{
  "source": "docs/ui-html/01-main-framework.html",
  "categories": [
    { "name": "字符编码", "items": ["Hex 转换", "Base64 编解码", "ASCII 转换", "URL 编解码", "Unicode 编解码"] },
    { "name": "JSON 工具", "items": ["格式化 & 压缩", "反序列化", "JSONPath 查询", "JSON Diff"] },
    { "name": "加密解密", "items": ["AES 加密/解密", "DES/3DES", "RSA 工具", "哈希摘要", "密钥工具", "OpenSSL 工具"] },
    { "name": "数字计算", "items": ["进制转换"] },
    { "name": "二维码", "items": ["二维码生成", "二维码解析"] },
    { "name": "HTTP Client", "items": ["HTTP 请求"] },
    { "name": "时间计算", "items": ["时间戳转换"] },
    { "name": "Cron", "items": ["Cron 表达式"] },
    { "name": "正则调试", "items": ["正则调试"] },
    { "name": "Grok", "items": ["Grok 调试"] },
    { "name": "Nginx", "items": ["Nginx 工具"] },
    { "name": "配置转换", "items": ["配置文件转换"] },
    { "name": "编码解码", "items": ["JWT 编解码"] }
  ],
  "total_items": 28,
  "total_categories": 13,
  "rules": {
    "submenu_icons": false,
    "category_icons": false
  }
}
```

### Step 3: Create CSS Audit Script

Create `scripts/css-audit.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMMON_CSS="$PROJECT_DIR/src/assets/styles/common.css"

# Extract top-level class names from common.css
COMMON_CLASSES=$(grep -oP '^\.[a-zA-Z][\w-]*(?=[\s{,:])' "$COMMON_CSS" | sort -u | sed 's/^\.//')

echo "=== CSS Scoped Style Audit ==="

VIOLATIONS=0

while IFS= read -r -d '' file; do
  SCOPED_CLASSES=$(awk '/<style scoped>/,/<\/style>/' "$file" \
    | grep -oP '^\.[a-zA-Z][\w-]*(?=[\s{,:])' | sort -u | sed 's/^\.//' || true)

  [ -z "$SCOPED_CLASSES" ] && continue

  CONFLICTS=""
  while IFS= read -r cls; do
    [ -z "$cls" ] && continue
    echo "$COMMON_CLASSES" | grep -qx "$cls" && CONFLICTS="$CONFLICTS $cls"
  done <<< "$SCOPED_CLASSES"

  if [ -n "$CONFLICTS" ]; then
    VIOLATIONS=$((VIOLATIONS + 1))
    echo "CONFLICT: ${file#$PROJECT_DIR/}"
    echo "  Classes:$CONFLICTS"
  fi
done < <(find "$PROJECT_DIR/src" -name "*.vue" -print0)

echo "Violations: $VIOLATIONS"
[ $VIOLATIONS -gt 0 ] && exit 1 || exit 0
```

### Step 4: Create DOM Structure Audit Script

Create `scripts/dom-audit.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STRUCTURE="$PROJECT_DIR/docs/ui-structure.json"

if [ ! -f "$STRUCTURE" ]; then
  echo "ERROR: Run scripts/extract-structure.sh first"
  exit 1
fi

echo "=== DOM Structure Audit ==="

# Check 1: Sidebar item count
EXPECTED_ITEMS=$(python3 -c "import json; d=json.load(open('$STRUCTURE')); print(d['total_items'])")
EXPECTED_CATS=$(python3 -c "import json; d=json.load(open('$STRUCTURE')); print(d['total_categories'])")

# Extract actual category count from tool-registry.ts
ACTUAL_CATS=$(grep -c "id:" "$PROJECT_DIR/src/stores/tool-registry.ts" || echo 0)

# Extract actual tool count from registry.ts
ACTUAL_TOOLS=$(grep -c "id:" "$PROJECT_DIR/src/utils/registry.ts" || echo 0)

echo "Expected categories: $EXPECTED_CATS, Actual: $ACTUAL_CATS"
echo "Expected menu items: $EXPECTED_ITEMS, Actual: $ACTUAL_TOOLS"

VIOLATIONS=0

if [ "$ACTUAL_CATS" -ne "$EXPECTED_CATS" ]; then
  echo "MISMATCH: Category count differs ($ACTUAL_CATS vs $EXPECTED_CATS in prototype)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$ACTUAL_TOOLS" -gt "$EXPECTED_ITEMS" ]; then
  echo "MISMATCH: More menu items than prototype ($ACTUAL_TOOLS vs $EXPECTED_ITEMS)"
  echo "  Some features should be combined into single pages with tabs"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check 2: Icons on submenu items
echo ""
echo "=== Icon Usage Check ==="

SIDEBAR="$PROJECT_DIR/src/components/layout/Sidebar.vue"
if [ -f "$SIDEBAR" ]; then
  SUBMENU_ICONS=$(grep -c 'AppIcon.*tool\.icon\|sidebar-item-icon' "$SIDEBAR" || echo 0)
  CAT_ICONS=$(grep -c 'AppIcon.*category\.icon\|sidebar-cat-icon' "$SIDEBAR" || echo 0)
  
  if [ "$SUBMENU_ICONS" -gt 0 ]; then
    echo "VIOLATION: Submenu items have icons, but prototype has none"
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "OK: No icons on submenu items"
  fi
  
  if [ "$CAT_ICONS" -gt 0 ]; then
    echo "VIOLATION: Category titles have icons, but prototype has none"
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "OK: No icons on category titles"
  fi
fi

# Check 3: Category names match prototype
echo ""
echo "=== Category Name Check ==="
python3 -c "
import json, re

with open('$STRUCTURE') as f:
    expected = json.load(f)

with open('$PROJECT_DIR/src/stores/tool-registry.ts') as f:
    content = f.read()

actual_cats = re.findall(r\"name:\s*'([^']+)'\", content)
expected_names = [c['name'] for c in expected['categories']]

for en in expected_names:
    if en not in actual_cats:
        print(f'  MISSING: \"{en}\" not found in tool-registry.ts categories')

for ac in actual_cats:
    if ac not in expected_names:
        print(f'  EXTRA: \"{ac}\" in tool-registry.ts but not in prototype')
"

echo ""
echo "Total violations: $VIOLATIONS"
[ $VIOLATIONS -gt 0 ] && exit 1 || exit 0
```

### Step 5: Create Visual Regression Tests

Install Playwright:
```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

Create `playwright.visual.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/visual',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    },
  },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
  },
  snapshotDir: './e2e/visual/__snapshots__',
})
```

Create `e2e/visual/style.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Visual Regression - Layout', () => {
  test('home page layout', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.tool-card-link')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('home-page.png', { fullPage: false })
  })

  test('sidebar layout', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.sidebar')
    await page.waitForTimeout(300)
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toHaveScreenshot('sidebar.png')
  })
})

test.describe('Visual Regression - Tool Pages', () => {
  const toolPages = [
    { name: 'unicode-encoder', path: '/encoding/unicode', label: 'Unicode' },
    { name: 'hex-converter', path: '/encoding/hex', label: 'Hex' },
    { name: 'json-formatter', path: '/json/format', label: 'JSON' },
    { name: 'aes-crypto', path: '/crypto/aes', label: 'AES' },
  ]

  for (const tool of toolPages) {
    test(`${tool.label} tool page`, async ({ page }) => {
      await page.goto(tool.path)
      await page.waitForSelector('.tool-card')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot(`tool-${tool.name}.png`, { fullPage: false })
    })
  }
})

test.describe('Visual Regression - Components', () => {
  test('options panel with toggle', async ({ page }) => {
    await page.goto('/encoding/unicode')
    await page.waitForSelector('.options-panel')
    const panel = page.locator('.options-panel')
    await expect(panel).toHaveScreenshot('options-panel.png')
  })

  test('editor area', async ({ page }) => {
    await page.goto('/encoding/hex')
    await page.waitForSelector('.editor-header')
    const editor = page.locator('.editor-header').first()
    await expect(editor).toHaveScreenshot('editor-header.png')
  })
})
```

Generate baselines:
```bash
npx playwright test --config playwright.visual.config.ts --update-snapshots
```

### Step 6: Create Component Scaffold Template

Create `scripts/templates/ToolTemplate.vue`:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToolBase } from '@/composables/useToolBase'
import { useClipboard } from '@/composables/useClipboard'
import ToolContainer from '@/components/common/ToolContainer.vue'
import ToolTabs from '@/components/common/ToolTabs.vue'
import OptionsPanel from '@/components/common/OptionsPanel.vue'
import SwapButton from '@/components/common/SwapButton.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import HistorySection from '@/components/common/HistorySection.vue'
import ErrorBanner from '@/components/common/ErrorBanner.vue'

const { input, output, mode, error, swap, clear, history, clearHistory, restoreFromHistory } = useToolBase({
  toolId: '___TOOL_ID___',
  debounceMs: 300,
})

const { copy } = useClipboard()

const tabs = [
  { key: 'encode', label: '编码' },
  { key: 'decode', label: '解码' },
]

function process() {
  error.value = null
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'encode') {
      // TODO: implement encode
      output.value = input.value
    } else {
      // TODO: implement decode
      output.value = input.value
    }
  } catch (e: any) {
    error.value = e.message || '转换失败'
  }
}

watch([input, mode], process)

const inputLabel = ref('输入')
const outputLabel = ref('输出')
</script>

<template>
  <ToolContainer>
    <ToolTabs :tabs="tabs" v-model:active-tab="mode" />
    <ErrorBanner v-if="error" :message="error" @dismiss="error = null" />

    <div class="editor-header">
      <span class="editor-title">{{ inputLabel }}</span>
      <div class="editor-actions">
        <button class="btn-outline" @click="clear">清空</button>
      </div>
    </div>
    <div class="editor-body">
      <textarea
        class="editor-textarea"
        v-model="input"
        placeholder="在此输入..."
      ></textarea>
    </div>

    <SwapButton @swap="swap" />

    <div class="editor-header">
      <span class="editor-title">{{ outputLabel }}</span>
      <div class="editor-actions">
        <CopyButton :text="output" />
      </div>
    </div>
    <div class="editor-body output">
      <div class="editor-output">{{ output }}</div>
    </div>

    <HistorySection
      :records="history"
      @restore="restoreFromHistory"
      @clear="clearHistory"
    />
  </ToolContainer>
</template>

<!-- NOTE: Do NOT add scoped styles for classes defined in common.css.
     Only add scoped styles for component-unique classes.
     Run `pnpm run css:audit` and `pnpm run dom:audit` to check. -->
```

## Recommended Development Flow

```
原型设计 → 提取结构清单 (extract-structure.sh)
  → CLAUDE.md 规则约束（CSS + DOM + Menu）
    → 用模板生成组件（无 scoped 覆盖，无多余图标）
      → pnpm run css:audit（检测样式冲突）
        → pnpm run dom:audit（检测结构偏差）
          → pnpm run test:visual（截图对比）
            → 全部通过 → 提交
```

## Fixing Existing Projects

If the problems already exist:

### Phase 1: Extract Truth
1. Run `bash scripts/extract-structure.sh` — generate `docs/ui-structure.json`
2. Compare with current `registry.ts` and `tool-registry.ts`
3. Document all differences

### Phase 2: Fix Menu Structure
1. Merge categories that prototype combines (e.g., hash/key/openssl → crypto)
2. Combine multi-feature pages (use tabs within single component)
3. Remove sidebar items not in prototype (implement as page sections instead)

### Phase 3: Fix DOM Structure
1. Remove icons from submenu items if prototype has none
2. Remove icons from category titles if prototype has none
3. Verify element class names match prototype

### Phase 4: Fix Styles
1. Run `pnpm run css:audit` — strip common.css classes from scoped blocks
2. Verify `common.css` values match prototype's `common.css`

### Phase 5: Verify
1. `pnpm run css:audit` — 0 violations
2. `pnpm run dom:audit` — 0 violations
3. `pnpm run test:visual --update-snapshots` — new baselines
4. Commit — now any future drift will be caught

## Shared Style Extraction

### Problem: Scoped Style Duplication

When coding agents generate Vue components, they typically include a `<style scoped>` block with "default" styles for common UI patterns. Over time, 70%+ of scoped styles become identical duplicates across many files:

| Pattern | Files with duplicate | Example |
|---------|---------------------|---------|
| `form-textarea` | 29 | Identical CSS in every file |
| `tool-title` | 17 | Identical CSS in every file |
| `form-label` | 17 | Identical CSS in every file |
| `form-group` | 15 | Identical CSS in every file |
| `btn-secondary` | 11 | Identical CSS in every file |
| `result-*` | 8-10 | Identical CSS in every file |

This is a maintainability problem and a theme-switching blocker:
- **Theme switching impossible**: Changing a style requires editing 30 files
- **Subtle drift risk**: Copies gradually diverge (e.g., `font-size: 13px` in one file vs `14px` in another)
- **Bundle bloat**: Same CSS compiled 30 times with different scoped attributes

### Solution: Extract to common.css Before Writing Scoped Styles

When creating or reviewing a Vue component, follow this rule:

```
Component needs a style
  → Is it a common UI pattern? (form input, result display, button variant, etc.)
    → YES: Add to common.css, use the class in template
    → NO: Add to <style scoped> with a unique class name
```

### Canonical Shared Classes (add to common.css)

These classes should live in `common.css` and NEVER be redefined in scoped styles:

```css
/* ===== Form Layout ===== */
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-input); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-family: monospace; font-size: 13px; }
.form-input:focus { outline: none; border-color: var(--primary); }
.form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border-input); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-family: monospace; font-size: 13px; resize: vertical; }
.form-textarea:focus { outline: none; border-color: var(--primary); }
.form-select { padding: 8px 12px; border: 1px solid var(--border-input); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-size: 13px; min-width: 160px; }
.form-select:focus { outline: none; border-color: var(--primary); }
.form-row { display: flex; gap: 16px; align-items: flex-end; }
.form-actions { display: flex; gap: 8px; }

/* ===== Tool Page Layout ===== */
.tool-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
.tool-content { display: flex; flex-direction: column; gap: 12px; }

/* ===== Secondary Button ===== */
.btn-secondary { background: var(--bg-code); color: var(--text-primary); border: 1px solid var(--border-card); padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.15s; }
.btn-secondary:hover { border-color: var(--primary); }

/* ===== Result Display ===== */
.result-card { background: var(--bg-code); border: 1px solid var(--border-card); border-radius: 6px; padding: 12px; margin-bottom: 8px; }
.result-row { display: flex; gap: 8px; align-items: center; }
.result-label { font-size: 11px; color: var(--text-placeholder); margin-bottom: 4px; }
.result-value { font-size: 16px; font-weight: 600; color: var(--text-primary); font-family: 'Consolas', monospace; word-break: break-all; }
.result-input { flex: 1; }

/* ===== Status Text ===== */
.error-text { color: #dc2626; font-size: 13px; }
[data-theme="dark"] .error-text { color: #f87171; }
.success { color: #16a34a; font-size: 13px; }
[data-theme="dark"] .success { color: #4ade80; }

/* ===== Calculator Input ===== */
.calc-input { width: 100%; padding: 10px 12px; border: none; outline: none; font-family: 'Consolas', monospace; font-size: 14px; background: var(--bg-code); color: var(--text-primary); }

/* ===== Key Row (crypto tools) ===== */
.key-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.key-label { font-size: 12px; color: var(--text-secondary); width: 60px; flex-shrink: 0; }
```

### Theme Switching Architecture

All shared styles use CSS variables from `variables.css`. Theme switching only requires changing variable values:

```
variables.css defines:
  --primary: #3b82f6;      (light)
  --text-primary: #1e293b; (light)
  --bg-white: #ffffff;     (light)
  ...

[data-theme="dark"] {
  --primary: #60a5fa;
  --text-primary: #e2e8f0;
  --bg-white: #0f172a;
  ...
}
```

When shared classes are in common.css using `var(--xxx)`:
- **Switch theme** = toggle `data-theme="dark"` on `<html>`
- **Custom theme** = override specific variables
- **No component changes needed** — all 45 components automatically adapt

### Audit: Detect Duplicate Scoped Styles

Add to `scripts/css-audit.sh`:

```bash
# Check 3: Detect duplicate scoped styles
echo ""
echo "--- Duplicate Scoped Style Check ---"
COMMON_CLASSES=$(grep -oP '^\.[a-zA-Z][\w-]*(?=[\s{,:])' "$COMMON_CSS" | sed 's/^\.//' | sort -u)

DUPLICATE_COUNT=0
while IFS= read -r -d '' file; do
  SCOPED_CLASSES=$(awk '/<style scoped>/,/<\/style>/' "$file" \
    | grep -oP '^\.[a-zA-Z][\w-]*(?=[\s{,:])' | sort -u | sed 's/^\.//' || true)
  [ -z "$SCOPED_CLASSES" ] && continue

  while IFS= read -r cls; do
    [ -z "$cls" ] && continue
    echo "$COMMON_CLASSES" | grep -qx "$cls" && DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
  done <<< "$SCOPED_CLASSES"
done < <(find "$PROJECT_DIR/src" -name "*.vue" -print0)

if [ "$DUPLICATE_COUNT" -gt 0 ]; then
  echo "VIOLATION: $DUPLICATE_COUNT scoped class(es) already exist in common.css"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "OK: No duplicate scoped classes"
fi
```

### Extraction Workflow

When extracting shared styles from existing scoped blocks:

1. **Identify repeated classes**: `find src -name "*.vue" | xargs awk '/<style scoped>/,/<\/style>/' | grep -oP '^\.[a-zA-Z][\w-]*' | sort | uniq -c | sort -rn | head -20`
2. **Verify identical CSS**: Compare the CSS properties across files. If identical → extract. If different → unify first, then extract.
3. **Add to common.css**: Add the canonical version under a clear section comment.
4. **Remove from scoped blocks**: Delete the class from each file's `<style scoped>`.
5. **Remove empty `<style scoped>`**: If a file's scoped block becomes empty or only has whitespace, remove the entire `<style scoped>...</style>` block.
6. **Run `pnpm run css:audit`**: Verify 0 violations.
7. **Run `pnpm run test:visual --update-snapshots`**: Update baselines if layout shifted slightly.
8. **Run `pnpm exec playwright test --config playwright.config.ts`**: Verify all functional tests pass.

## Key Lessons

| Lesson | Detail |
|--------|--------|
| Requirements doc ≠ UI structure | Requirements list features; prototypes define how they're organized. Never derive sidebar items from feature lists. |
| Scoped styles silently override | Higher specificity from `data-v-xxx` means scoped styles always win over global |
| "Improvements" are regressions | Adding icons that prototype doesn't have is not an improvement — it's a deviation |
| Functional tests miss style bugs | `toBeVisible()` passes regardless of how wrong the element looks |
| Audit scripts are cheap insurance | A 30-line bash script prevents a 44-file style regression |
| Baseline screenshots are ground truth | Visual tests freeze the "correct" design; any drift is immediately visible |

## Files Checklist

- [ ] `CLAUDE.md` — CSS + DOM + Menu + shared style rules
- [ ] `docs/ui-structure.json` — Extracted prototype structure
- [ ] `src/assets/styles/common.css` — All shared styles (editor, form, result, button, etc.)
- [ ] `src/assets/styles/variables.css` — CSS variables for theme switching
- [ ] `scripts/extract-structure.sh` — Structure extraction from prototype
- [ ] `scripts/css-audit.sh` — CSS conflict + duplicate detection
- [ ] `scripts/dom-audit.sh` — DOM structure audit
- [ ] `package.json` — `css:audit`, `dom:audit`, and `test:visual` scripts
- [ ] `playwright.visual.config.ts` — Visual test config
- [ ] `e2e/visual/style.spec.ts` — Visual test cases
- [ ] `scripts/templates/ToolTemplate.vue` — Component scaffold
