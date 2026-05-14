#!/usr/bin/env python3
"""
build-chm.py — 将用户手册转换为 CHM 电子书（或纯 HTML 目录）

用法:
  cd docs/user-manual
  python3 build-chm.py

输出:
  chm-output/html/     — 纯 HTML 文件（可直接浏览器打开）
  chm-output/devtoolkit.hhp — CHM 项目文件（可用 hhc 编译为 .chm）
  chm-output/devtoolkit.chm — CHM 文件（需要 hhc.exe）

依赖:
  pip3 install markdown-it-py pygments

CHM 编译:
  Windows:  hhc devtoolkit.hhp
  Linux:    wine "/path/to/HTML Help Workshop/hhc.exe" devtoolkit.hhp
  如果没有 hhc: 直接打开 chm-output/html/index.html 浏览
"""

import os
import re
import sys
import shutil
import subprocess
from pathlib import Path
from html import escape

# ============================================================
# 配置
# ============================================================

SCRIPT_DIR = Path(__file__).parent.resolve()
OUTPUT_DIR = SCRIPT_DIR / "chm-output"
HTML_DIR = OUTPUT_DIR / "html"
SIDEBAR_FILE = SCRIPT_DIR / "_sidebar.md"
PROJECT_NAME = "DevToolkit用户使用手册"
HHP_FILE = OUTPUT_DIR / "devtoolkit.hhp"
HHC_FILE = OUTPUT_DIR / "devtoolkit.hhc"
HHK_FILE = OUTPUT_DIR / "devtoolkit.hhk"

# ============================================================
# Markdown → HTML
# ============================================================

def init_markdown():
    """初始化 markdown-it 解析器"""
    from markdown_it import MarkdownIt
    from pygments import highlight
    from pygments.lexers import get_lexer_by_name, guess_lexer, TextLexer
    from pygments.formatters import HtmlFormatter

    md = MarkdownIt("commonmark", {"html": True})
    md.enable("table")

    pygments_css = HtmlFormatter().get_style_defs(".highlight")

    def highlight_code(code, lang, _attrs):
        try:
            lexer = get_lexer_by_name(lang) if lang else TextLexer()
        except Exception:
            lexer = TextLexer()
        formatter = HtmlFormatter(cssclass="highlight")
        return highlight(code, lexer, formatter)

    md.options["highlight"] = highlight_code
    return md, pygments_css


# ============================================================
# 解析侧边栏
# ============================================================

