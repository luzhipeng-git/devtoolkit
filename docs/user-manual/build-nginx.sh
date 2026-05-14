#!/bin/bash
# =============================================================
# build-nginx.sh — 构建 Nginx 可部署的离线静态站点
#
# 用法: cd docs/user-manual && bash build-nginx.sh
# 输出: dist/ 目录，可直接用 nginx root 指令部署
#
# nginx 配置示例:
#   server {
#       listen 80;
#       server_name docs.example.com;
#       root /path/to/docs/user-manual/dist;
#       index index.html;
#       location / {
#           try_files $uri $uri/ /index.html;
#       }
#   }
# =============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
VENDOR_DIR="$DIST_DIR/vendor"

echo "=== DevToolkit 用户手册 — Nginx 静态站点构建 ==="

# ---- 1. 清理 & 创建输出目录 ----
echo "[1/5] 准备输出目录..."
rm -rf "$DIST_DIR"
mkdir -p "$VENDOR_DIR/css" "$VENDOR_DIR/js/plugins" "$VENDOR_DIR/js/prism"

# ---- 2. 复制内容文件 ----
echo "[2/5] 复制文档文件..."
cp -r "$SCRIPT_DIR/screenshots" "$DIST_DIR/"
cp "$SCRIPT_DIR/README.md" "$DIST_DIR/"
cp "$SCRIPT_DIR/SUMMARY.md" "$DIST_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/_sidebar.md" "$DIST_DIR/"

# 复制所有子目录中的 MD 文件
for dir in getting-started encoding json crypto calculator qrcode http time cron regex grok nginx config codec; do
    if [ -d "$SCRIPT_DIR/$dir" ]; then
        mkdir -p "$DIST_DIR/$dir"
        cp "$SCRIPT_DIR/$dir/"*.md "$DIST_DIR/$dir/" 2>/dev/null || true
    fi
done

# ---- 3. 下载 CDN 依赖到本地 ----
echo "[3/5] 下载 CDN 依赖..."

download() {
    local url="$1"
    local output="$2"
    if [ -f "$output" ]; then
        echo "  已存在: $(basename "$output")"
        return
    fi
    echo "  下载: $(basename "$output")"
    curl -sL "$url" -o "$output"
}

# CSS
download "https://cdn.jsdelivr.net/npm/docsify-themeable@0/dist/css/theme-simple-dark.css" "$VENDOR_DIR/css/theme-simple-dark.css"

# JS 核心
download "https://cdn.jsdelivr.net/npm/docsify@4/lib/docsify.min.js" "$VENDOR_DIR/js/docsify.min.js"

# JS 插件
download "https://cdn.jsdelivr.net/npm/docsify@4/lib/plugins/search.min.js" "$VENDOR_DIR/js/plugins/search.min.js"
download "https://cdn.jsdelivr.net/npm/docsify@4/lib/plugins/emoji.min.js" "$VENDOR_DIR/js/plugins/emoji.min.js"
download "https://cdn.jsdelivr.net/npm/docsify-pagination@2/dist/docsify-pagination.min.js" "$VENDOR_DIR/js/plugins/docsify-pagination.min.js"

# Prism 语法高亮
download "https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-json.min.js" "$VENDOR_DIR/js/prism/prism-json.min.js"
download "https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-yaml.min.js" "$VENDOR_DIR/js/prism/prism-yaml.min.js"
download "https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-bash.min.js" "$VENDOR_DIR/js/prism/prism-bash.min.js"
download "https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-java.min.js" "$VENDOR_DIR/js/prism/prism-java.min.js"
download "https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-python.min.js" "$VENDOR_DIR/js/prism/prism-python.min.js"
download "https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-go.min.js" "$VENDOR_DIR/js/prism/prism-go.min.js"
download "https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-typescript.min.js" "$VENDOR_DIR/js/prism/prism-typescript.min.js"

echo "  CDN 依赖下载完成"

# ---- 4. 生成离线版 index.html ----
echo "[4/5] 生成 index.html..."

cat > "$DIST_DIR/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevToolkit 用户使用手册</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔧</text></svg>">
  <style>body{margin:0}</style>
  <link rel="stylesheet" href="vendor/css/theme-simple-dark.css">
  <style>
    :root{--theme-color:#3b82f6;--sidebar-width:280px}
    .markdown-section img{max-width:100%;border:1px solid #333;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  </style>
</head>
<body>
  <div id="app">加载中...</div>
  <script>
    window.$docsify = {
      name: 'DevToolkit 用户使用手册',
      nameLink: '#/README',
      loadSidebar: '_sidebar.md',
      subMaxLevel: 3,
      auto2top: true,
      search: { placeholder: '搜索文档', noData: '没有找到结果', depth: 6 },
      pagination: { previousText: '上一章节', nextText: '下一章节', crossChapter: true, crossChapterText: true }
    }
  </script>
  <script src="vendor/js/docsify.min.js"></script>
  <script src="vendor/js/plugins/search.min.js"></script>
  <script src="vendor/js/plugins/emoji.min.js"></script>
  <script src="vendor/js/plugins/docsify-pagination.min.js"></script>
  <script src="vendor/js/prism/prism-json.min.js"></script>
  <script src="vendor/js/prism/prism-yaml.min.js"></script>
  <script src="vendor/js/prism/prism-bash.min.js"></script>
  <script src="vendor/js/prism/prism-java.min.js"></script>
  <script src="vendor/js/prism/prism-python.min.js"></script>
  <script src="vendor/js/prism/prism-go.min.js"></script>
  <script src="vendor/js/prism/prism-typescript.min.js"></script>
</body>
</html>
HTMLEOF

# ---- 5. 完成 ----
echo "[5/5] 构建完成!"
echo ""
echo "输出目录: $DIST_DIR"
echo "文件统计:"
echo "  MD 文件:  $(find "$DIST_DIR" -name '*.md' | wc -l)"
echo "  截图文件: $(find "$DIST_DIR/screenshots" -name '*.png' | wc -l)"
echo "  JS 文件:  $(find "$DIST_DIR/vendor" -name '*.js' | wc -l)"
echo "  CSS 文件: $(find "$DIST_DIR/vendor" -name '*.css' | wc -l)"
echo ""
echo "总大小: $(du -sh "$DIST_DIR" | cut -f1)"
echo ""
echo "--- 部署方式 ---"
echo ""
echo "方式 1: 直接用 nginx 部署"
echo "  server {"
echo "      listen 80;"
echo "      server_name docs.example.com;"
echo "      root $(realpath "$DIST_DIR");"
echo "      index index.html;"
echo "      location / { try_files \$uri \$uri/ /index.html; }"
echo "  }"
echo ""
echo "方式 2: 本地预览"
echo "  cd $DIST_DIR && python3 -m http.server 8380 --bind 0.0.0.0"
