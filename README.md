# DevToolkit

一款面向开发者的桌面工具箱，集成编码转换、加解密、JSON 处理、HTTP 调试等常用开发工具。

## 技术栈

- **桌面框架**：Tauri v2
- **前端**：Vue 3 + TypeScript + Naive UI
- **后端**：Rust
- **构建工具**：Vite

## 功能模块

- 字符编码转换（Hex / Base64 / ASCII / URL / Unicode）
- JSON 工具（格式化 / 压缩 / 反序列化 / JSONPath / Diff）
- 加密解密（AES / DES / 3DES / RSA / 哈希摘要 / 密钥工具 / OpenSSL）
- 数字计算（进制转换 / 公式求值）
- 二维码生成与解析
- HTTP Client
- 时间计算 / Cron 表达式
- 正则调试 / Grok 调试
- Nginx 配置工具
- 配置文件转换（Properties / YAML / JSON）
- 编码解码（JWT / HTML 实体 / 颜色转换）

## 开发

```bash
# 安装前端依赖
cd dev-tool-front
pnpm install

# 启动前端开发服务器
pnpm dev

# 启动 Rust HTTP 后端（开发模式）
cd src-tauri && cargo run -p devtoolkit-server

# 构建
pnpm build
```

## 构建 & 发布

推送 `v*` 格式的 Git Tag 触发 GitHub Actions 自动构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

构建产物发布到 GitHub Releases，支持 Windows (NSIS) 和 macOS (DMG)。

## License

MIT
