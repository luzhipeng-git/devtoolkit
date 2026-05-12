#!/usr/bin/env bash
# Prototype Conformance Audit
# Checks that Vue component templates match the structural elements
# defined in the corresponding prototype HTML files.
#
# Usage: pnpm run prototype:audit

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

exec python3 "$SCRIPT_DIR/prototype-audit.py" "$PROJECT_DIR"