def parse_sidebar(sidebar_path: Path) -> list:
    """解析 _sidebar.md 返回目录结构

    返回格式: [(title, md_path, level), ...]
    """
    entries = []
    if not sidebar_path.exists():
        print(f"警告: 侧边栏文件不存在: {sidebar_path}")
        return entries

    with open(sidebar_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip()
            if not line.strip() or line.strip().startswith("- **"):
                # 分类标题行
                title = re.sub(r"- \*\*(.+?)\*\*", r"\1", line.strip())
                if title and title != line.strip():
                    entries.append((title.strip(), None, 0))
                continue
            # 链接行:   - [title](path)
            m = re.match(r"(\s+)- \[(.+?)\]\((.+?)\)", line)
            if m:
                indent = len(m.group(1))
                title = m.group(2)
                path = m.group(3)
                level = 1 if indent <= 2 else 2
                entries.append((title, path, level))
    return entries


# ============================================================
# HTML 模板
# ============================================================

def get_html_template(pygments_css: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>TITLE_PLACEHOLDER - {escape(PROJECT_NAME)}</title>
<style>
:root {{ --primary: #3b82f6; --bg: #fff; --text: #1f2937;
       --text-muted: #6b7280; --border: #e5e7eb; }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
       font-size: 14px; color: var(--text); background: var(--bg); }}
h1 {{ font-size: 28px; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 2px solid var(--primary); }}
h2 {{ font-size: 22px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }}
h3 {{ font-size: 17px; margin: 24px 0 12px; }}
p {{ margin: 8px 0; line-height: 1.7; }}
ul, ol {{ margin: 8px 0 8px 24px; line-height: 1.8; }}
li {{ margin: 2px 0; }}
code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: "JetBrains Mono", Consolas, monospace; }}
pre {{ background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }}
pre code {{ background: none; padding: 0; color: inherit; }}
table {{ border-collapse: collapse; width: 100%; margin: 12px 0; }}
th, td {{ border: 1px solid var(--border); padding: 8px 12px; text-align: left; }}
th {{ background: #f8fafc; font-weight: 600; }}
img {{ max-width: 100%; border: 1px solid #ddd; border-radius: 6px; margin: 8px 0; }}
blockquote {{ border-left: 4px solid var(--primary); padding: 8px 16px; margin: 12px 0; background: #f8fafc; }}
hr {{ border: none; border-top: 1px solid var(--border); margin: 24px 0; }}
{pygments_css}
</style>
</head>
<body>
{{content}}
</body>
</html>"""


def render_sidebar_html(entries: list, current_path: str = "") -> str:
    """根据侧边栏条目生成 HTML 导航"""
    html_parts = []
    for title, md_path, level in entries:
        if md_path is None:
            # 分类标题
            html_parts.append(f'<div class="sidebar-category">{escape(title)}</div>')
        else:
            # 链接项
            html_file = md_path.replace(".md", ".html")
            active = ' active' if html_file == current_path else ''
            html_parts.append(
                f'<a class="sidebar-item{active}" href="{html_file}">{escape(title)}</a>'
            )
    return "\n".join(html_parts)


# ============================================================
# MD → HTML 转换
# ============================================================

def convert_md_to_html(md: object, template: str, sidebar_entries: list,
                       md_path: Path, base_dir: Path) -> tuple:
    """转换单个 MD 文件为 HTML

    返回: (html_filename, html_content)
    """
    rel_path = md_path.relative_to(base_dir)
    html_filename = str(rel_path.with_suffix(".html"))

    # 读取 MD 内容
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    # 转换 MD → HTML body
    html_body = md.render(md_content)

    # 图片路径已经是 ../screenshots/ 相对于子目录下的 HTML 文件是正确的，无需修改

    # 提取标题
    title_match = re.search(r"<h1[^>]*>(.+?)</h1>", html_body)
    title = title_match.group(1) if title_match else PROJECT_NAME
    # 去掉 HTML 标签
    title = re.sub(r"<[^>]+>", "", title)

    # 填充模板
    html_content = template.replace("TITLE_PLACEHOLDER", escape(title))
    html_content = html_content.replace("{content}", html_body)

    return html_filename, html_content


# ============================================================
# CHM 项目文件生成
# ============================================================

def generate_hhp(html_files: list):
    """生成 .hhp 项目文件"""
    lines = [
        "[OPTIONS]",
        f"Title={PROJECT_NAME}",
        "Compatibility=1.1 or later",
        "Compiled file=devtoolkit.chm",
        "Contents file=devtoolkit.hhc",
        "Index file=devtoolkit.hhk",
        "Default topic=html\\index.html",
        "Display compile progress=Yes",
        "Language=0x804 中文(中国)",
        "",
        "[FILES]",
    ]
    for f in sorted(html_files):
        lines.append("html\\" + f.replace("/", "\\"))
    # 列出所有截图文件（chmcmd 不支持通配符）
    screenshots_dir = HTML_DIR / "screenshots"
    if screenshots_dir.exists():
        for sf in sorted(screenshots_dir.rglob("*.png")):
            lines.append("html\\" + str(sf.relative_to(HTML_DIR)).replace("/", "\\"))

    hhp_content = "\r\n".join(lines)
    try:
        with open(HHP_FILE, "w", encoding="gbk") as f:
            f.write(hhp_content)
    except UnicodeEncodeError:
        with open(HHP_FILE, "w", encoding="gb18030") as f:
            f.write(hhp_content)
    print(f"  生成: {HHP_FILE}")


def generate_hhc(entries: list):
    """生成 .hhc 目录文件（GBK 编码，正确嵌套结构）"""
    lines = [
        "<!DOCTYPE HTML PUBLIC '-//IETF//DTD HTML//EN'>",
        '<HTML><HEAD><meta http-equiv="Content-Type" content="text/html; charset=gb2312"></HEAD><BODY>',
        "<UL>",
        '<LI><OBJECT type="text/sitemap">',
        f'<param name="Name" value="{PROJECT_NAME}">',
        '</OBJECT>',
        "<UL>",
    ]

    for title, md_path, level in entries:
        if md_path is None:
            # 分类标题：关闭上一个分类的 UL，然后开新分类
            lines.append("</UL>")
            lines.append('<LI><OBJECT type="text/sitemap">')
            lines.append(f'<param name="Name" value="{title}">')
            lines.append('</OBJECT>')
            lines.append("<UL>")
        else:
            html_file = ("html/" + md_path.replace(".md", ".html")).replace("/", "\\")
            lines.append('<LI><OBJECT type="text/sitemap">')
            lines.append(f'<param name="Name" value="{title}">')
            lines.append(f'<param name="Local" value="{html_file}">')
            lines.append('</OBJECT>')

    # 关闭最后一个分类的 UL + 外层 UL
    lines.append("</UL>")
    lines.append("</UL>")
    lines.append("</BODY></HTML>")

    hhc_content = "\r\n".join(lines)
    # 写入 GBK 编码（CHM 目录要求的编码）
    try:
        with open(HHC_FILE, "w", encoding="gbk") as f:
            f.write(hhc_content)
    except UnicodeEncodeError:
        # 如果 GBK 无法编码某些字符，回退到 GB18030
        with open(HHC_FILE, "w", encoding="gb18030") as f:
            f.write(hhc_content)
    print(f"  生成: {HHC_FILE}")


def generate_hhk():
    """生成空索引文件（CHM 需要但索引可选）"""
    content = (
        "<!DOCTYPE HTML PUBLIC '-//IETF//DTD HTML//EN'>\n"
        "<HTML><HEAD></HEAD><BODY>\n"
        "<UL>\n"
        "</UL>\n"
        "</BODY></HTML>"
    )
    with open(HHK_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  生成: {HHK_FILE}")


# ============================================================
# 纯 Python CHM 二进制写入
# ============================================================


def compile_chm_binary(html_dir: Path, output_path: Path):
    """用纯 Python 写入 CHM (ITSF) 二进制文件

    CHM 格式: ITSF header → ITSP directory → PMGL entries → content DATA
    """
    import struct

    GUID_BLANK = b"\x00" * 16
    BLOCK_SIZE = 0x1000  # 4096

    def pad_to(buf, size):
        return buf + b"\x00" * (size - len(buf))

    def align_up(offset):
        return (offset + BLOCK_SIZE - 1) & ~(BLOCK_SIZE - 1)

    # --- 收集文件 ---
    files = []
    for fp in sorted(html_dir.rglob("*")):
        if fp.is_file():
            rel = "\\" + str(fp.relative_to(html_dir)).replace("/", "\\")
            data = fp.read_bytes()
            files.append((rel, data))
    if not files:
        raise RuntimeError("没有文件可打包")

    total_content = sum(len(d) for _, d in files)
    print(f"  文件数量: {len(files)}, 总内容: {total_content / 1024:.0f} KB")

    # --- 名称表: UTF-16LE null-terminated ---
    name_buf = b""
    name_offsets = {}
    for name, _ in files:
        name_offsets[name] = len(name_buf)
        name_buf += name.encode("utf-16-le") + b"\x00\x00"

    # --- PMGL 条目: each 16 bytes ---
    pmgl_entries = b""
    content_offset = 0
    for name, data in files:
        pmgl_entries += struct.pack("<IIII",
                                    name_offsets[name],
                                    content_offset,
                                    len(data),
                                    len(data))
        content_offset += len(data)

    # --- PMGL block: header(20) + name_buf + pmgl_entries + quickref ---
    pmgl_data = b"PMGL"
    free_space = BLOCK_SIZE - 20 - len(name_buf) - len(pmgl_entries) - 2
    pmgl_data += struct.pack("<I", 20 + len(name_buf) + len(pmgl_entries))  # free space offset
    pmgl_data += struct.pack("<I", 0xFFFFFFFF)  # prev block
    pmgl_data += struct.pack("<I", 0xFFFFFFFF)  # next block
    pmgl_data += name_buf
    pmgl_data += pmgl_entries
    # quickref at end of block
    pmgl_data = pad_to(pmgl_data, BLOCK_SIZE - 2)
    pmgl_data += struct.pack("<H", len(files))
    pmgl_data = pad_to(pmgl_data, BLOCK_SIZE)

    # --- 内容数据 ---
    content_data = b"".join(data for _, data in files)

    # --- 偏移计算 ---
    itsf_header_size = 96 + 3 * 12  # header + 3 section descriptors
    section0_offset = BLOCK_SIZE  # directory starts at 0x1000
    section1_offset = align_up(section0_offset + len(pmgl_data))  # content

    # --- 写入 ---
    with open(output_path, "wb") as f:
        # === ITSF Header ===
        f.write(b"ITSF")
        f.write(struct.pack("<I", 4))           # version
        f.write(struct.pack("<H", itsf_header_size))  # header length
        f.write(struct.pack("<H", 1))            # flags
        f.write(struct.pack("<I", 0xFFFFFFFF))   # timestamp
        f.write(struct.pack("<I", 0x0804))       # language (Chinese)
        f.write(GUID_BLANK)                      # CLSID1
        f.write(GUID_BLANK)                      # CLSID2

        # Section descriptors: offset(u64) + length(u32) each
        f.write(struct.pack("<QI", section0_offset, len(pmgl_data)))   # section 0: dir
        f.write(struct.pack("<QI", section1_offset, len(content_data))) # section 1: content
        f.write(struct.pack("<QI", 0, 0))                              # section 2: unused

        # Pad to section 0
        f.write(b"\x00" * (section0_offset - f.tell()))

        # === Section 0: ITSP + PMGL ===
        f.write(b"ITSP")
        f.write(struct.pack("<I", 1))            # version
        f.write(struct.pack("<I", 0x54))          # header length (84)
        f.write(struct.pack("<I", 1))             # unknown (1)
        f.write(struct.pack("<I", BLOCK_SIZE))    # block size
        f.write(struct.pack("<I", 0))             # density
        f.write(struct.pack("<I", 0))             # depth
        f.write(struct.pack("<I", 1))             # num dir blocks
        f.write(struct.pack("<I", 0xFFFFFFFF))    # index of PMGI (-1 = none)
        f.write(GUID_BLANK)                       # CLSID
        f.write(struct.pack("<Q", 0xFFFFFFFF))    # first free block
        f.write(struct.pack("<Q", 0xFFFFFFFF))    # last free block
        f.write(b"\x00" * 16)                     # padding

        # PMGL block
        f.write(pmgl_data)

        # Pad to section 1
        pad = section1_offset - f.tell()
        if pad > 0:
            f.write(b"\x00" * pad)

        # === Section 1: Content ===
        f.write(content_data)

    size_kb = output_path.stat().st_size / 1024
    print(f"  CHM 文件大小: {size_kb:.1f} KB")

def try_compile_chm():
    """编译 CHM：优先 chmcmd，备选纯 Python"""
    chm_output = OUTPUT_DIR / "devtoolkit.chm"

    # 方案 1: 使用 chmcmd（Free Pascal CHM 编译器）
    chmcmd = shutil.which("chmcmd")
    if chmcmd:
        print(f"  使用 chmcmd: {chmcmd}")
        try:
            result = subprocess.run(
                [chmcmd, "--verbosity", "1", str(HHP_FILE)],
                capture_output=True, text=True, timeout=120, cwd=str(OUTPUT_DIR)
            )
            if chm_output.exists():
                size_kb = chm_output.stat().st_size / 1024
                if size_kb > 1:
                    print(f"\n  CHM 编译成功 (chmcmd): {chm_output} ({size_kb:.1f} KB)")
                    return True
            print(f"  chmcmd 输出: {result.stdout[:300]}")
            if result.stderr:
                print(f"  chmcmd 错误: {result.stderr[:200]}")
        except Exception as e:
            print(f"  chmcmd 失败: {e}")

    # 方案 2: 纯 Python 写入
    print("  使用纯 Python 编译 CHM 文件...")
    try:
        compile_chm_binary(HTML_DIR, chm_output)
        if chm_output.exists():
            size_kb = chm_output.stat().st_size / 1024
            if size_kb > 1:
                print(f"\n  CHM 编译成功: {chm_output} ({size_kb:.1f} KB)")
                return True
    except Exception as e:
        print(f"\n  CHM 编译失败: {e}")

    return False


# ============================================================
# 主流程
# ============================================================

def main():
    print(f"=== {PROJECT_NAME} — CHM 电子书构建 ===\n")

    # 初始化
    md, pygments_css = init_markdown()
    template = get_html_template(pygments_css)
    sidebar_entries = parse_sidebar(SIDEBAR_FILE)

    if not sidebar_entries:
        print("错误: 无法解析侧边栏，请检查 _sidebar.md")
        sys.exit(1)

    print(f"[1/4] 解析侧边栏: {len(sidebar_entries)} 个条目")

    # 清理 & 创建输出目录
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    HTML_DIR.mkdir(parents=True)

    # 复制截图
    screenshots_src = SCRIPT_DIR / "screenshots"
    screenshots_dst = HTML_DIR / "screenshots"
    if screenshots_src.exists():
        shutil.copytree(screenshots_src, screenshots_dst)
        png_count = len(list(screenshots_dst.rglob("*.png")))
        print(f"[2/4] 复制截图: {png_count} 张")
    else:
        print("[2/4] 警告: screenshots/ 目录不存在")

    # 转换所有 MD 文件
    print("[3/4] 转换 Markdown → HTML...")
    html_files = []
    md_count = 0

    for title, md_path, level in sidebar_entries:
        if md_path is None:
            continue
        src_path = SCRIPT_DIR / md_path
        if not src_path.exists():
            print(f"  跳过（文件不存在）: {md_path}")
            continue

        html_filename, html_content = convert_md_to_html(md, template, sidebar_entries, src_path, SCRIPT_DIR)
        out_path = HTML_DIR / html_filename
        out_path.parent.mkdir(parents=True, exist_ok=True)

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        html_files.append(html_filename)
        md_count += 1

    # 生成首页（从 README.md）
    readme_src = SCRIPT_DIR / "README.md"
    if readme_src.exists():
        html_filename, html_content = convert_md_to_html(md, template, sidebar_entries, readme_src, SCRIPT_DIR)
        with open(HTML_DIR / "index.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        html_files.append("index.html")
        md_count += 1

    print(f"  转换完成: {md_count} 个文件")

    # 生成 CHM 项目文件
    print("[4/4] 生成 CHM 项目文件...")
    generate_hhp(html_files)
    generate_hhc(sidebar_entries)
    generate_hhk()

    # 尝试编译 CHM
    print("\n尝试编译 CHM...")
    if try_compile_chm():
        print(f"\n构建完成! CHM 文件: {OUTPUT_DIR / 'devtoolkit.chm'}")
    else:
        print("\n未找到 hhc 编译器，跳过 CHM 编译")
        print(f"HTML 文件已就绪，可直接浏览器打开: {HTML_DIR / 'index.html'}")
        print("\n如需编译 CHM，请安装 HTML Help Workshop:")
        print("  Windows: 安装 HTML Help Workshop")
        print("  Linux:   安装 wine，然后运行:")
        print(f"           wine 'C:\\\\Program Files\\\\HTML Help Workshop\\\\hhc.exe' {HHP_FILE}")

    # 输出统计
    total_size = sum(f.stat().st_size for f in HTML_DIR.rglob("*") if f.is_file())
    print(f"\n--- 统计 ---")
    print(f"  HTML 文件: {len(list(HTML_DIR.rglob('*.html')))}")
    print(f"  截图文件: {len(list(HTML_DIR.rglob('*.png')))}")
    print(f"  总大小: {total_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
