# 桌面开发者工具箱 - 工作计划

> 版本：v3.0
> 日期：2026-04-27
> 状态：技术选型已确认（Tauri v2 + GitHub Actions CI/CD）

---

## 工作流程总览

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ① UI 设计                                                  │
│  │                                                          │
│  │  Step 1: SVG 线框图 ──→ 逐个界面与你确认布局               │
│  │          ↓                                                │
│  │  Step 2: 交互流程文档 ──→ 逐个工具与你确认操作路径和状态流转  │
│  │          ↓                                                │
│  │  Step 3: Naive UI 静态 HTML ──→ 逐个界面与你确认视觉效果    │
│  │                                                          │
│  ↓                                                          │
│  ② 开发实现                                                  │
│  │  骨架搭建 → 工具模块逐一开发 → 前后端联调                    │
│  │                                                          │
│  ↓                                                          │
│  ③ 测试                                                      │
│  │  编写测试案例文档(MD) → Playwright E2E 执行 → 生成测试报告(MD) │
│  │                                                          │
│  ↓                                                          │
│  ④ 桌面安装程序                                               │
│     打包配置 → 安装程序制作 → 自动更新                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ① UI 设计

### Step 1：SVG 线框图设计

逐个界面出 SVG 布局示意图，每出一个与你确认一次，确认通过后再做下一个。

**界面清单（按优先级排序）：**

| # | 界面 | 说明 |
|---|------|------|
| 1 | 主框架布局 | 窗口整体结构：标题栏 + 侧边栏 + 内容区 + 搜索弹窗 |
| 2 | 首页/收藏页 | 启动后默认页，展示收藏工具、最近使用 |
| 3 | 字符编码转换 | Hex/Base64/ASCII/URL/Unicode 编解码 |
| 4 | JSON 工具 | Pretty/压缩/反序列化树形展示/JSONPath/Diff |
| 5 | 对称加密（AES/DES） | 密钥/IV 输入、模式选择、加解密切换 |
| 6 | RSA 工具 | 密钥对生成、加解密、签名验签 |
| 7 | 哈希摘要 | MD5/SHA 系列/HMAC 计算 |
| 8 | 密钥工具 | 随机密钥生成、KCV 计算 |
| 9 | OpenSSL 工具 | 命令生成器、证书解析、格式转换 |
| 10 | 数字计算 | 进制转换、公式求值、取模、整除 |
| 11 | 二维码工具 | 生成 + 解析（截图粘贴/拖拽） |
| 12 | HTTP Client | 请求构造、响应查看、cURL 互转 |
| 13 | 时间计算 | 时间戳转换、时间推算 |
| 14 | Cron 表达式 | 可视化配置 + 表达式双向同步 + 执行预览 |
| 15 | 正则调试 | 正则输入 + 匹配高亮 + 分组展示 + 常用库 |
| 16 | Grok 调试 | Grok 表达式 + 日志解析 + 模式库 |
| 17 | Nginx 工具 | 格式化 + 校验 + 模板选择 + Diff |
| 18 | 配置文件转换 | Properties ↔ YAML ↔ JSON 互转 |
| 19 | 编码/解码 | JWT 编解码 + HTML 实体 + 颜色转换 |

**产出物：** `docs/ui-svg/` 目录下 19 个 SVG 文件

### Step 2：交互流程设计

SVG 线框确认布局后，为每个工具编写交互流程文档，明确定义**用户操作路径、界面状态流转、异常处理方式**，作为后续 UI 实现的行为标准。

**文档命名规范：** `IX-{模块编号}-{模块名称}.md`，如 `IX-05-crypto-symmetric.md`

**每个交互流程文档包含以下结构：**

