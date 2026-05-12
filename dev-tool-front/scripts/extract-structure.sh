#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROTOTYPE="$PROJECT_DIR/../docs/ui-html/01-main-framework.html"
OUTPUT="$PROJECT_DIR/../docs/ui-structure.json"

if [ ! -f "$PROTOTYPE" ]; then
  echo "ERROR: Prototype file not found: $PROTOTYPE"
  exit 1
fi

python3 << 'PYEOF'
import re, json, sys

prototype = sys.argv[1]
output = sys.argv[2]

with open(prototype, 'r') as f:
    html = f.read()

# Find sidebar section - look between sidebar div and the collapse button or content area
sidebar_start = html.find('<div class="sidebar"')
if sidebar_start == -1:
    print('ERROR: Could not find sidebar', file=sys.stderr)
    sys.exit(1)

# Find the end of sidebar (collapse button)
sidebar_end = html.find('<button id="collapseBtn"', sidebar_start)
if sidebar_end == -1:
    sidebar_end = html.find('</aside>', sidebar_start)
if sidebar_end == -1:
    sidebar_end = html.find('<!-- Content Area', sidebar_start)

sidebar = html[sidebar_start:sidebar_end]

categories = []
current_category = None

for line in sidebar.split('\n'):
    line = line.strip()

    # Category title
    title_match = re.search(r'<div class="sidebar-group-title"[^>]*>(.*?)</div>', line)
    if title_match:
        current_category = {'name': title_match.group(1).strip(), 'items': []}
        categories.append(current_category)
        continue

    # Menu item
    item_match = re.search(r'<a class="sidebar-item"[^>]*>(.*?)</a>', line)
    if item_match:
        item_name = item_match.group(1).strip()
        # Skip "首页" which has no category
        if item_name == '首页':
            continue
        if current_category is not None:
            current_category['items'].append(item_name)

result = {
    'source': 'docs/ui-html/01-main-framework.html',
    'categories': categories,
    'total_items': sum(len(c['items']) for c in categories),
    'total_categories': len(categories),
    'rules': {
        'submenu_icons': False,
        'category_icons': False,
        'notes': 'Prototype has NO icons on submenu items or category titles'
    }
}

with open(output, 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Extracted structure to {output}")
print(f"Categories: {result['total_categories']}")
print(f"Menu items: {result['total_items']}")
PYEOF
