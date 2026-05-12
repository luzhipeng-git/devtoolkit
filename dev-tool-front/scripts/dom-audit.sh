#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STRUCTURE="$PROJECT_DIR/../docs/ui-structure.json"

if [ ! -f "$STRUCTURE" ]; then
  echo "ERROR: Run scripts/extract-structure.sh first to generate docs/ui-structure.json"
  exit 1
fi

echo "=== DOM Structure Audit ==="

# Check 1: Category and item counts
EXPECTED_ITEMS=$(python3 -c "import json; d=json.load(open('$STRUCTURE')); print(d['total_items'])")
EXPECTED_CATS=$(python3 -c "import json; d=json.load(open('$STRUCTURE')); print(d['total_categories'])")

ACTUAL_TOOLS=$(grep -c "^\s*id:" "$PROJECT_DIR/src/utils/registry.ts" || echo 0)
ACTUAL_CATS=$(grep -c "^\s*{ id:" "$PROJECT_DIR/src/stores/tool-registry.ts" || echo 0)

echo ""
echo "--- Count Check ---"
echo "Expected categories: $EXPECTED_CATS, Actual: $ACTUAL_CATS"
echo "Expected menu items: $EXPECTED_ITEMS, Actual: $ACTUAL_TOOLS"

VIOLATIONS=0

if [ "$ACTUAL_CATS" -ne "$EXPECTED_CATS" ]; then
  echo "VIOLATION: Category count differs ($ACTUAL_CATS actual vs $EXPECTED_CATS expected)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$ACTUAL_TOOLS" -gt "$EXPECTED_ITEMS" ]; then
  echo "VIOLATION: More menu items than prototype ($ACTUAL_TOOLS actual vs $EXPECTED_ITEMS expected)"
  echo "  Some features should be combined into single pages with tabs"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check 2: Icons on submenu items
echo ""
echo "--- Icon Usage Check ---"

SIDEBAR="$PROJECT_DIR/src/components/layout/Sidebar.vue"
if [ -f "$SIDEBAR" ]; then
  SUBMENU_ICONS=$(grep -c 'AppIcon' "$SIDEBAR" 2>/dev/null || true)
  CAT_ICONS=$(grep -c 'sidebar-cat-icon' "$SIDEBAR" 2>/dev/null || true)
  SUBMENU_ICONS=${SUBMENU_ICONS:-0}
  CAT_ICONS=${CAT_ICONS:-0}

  if [ "$SUBMENU_ICONS" -gt 0 ]; then
    echo "VIOLATION: Submenu items have icons (AppIcon on tool.icon), but prototype has none"
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "OK: No icons on submenu items"
  fi

  if [ "$CAT_ICONS" -gt 0 ]; then
    echo "VIOLATION: Category titles have icons (AppIcon on category.icon), but prototype has none"
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "OK: No icons on category titles"
  fi
fi

# Check 3: Category names match prototype
echo ""
echo "--- Category Name Check ---"
python3 -c "
import json, re, sys

with open('$STRUCTURE') as f:
    expected = json.load(f)

with open('$PROJECT_DIR/src/stores/tool-registry.ts') as f:
    content = f.read()

actual_cats = re.findall(r\"name:\s*'([^']+)'\", content)
expected_names = [c['name'] for c in expected['categories']]

found_mismatch = False
for en in expected_names:
    if en not in actual_cats:
        print(f'  MISSING: \"{en}\" not found in tool-registry.ts')
        found_mismatch = True

for ac in actual_cats:
    if ac not in expected_names:
        print(f'  EXTRA: \"{ac}\" in tool-registry.ts but not in prototype')
        found_mismatch = True

if not found_mismatch:
    print('  OK: All category names match')
sys.exit(1 if found_mismatch else 0)
" || VIOLATIONS=$((VIOLATIONS + 1))

echo ""
echo "Total violations: $VIOLATIONS"
[ $VIOLATIONS -gt 0 ] && exit 1 || exit 0