```markdown
## IX-XX: {工具名称} 交互流程

### 界面状态定义

| 状态 | 描述 | 界面表现 |
|------|------|----------|
| 初始态 | 打开工具时的默认状态 | 各字段的默认值、"执行"按钮状态 |
| 就绪态 | 所有必填项已填写 | "执行"按钮可点击 |
| 执行中 | 正在处理 | 按钮 loading、输入区只读 |
| 结果态 | 处理完成 | 输出区展示结果 |
| 异常态 | 输入错误或处理失败 | 错误提示位置和方式 |

### 操作流程

1. 用户进入工具页面 → 看到 [初始态描述]
2. 用户 [具体操作] → 界面 [变化描述]
3. ...
4. 用户点击"执行" → [执行态描述]
5. 成功 → [结果态描述]
6. 失败 → [异常态描述]

### 交互规则

| 场景 | 行为 |
|------|------|
| 模式切换（如加密↔解密） | [输入输出如何处理] |
| 参数变更 | [是否清空已有结果] |
| 输入为空时点执行 | [提示方式] |
| 结果区操作 | [复制/下载/交换] |
| 历史记录回填 | [是否覆盖当前输入] |
```

**交互流程文档清单：**

| # | 文档 | 覆盖工具 | 关键交互点 |
|---|------|---------|-----------|
| 1 | `IX-01-framework.md` | 主框架 | 搜索弹窗打开/关闭、侧边栏折叠/展开、快捷键响应、主题切换 |
| 2 | `IX-02-home.md` | 首页 | 收藏工具排序、最近使用列表、工具卡片点击跳转 |
| 3 | `IX-03-encoding.md` | 编码转换 5 个工具 | 编码↔解码切换时输入输出互换、即时转换 debounce、批量模式 |
| 4 | `IX-04-json.md` | JSON 工具 8 个工具 | 格式化缩进选择、JSONPath 实时查询、Diff 左右面板联动、树形展开折叠 |
| 5 | `IX-05-crypto-symmetric.md` | AES/DES/3DES | 加密↔解密切换、密钥格式校验时机、IV 随机生成/手动输入切换、密钥显示/隐藏 |
| 6 | `IX-06-crypto-rsa.md` | RSA 密钥/加解密/签名 | 密钥对生成进度、公钥私钥切换、密钥格式选择（PKCS#1/PKCS#8）、签名验签流程 |
| 7 | `IX-07-hash.md` | 哈希摘要 | 实时计算（输入变化即更新）、多算法同时对比、HMAC 密钥输入 |
| 8 | `IX-08-keygen.md` | 密钥工具 | 随机密钥长度滑块、KCV 计算触发、单/双/三倍长密钥切换 |
| 9 | `IX-09-openssl.md` | OpenSSL 集成 | 命令参数动态拼接预览、证书解析字段树形展示、格式转换输出 |
| 10 | `IX-10-calculator.md` | 数字计算 | 进制切换实时转换、公式求值错误提示、取模整除结果展示 |
| 11 | `IX-11-qrcode.md` | 二维码 | 实时生成预览、截图粘贴触发解析、拖拽文件解析、容错级别选择 |
| 12 | `IX-12-http-client.md` | HTTP Client | 请求方法切换、Body 类型切换（JSON/Form/Raw/Binary）、响应 Tab 切换（Body/Header）、cURL 导入导出 |
| 13 | `IX-13-time.md` | 时间计算 | 时间戳自动识别（秒/毫秒）、Pattern 自定义预览、时间推算±切换 |
| 14 | `IX-14-cron.md` | Cron 表达式 | 可视化↔表达式双向同步、标签页切换、最近 N 次执行时间实时更新、预设一键填充 |
| 15 | `IX-15-regex.md` | 正则调试 | 正则输入实时匹配高亮、匹配分组 Tab 切换、常用库一键导入填充、标志位切换（g/i/m） |
| 16 | `IX-16-grok.md` | Grok 调试 | 表达式实时解析、字段名-值键值对展示、自定义模式保存/加载 |
| 17 | `IX-17-nginx.md` | Nginx 工具 | 格式化前后对比、语法错误行定位高亮、模板一键填充、Diff 左右面板 |
| 18 | `IX-18-config-converter.md` | 配置文件转换 | 源格式自动检测、转换后实时预览、校验错误行定位 |
| 19 | `IX-19-codec.md` | 编码/解码 | JWT 三段分色展示、编码↔解码切换、颜色选择器联动（HEX/RGB/HSL 同步） |

