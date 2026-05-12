#!/usr/bin/env python3
"""Prototype Conformance Audit.

Checks that each Vue component contains the key structural elements
present in its corresponding prototype HTML file.

Checks per tool:
  1. Section/card count matches
  2. Tab elements present where prototype has them
  3. Key-value tables present where prototype has them
  4. Copy functionality present where prototype has it
  5. Select/dropdown elements present where prototype has them
  6. Textarea/editor elements present where prototype has them
  7. History section present where prototype has it
  8. Swap button present where prototype has it
"""

import re
import sys
import os
from pathlib import Path
from dataclasses import dataclass, field

# Mapping: (prototype_filename, vue_component_path)
PROTO_VUE_MAP = [
    ("03-encoding", "encoding/HexConverter.vue"),
    ("03b-base64", "encoding/Base64Converter.vue"),
    ("03c-ascii", "encoding/AsciiConverter.vue"),
    ("03d-url", "encoding/UrlConverter.vue"),
    ("03e-unicode", "encoding/UnicodeConverter.vue"),
    ("04-json", "json/JsonFormatter.vue"),
    ("04c-json-deserialize", "json/JsonDeserializer.vue"),
    ("04d-json-path", "json/JsonPathQuery.vue"),
    ("04e-json-diff", "json/JsonDiff.vue"),
    ("05-crypto-aes", "crypto/AesCrypto.vue"),
    ("05b-crypto-des", "crypto/DesCrypto.vue"),
    ("06-crypto-rsa", "crypto/RsaCrypto.vue"),
    ("07-hash", "hash/HashDigest.vue"),
    ("08-keygen", "key/KeyGenerator.vue"),
    ("09-openssl", "openssl/OpenSslTool.vue"),
    ("10-calculator", "calculator/BaseConverter.vue"),
    ("11-qrcode", "qrcode/QrCodeGenerator.vue"),
    ("11b-qrcode-parse", "qrcode/QrCodeParser.vue"),
    ("12-http-client", "http/HttpClient.vue"),
    ("13-time", "time/TimestampConverter.vue"),
    ("14-cron", "cron/CronEditor.vue"),
    ("15-regex", "regex/RegexTester.vue"),
    ("16-grok", "grok/GrokTester.vue"),
    ("17-nginx", "nginx/NginxFormatter.vue"),
    ("18-config-converter", "config/PropertiesYamlConverter.vue"),
    ("19-codec", "codec/JwtCodec.vue"),
]


@dataclass
class CheckResult:
    passed: bool
    messages: list[str] = field(default_factory=list)


def count_pattern(text: str, pattern: str) -> int:
    return len(re.findall(pattern, text))


