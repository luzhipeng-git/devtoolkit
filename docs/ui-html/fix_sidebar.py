#!/usr/bin/env python3
"""Fix sidebar links in all HTML files to use consistent, correct file names."""

import re
import os
import glob

# Canonical sidebar: (tool_name, html_file)
# The html_file matches the actual files on disk
SIDEBAR_STRUCTURE = [
    ("_group", "字符编码"),
    ("Hex 转换", "03-encoding.html"),
    ("Base64 编解码", "03b-base64.html"),
    ("ASCII 转换", "03c-ascii.html"),
    ("URL 编解码", "03d-url.html"),
    ("Unicode 编解码", "03e-unicode.html"),

    ("_group", "JSON 工具"),
    ("Pretty 格式化", "04-json.html"),
    ("JSON 压缩", "04b-json-minify.html"),
    ("反序列化", "04c-json-deserialize.html"),
    ("JSONPath 查询", "04d-json-path.html"),
    ("JSON Diff", "04e-json-diff.html"),

    ("_group", "加密解密"),
    ("AES 加密/解密", "05-crypto-aes.html"),
    ("DES/3DES", "05b-crypto-des.html"),
    ("RSA 工具", "06-crypto-rsa.html"),
    ("哈希摘要", "07-hash.html"),
    ("密钥工具", "08-keygen.html"),
    ("OpenSSL 工具", "09-openssl.html"),

    ("_group", "数字计算"),
    ("进制转换", "10-calculator.html"),

    ("_group", "二维码"),
    ("二维码生成", "11-qrcode.html"),
    ("二维码解析", "11b-qrcode-parse.html"),

    ("_group", "HTTP Client"),
    ("HTTP 请求", "12-http-client.html"),

    ("_group", "时间计算"),
    ("时间戳转换", "13-time.html"),

    ("_group", "Cron"),
    ("Cron 表达式", "14-cron.html"),

    ("_group", "正则调试"),
    ("正则调试", "15-regex.html"),

    ("_group", "Grok"),
    ("Grok 调试", "16-grok.html"),

    ("_group", "Nginx"),
    ("Nginx 工具", "17-nginx.html"),

    ("_group", "配置转换"),
    ("配置文件转换", "18-config-converter.html"),

    ("_group", "编码解码"),
    ("JWT 编解码", "19-codec.html"),
]

def build_sidebar(current_file):
    """Build the sidebar HTML with correct links and active state."""
    lines = []
    lines.append('      <div class="sidebar">')
    lines.append('        <div class="sidebar-search">')
    lines.append('          <input type="text" placeholder="搜索工具...">')
    lines.append('        </div>')

    # 首页 link
    home_active = ' active' if current_file == '02-home.html' else ''
    lines.append(f'        <a class="sidebar-item{home_active}" href="02-home.html">首页</a>')

    for item in SIDEBAR_STRUCTURE:
        if item[0] == "_group":
            lines.append(f'')
            lines.append(f'        <div class="sidebar-group-title">{item[1]}</div>')
        else:
            name, href = item
            active = ' active' if current_file == href else ''
            lines.append(f'        <a class="sidebar-item{active}" href="{href}">{name}</a>')

    lines.append('      </div>')
    return '\n'.join(lines)


def fix_file(filepath):
    """Fix sidebar in a single HTML file."""
    filename = os.path.basename(filepath)

    # Special case: framework page has placeholder content, skip active
    if filename == '01-main-framework.html':
        filename = '__none__'  # no active item

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_sidebar = build_sidebar(filename)

    # Pattern 1: <div class="sidebar"> ... </div> (single closing)
    # We need to find the sidebar div and replace its contents
    # The sidebar starts with <div class="sidebar"> and ends with </div>
    # But there may be nested divs, so we need to match carefully

    # Strategy: find the sidebar opening tag, then find the matching closing tag
    sidebar_start_pattern = r'<div class="sidebar"[^>]*>'
    match = re.search(sidebar_start_pattern, content)
    if not match:
        print(f"  WARNING: No sidebar found in {filename}")
        return False

    start_pos = match.start()

    # Find the matching closing </div> by counting nesting
    search_start = match.end()
    depth = 1
    pos = search_start
    while depth > 0 and pos < len(content):
        next_open = content.find('<div', pos)
        next_close = content.find('</div>', pos)

        if next_close == -1:
            print(f"  WARNING: Unmatched divs in {filename}")
            return False

        if next_open != -1 and next_open < next_close:
            depth += 1
            pos = next_open + 4
        else:
            depth -= 1
            if depth == 0:
                end_pos = next_close + len('</div>')
            pos = next_close + 6

    if depth != 0:
        print(f"  WARNING: Could not find sidebar end in {filename}")
        return False

    old_sidebar = content[start_pos:end_pos]
    new_content = content[:start_pos] + new_sidebar + content[end_pos:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  Fixed: {filename}")
    return True


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    html_files = sorted(glob.glob("*.html"))
    print(f"Found {len(html_files)} HTML files")

    fixed = 0
    for f in html_files:
        if fix_file(f):
            fixed += 1

    print(f"\nFixed {fixed}/{len(html_files)} files")


if __name__ == "__main__":
    main()