**产出物：** `docs/ui-interaction/` 目录下 19 个交互流程文档

### Step 3：Naive UI 静态 HTML 页面

所有 SVG 线框和交互流程确认后，使用 Naive UI 组件库生成静态 HTML 页面。

- 基于确认的 SVG 布局，用 Naive UI 真实组件还原
- 实现交互流程文档中定义的所有状态流转和操作行为
- 包含真实的交互状态（下拉展开、Tab 切换、暗色/亮色主题）
- 逐个界面与你确认视觉效果和交互细节
- 确认通过后作为后续 Vue 组件开发的视觉标准

**产出物：** `docs/ui-html/` 目录下 19 个 HTML 文件

---

## ② 开发实现

**开发环境：** Linux（日常编码、调试，编译 Linux 版本做本地验证）
**发布编译：** GitHub Actions CI/CD（推送 tag 触发全平台编译，详见第四章）
**框架：** Tauri v2 + Vue 3 + TypeScript（详见 [requirements-analysis.md](requirements-analysis.md) 第一章）

按以下顺序推进，每个模块基于确认的 HTML 页面开发 Vue 组件：

### 2.1 项目骨架

- [ ] Tauri v2 + Vue 3 + TypeScript 项目初始化（`pnpm create tauri-app`）
- [ ] 核心依赖安装（Naive UI / Pinia / Vue Router / CodeMirror 6 / crypto-js）
- [ ] 主框架布局（MainLayout + Sidebar + TitleBar）
- [ ] 工具注册机制（ToolDefinition 接口 + registry + 路由自动注册）
- [ ] 通用组件（ToolContainer / TextInput / TextOutput / CopyButton）
- [ ] 主题切换 + 快捷键 + 搜索
- [ ] GitHub Actions CI/CD 流水线初始配置（`.github/workflows/build.yml`）

### 2.2 工具模块开发

**前端纯 TS 模块（无外部依赖）：**

- [ ] 字符编码转换（5 个工具）
- [ ] JSON 工具（8 个工具）
- [ ] 数字计算（4 个工具）
- [ ] 编码/解码（3 个工具）
- [ ] 时间计算（2 个工具）
- [ ] Cron 表达式（1 个工具）
- [ ] 正则调试（1 个工具）
- [ ] Grok 调试（1 个工具）
- [ ] Nginx 工具（4 个工具）
- [ ] 配置文件转换（3 个工具）

**需要额外依赖的模块：**

- [ ] 加密工具 — 前端层（Web Crypto API + crypto-js，6 个工具）
- [ ] 加密工具 — Rust 后端（Tauri Command，4 个工具）
- [ ] 二维码（qrcode + jsqr，2 个工具）
- [ ] HTTP Client（tauri-plugin-http，2 个工具）
- [ ] OpenSSL 工具（Rust 后端，3 个工具）

---

## ③ 测试

### 测试方式

基于 **Playwright** 通过 **浏览器** 进行功能测试，而非直接测试 Tauri 桌面窗口。

**测试对象：** Vite 开发服务器启动的 Web 页面（`pnpm dev`）

**选择理由：**
- 前端为标准 Vue 3 Web 应用，所有 UI 交互逻辑均可通过浏览器完整测试
- Playwright 直接操控浏览器（Chromium），API 成熟稳定，测试脚本编写效率高
- 无需处理 Tauri 原生窗口自动化带来的额外复杂度
- 测试执行速度快，调试方便（可使用 Playwright UI / Trace Viewer）

**测试范围说明：**

| 测试范围 | 测试方式 | 说明 |
|----------|----------|------|
| 前端 UI 交互、工具功能 | Playwright + 浏览器 | 覆盖绝大部分功能 |
| Tauri IPC（Rust 后端） | 桌面环境手动验证 | 加密、文件操作等需 Tauri 运行时 |
| 安装包、自动更新 | 手动验证 | 最终发布前在各平台验证 |

### 测试流程

```
编写功能测试案例文档（MD）→ Playwright 自动化执行 → 生成测试报告（MD）
```

### 3.1 编写功能测试案例文档