def check_tool(proto_path: Path, vue_path: Path) -> CheckResult:
    result = CheckResult(passed=True)

    if not proto_path.exists():
        result.messages.append(f"Prototype not found: {proto_path}")
        result.passed = False
        return result

    if not vue_path.exists():
        result.messages.append(f"Vue component not found: {vue_path}")
        result.passed = False
        return result

    proto = proto_path.read_text(encoding="utf-8")
    vue = vue_path.read_text(encoding="utf-8")

    # Extract <body> section from prototype to avoid matching CSS class definitions in <style>
    body_match = re.search(r"<body[^>]*>(.*)</body>", proto, re.DOTALL | re.IGNORECASE)
    proto_body = body_match.group(1) if body_match else proto
    # Also strip <script> blocks from proto body to avoid matching JS string literals
    proto_body = re.sub(r"<script[^>]*>.*?</script>", "", proto_body, flags=re.DOTALL | re.IGNORECASE)

    # Extract <template> section from Vue
    template_match = re.search(r"<template>(.*)</template>", vue, re.DOTALL)
    vue_template = template_match.group(1) if template_match else vue

    # Common components that render specific CSS classes.
    # If a component tag is found in the Vue template, the corresponding
    # CSS class patterns are considered present (rendered by the component).
    COMMON_COMPONENT_MAP = {
        "ToolTabs": ["tool-tab", "tool-header"],
        "OptionsPanel": ["option-select", "option-group", "option-label"],
        "SwapButton": ["swap-btn", "swap-btn-container"],
        "HistorySection": ["history-section", "history-header"],
        "CopyButton": ["btn-copy", "复制"],
    }

    def has_css_or_component(css_pattern: str, component_tags: list[str] = None) -> bool:
        """Check if a CSS class pattern exists in the template directly OR via a common component."""
        if count_pattern(vue_template, css_pattern) > 0:
            return True
        if component_tags:
            for tag in component_tags:
                if f"<{tag}" in vue_template:
                    return True
        return False

    def fail(msg: str):
        result.passed = False
        result.messages.append(msg)

    # --- Check 1: Sections ---
    section_pattern = r'class="[^"]*(?:time-section|section-title)[^"]*"'
    proto_sections = count_pattern(proto_body, section_pattern)
    vue_sections = count_pattern(vue_template, section_pattern)

    if proto_sections >= 2 and vue_sections < proto_sections:
        fail(f"Section count: Vue has {vue_sections} but prototype has {proto_sections}")

    # --- Check 2: Tabs ---
    proto_tab_els = count_pattern(proto_body, r'class="[^"]*(?:tool-tab|tab-btn|req-config-tab|method-badge)[^"]*"')

    if proto_tab_els > 0:
        vue_has_tabs = (
            has_css_or_component(r'class="[^"]*(?:tool-tab|tab-btn|req-config-tab|method-badge)[^"]*"', ["ToolTabs"]) or
            has_css_or_component(r'class="[^"]*tab[^"]*"', [])
        )
        if not vue_has_tabs:
            fail("Missing tabs: prototype has tab elements but Vue has none")

    # --- Check 3: KV tables ---
    proto_kv = count_pattern(proto_body, r'kv-table|header-row|form-row')
    vue_kv = count_pattern(vue_template, r'kv-table|header-row|form-row')

    if proto_kv > 0 and vue_kv == 0:
        fail("Missing key-value table: prototype has kv-table but Vue has none")

    # --- Check 4: Copy buttons ---
    proto_copy = count_pattern(proto_body, r'btn-copy|CopyButton|复制')

    if proto_copy > 0:
        if not has_css_or_component(r'CopyButton|btn-copy|复制', ["CopyButton"]):
            fail("Missing copy buttons: prototype has copy functionality but Vue has none")

    # --- Check 5: Select/dropdown ---
    proto_selects = count_pattern(proto_body, r'<select')

    if proto_selects > 0:
        vue_has_select = (
            has_css_or_component(r'<select|option-select', ["OptionsPanel"]) or
            has_css_or_component(r'type="radio"|radio-group', [])
        )
        if not vue_has_select:
            fail("Missing select/dropdown: prototype has <select> but Vue has none")

    # --- Check 6: Textarea/editor ---
    proto_textarea = count_pattern(proto_body, r'<textarea|editor-textarea|body-textarea')
    vue_textarea = count_pattern(vue_template, r'<textarea|editor-textarea|body-textarea')

    if proto_textarea > 0 and vue_textarea == 0:
        fail("Missing textarea: prototype has text areas but Vue has none")

    # --- Check 7: History section ---
    proto_history = count_pattern(proto_body, r'history-section|history-header')

    if proto_history > 0:
        if not has_css_or_component(r'history-section|history-header', ["HistorySection"]):
            fail("Missing history section: prototype has history but Vue has none")

    # --- Check 8: Swap button ---
    proto_swap = count_pattern(proto_body, r'swap-btn')

    if proto_swap > 0:
        if not has_css_or_component(r'swap-btn', ["SwapButton"]):
            fail("Missing swap button: prototype has swap but Vue has none")

    # --- Check 9: Radio group ---
    proto_radio = count_pattern(proto_body, r'type="radio"|radio-group|radio-item')
    vue_radio = count_pattern(vue_template, r'type="radio"|radio-group|radio-item')

    if proto_radio > 0 and vue_radio == 0:
        fail("Missing radio buttons: prototype has radio groups but Vue has none")

    # --- Check 10: Format selector ---
    proto_format_select = count_pattern(proto_body, r'format-select|format-row|calc-select')
    vue_format = count_pattern(vue_template, r'format-select|format-row|calc-select|format-label')

    if proto_format_select > 0 and vue_format == 0:
        fail("Missing format selector: prototype has format selection but Vue has none")

    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: prototype-audit.py <project_dir>")
        sys.exit(1)

    project_dir = Path(sys.argv[1])
    doc_root = project_dir.parent
    prototype_dir = doc_root / "docs" / "ui-html"
    views_dir = project_dir / "src" / "views" / "tools"

    print("=== Prototype Conformance Audit ===")
    print("Checking Vue components against prototype HTML files...")
    print()

    violations = 0
    passed = 0
    total = 0

    for proto_name, vue_rel in PROTO_VUE_MAP:
        proto_path = prototype_dir / f"{proto_name}.html"
        vue_path = views_dir / vue_rel
        total += 1

        check = check_tool(proto_path, vue_path)

        if not check.passed:
            violations += 1
            print(f"FAIL: {vue_rel}")
            for msg in check.messages:
                print(f"  {msg}")
            print()
        else:
            passed += 1

    print("=== Summary ===")
    print(f"Tools checked: {total}")
    print(f"Passed: {passed}")
    print(f"Violations: {violations}")
    print()

    if violations > 0:
        print("FAIL: Some Vue components do not match prototype structure.")
        print("Compare the Vue component with its corresponding docs/ui-html/ prototype.")
        print("See CLAUDE.md for prototype authority rules.")
        sys.exit(1)
    else:
        print("PASS: All checked components match prototype structure.")
        sys.exit(0)


if __name__ == "__main__":
    main()
