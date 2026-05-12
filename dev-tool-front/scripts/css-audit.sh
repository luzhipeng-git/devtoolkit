#!/usr/bin/env bash
# CSS Audit: Detect scoped styles that conflict with common.css
# Usage: pnpm run css:audit

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMMON_CSS="$PROJECT_DIR/src/assets/styles/common.css"

if [ ! -f "$COMMON_CSS" ]; then
  echo "ERROR: common.css not found at $COMMON_CSS"
  exit 1
fi

# Extract top-level class names from common.css (not modifier pseudo-classes)
# Matches: .class-name { or .class-name, (top-level selectors only)
COMMON_CLASSES=$(grep -oP '^\.[a-zA-Z][\w-]*(?=[\s{,:])' "$COMMON_CSS" | sort -u | sed 's/^\.//')

echo "=== CSS Scoped Style Audit ==="
echo "Checking for conflicts with common.css..."
echo ""

VIOLATIONS=0
FILES_CHECKED=0

while IFS= read -r -d '' file; do
  FILES_CHECKED=$((FILES_CHECKED + 1))

  # Extract class names from <style scoped> blocks only
  SCOPED_CLASSES=$(awk '/<style scoped>/,/<\/style>/' "$file" | grep -oP '^\.[a-zA-Z][\w-]*(?=[\s{,:])' | sort -u | sed 's/^\.//' || true)

  if [ -z "$SCOPED_CLASSES" ]; then
    continue
  fi

  CONFLICTS=""
  while IFS= read -r cls; do
    [ -z "$cls" ] && continue
    if echo "$COMMON_CLASSES" | grep -qx "$cls"; then
      CONFLICTS="$CONFLICTS $cls"
    fi
  done <<< "$SCOPED_CLASSES"

  if [ -n "$CONFLICTS" ]; then
    VIOLATIONS=$((VIOLATIONS + 1))
    REL_PATH="${file#$PROJECT_DIR/}"
    echo "CONFLICT: $REL_PATH"
    echo "  Classes overriding common.css:$CONFLICTS"
    echo ""
  fi
done < <(find "$PROJECT_DIR/src" -name "*.vue" -print0)

echo "=== Summary ==="
echo "Files checked: $FILES_CHECKED"
echo "Violations: $VIOLATIONS"

if [ $VIOLATIONS -gt 0 ]; then
  echo ""
  echo "FAIL: Remove conflicting scoped styles or use modifier classes instead."
  echo "See CLAUDE.md for CSS architecture rules."
  exit 1
else
  echo "PASS: No conflicts found."
  exit 0
fi