在测试执行前，为每个工具模块编写 MD 格式的功能测试案例文档，存放在 `docs/test-cases/` 目录。

**文档命名规范：** `TC-{模块编号}-{模块名称}.md`，如 `TC-03-encoding.md`

**每个测试案例包含以下内容：**

```markdown
## TC-XX-NNN: 测试案例名称

- **所属模块：** xxx
- **前置条件：** Vite dev server 已启动，已导航至对应工具页面
- **测试类型：** 正向功能 / 异常输入
- **测试步骤：**
  1. ...
  2. ...
- **预期结果：** ...
```

**测试范围：**

| 类型 | 说明 | 占比 |
|------|------|------|
| 正向功能测试 | 每个工具的核心功能，输入合法数据验证输出正确性 | ~70% |
| 异常输入测试 | 空输入、超长输入、非法字符、边界值、格式错误等 | ~20% |
| 全局交互测试 | 快捷键、主题切换、搜索、侧边栏、历史记录等 | ~10% |

**测试案例文档清单：**

| # | 文档 | 覆盖模块 |
|---|------|---------|
| 1 | `TC-01-framework.md` | 主框架、侧边栏、搜索、主题切换、快捷键 |
| 2 | `TC-02-home.md` | 首页、收藏、最近使用 |
| 3 | `TC-03-encoding.md` | Hex/Base64/ASCII/URL/Unicode 编解码（5 个工具） |
| 4 | `TC-04-json.md` | JSON 格式化/压缩/反序列化/JSONPath/校验/互转/Diff（8 个工具） |
| 5 | `TC-05-crypto-symmetric.md` | AES/DES/3DES 加解密 |
| 6 | `TC-06-crypto-rsa.md` | RSA 密钥生成/加解密/签名验签 |
| 7 | `TC-07-hash.md` | MD5/SHA/HMAC/CRC32 哈希计算 |
| 8 | `TC-08-keygen.md` | 随机密钥生成、KCV 计算、单/双/三倍长密钥 |
| 9 | `TC-09-openssl.md` | OpenSSL 命令生成、证书解析、PEM/DER 转换 |
| 10 | `TC-10-calculator.md` | 进制转换、公式求值、取模、整除 |
| 11 | `TC-11-qrcode.md` | 二维码生成、截图粘贴解析、拖拽解析 |
| 12 | `TC-12-http-client.md` | HTTP 请求构造、响应查看、cURL 互转 |
| 13 | `TC-13-time.md` | 时间戳转换、时间推算、自定义 Pattern |
| 14 | `TC-14-cron.md` | 可视化配置、表达式双向同步、执行预览、预设模板 |
| 15 | `TC-15-regex.md` | 正则匹配高亮、分组查看、常用库导入 |
| 16 | `TC-16-grok.md` | Grok 解析、内置模式库、自定义模式 |
| 17 | `TC-17-nginx.md` | 格式化、语法校验、配置模板、Diff |
| 18 | `TC-18-config-converter.md` | Properties/YAML/JSON 互转、校验 |
| 19 | `TC-19-codec.md` | JWT 编解码、HTML 实体、颜色转换 |

**产出物：** `docs/test-cases/` 目录下 19 个测试案例文档

### 3.2 Playwright 自动化测试执行

基于测试案例文档编写 Playwright 测试脚本并执行。

**测试环境配置：**

```bash
# 安装 Playwright
pnpm add -D @playwright/test
npx playwright install chromium

# 启动 Vite 开发服务器（测试目标）
pnpm dev  # 默认 http://localhost:1420

# 执行测试
npx playwright test

# 带 UI 的交互式测试（调试用）
npx playwright test --ui
```

**执行清单：**

- [ ] Playwright 项目初始化 + Vite dev server 配置（`playwright.config.ts` 中配置 `webServer` 自动启动）
- [ ] 按模块编写 E2E 测试脚本（对应每个 TC-XX 文档）
- [ ] 执行全量测试
- [ ] 记录执行结果（通过/失败/阻塞）和失败原因描述

### 3.3 生成测试报告

测试执行完成后，生成 MD 格式的测试报告，存放在 `docs/test-reports/` 目录。

**报告内容包含：**

```markdown
# 测试报告 - {模块名称}

## 概要
- 测试日期：YYYY-MM-DD
- 测试环境：Linux + Chromium (Playwright)
- 测试案例总数：XX
- 通过：XX | 失败：XX | 阻塞：XX
- 通过率：XX%

## 详细结果

| 案例编号 | 案例名称 | 类型 | 结果 | 失败原因 |
|---------|---------|------|------|---------|
| TC-03-001 | Hex 编码基本功能 | 正向 | 通过 | - |
| TC-03-002 | Hex 编码空输入 | 异常 | 通过 | - |
| ... | ... | ... | ... | ... |

## 遗留问题
- [问题描述及影响范围]
```

**产出物：** `docs/test-reports/` 目录下测试报告 MD 文件

### 3.4 测试执行清单

- [ ] 编写 19 个测试案例文档（正向功能 + 异常输入）
- [ ] Playwright 项目搭建（Chromium + Vite dev server 配置）
- [ ] 全量自动化测试执行
- [ ] 生成测试报告
- [ ] 失败案例修复后回归测试
- [ ] Tauri IPC 功能（Rust 后端加密、文件操作）桌面环境手动验证

---

## ④ 桌面安装程序与发布

### 4.1 技术决策

| 项目 | 决策 |
|------|------|
| 桌面框架 | **Tauri v2** |
| 编译方式 | **GitHub Actions CI/CD**（Linux 开发 → 云端全平台编译） |
| 目标平台 | **Windows（Win10+）** 为首要，macOS / Linux 为次要 |
| WebView2 策略 | 默认 `downloadBootstrapper`（+1.8MB，未预装时自动引导安装） |

### 4.2 安装包规格

| 平台 | 格式 | 估算大小 |
|------|------|---------|
| Windows | `.exe`（NSIS）+ `.msi` | ~5-8MB |
| macOS | `.dmg` | ~4-10MB |
| Linux | `.deb` + `.AppImage` + `.rpm` | ~3-8MB |

### 4.3 CI/CD 流水线

**触发方式：** 推送 `v*` 格式的 Git Tag（如 `git tag v1.0.0 && git push origin v1.0.0`）

**流水线步骤：**

```
git push tag v*
      │
      ▼
┌─ GitHub Actions ────────────────────────────────┐
│                                                  │
│  Job 1: build-windows (windows-latest)           │
│    → setup Node.js + Rust                        │
│    → pnpm install                                │
│    → pnpm tauri build                            │
│    → 产物: .exe (NSIS) + .msi                    │
│                                                  │
│  Job 2: build-macos (macos-latest)               │
│    → setup Node.js + Rust                        │
│    → pnpm install                                │
│    → pnpm tauri build --target universal-apple-darwin │
│    → 产物: .dmg                                  │
│                                                  │
│  Job 3: build-linux (ubuntu-latest)              │
│    → setup Node.js + Rust + webkit2gtk           │
│    → pnpm install                                │
│    → pnpm tauri build                            │
│    → 产物: .deb + .AppImage + .rpm               │
│                                                  │
│  → tauri-action 发布到 GitHub Releases            │
└──────────────────────────────────────────────────┘
```

### 4.4 执行清单

- [ ] GitHub Actions 工作流文件编写（`.github/workflows/build.yml`）
- [ ] Windows NSIS 安装包配置（WebView2 bootstrapper 嵌入）
- [ ] macOS DMG 配置（Universal Binary）
- [ ] Linux 多格式配置（deb + AppImage + rpm）
- [ ] 应用图标设计（三平台适配：ico / icns / png）
- [ ] Tauri Updater 自动更新配置（GitHub Releases 作为更新源）
- [ ] 代码签名配置（Windows: 可选；macOS: Apple Developer 证书）
- [ ] 首次完整 CI/CD 流水线测试（tag 触发 → 全平台编译 → Release 发布）

---

## 工具总数：51 个

当前状态：**技术选型已确认（Tauri v2 + GitHub Actions CI/CD），等待 UI 设计 Step 1 启动确认**
