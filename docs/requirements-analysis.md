# 桌面开发者工具箱 - 需求分析与架构方案

> 版本：v2.0
> 日期：2026-04-27
> 状态：技术选型已确认

---

## 一、桌面框架选型分析：Electron vs Tauri

### 1.1 对比矩阵

| 维度 | Electron | Tauri |
|------|----------|-------|
| **包体积** | 较大（~80-150MB），内嵌 Chromium + Node.js | 极小（~3-10MB），使用系统 WebView |
| **运行内存** | 较高（200-500MB 空载） | 低（30-80MB 空载） |
| **启动速度** | 较慢（1-3秒） | 快（< 1秒） |
| **安全性** | 进程模型复杂，Node.js 集成增加攻击面 | Rust 后端天然内存安全；权限系统精细 |
| **加密能力** | Node.js 内置 crypto + Web Crypto API | Rust ring/openssl crate + Web Crypto API |
| **生态成熟度** | 极高（VS Code, Slack 等验证） | 快速增长中，v2 已趋于成熟 |
| **后端语言** | Node.js（JavaScript/TypeScript） | Rust |
| **跨平台** | Windows/macOS/Linux | Windows/macOS/Linux |
| **自动更新** | electron-updater 成熟方案 | Tauri 内置 updater 插件 |

### 1.2 确认选型：Tauri v2

> **决策日期：2026-04-27**
> **决策依据：** 经综合评估，Tauri v2 在以下维度全面满足项目需求

**核心理由：**

1. **加密场景适合 Rust 后端**：本项目涉及大量加密操作（AES、RSA、DES、签名验签等），Rust 的 `ring` 和 `openssl` crate 提供了高性能、内存安全的加密实现，优于 Node.js 的第三方 JS 加密库
2. **工具类应用追求轻量**：开发者工具箱是"随用随开"的辅助工具，用户期望快速启动、低资源占用。Tauri 3-10MB 的包体积和亚秒级启动体验远优于 Electron（80-150MB）
3. **安全性更高**：加密工具处理密钥、证书等敏感数据，Tauri 的权限系统和 Rust 的内存安全保障是重要优势
4. **离线使用友好**：不依赖网络，WebView 在三大平台均可离线工作
5. **目标平台为 Windows**：主要面向 Win10 用户，WebView2（Chromium 内核）在 Win10 上渲染体验与 Electron 一致，消除了 Linux WebKitGTK 的兼容性风险

**已确认的风险与应对：**

| 风险 | 应对策略 |
|------|----------|
| Rust 后端学习曲线 | AI Coding Agent 辅助编写 Tauri Commands，开发者无需深入学习 Rust |
| 跨平台编译不支持（Linux 无法直接编译 Windows .exe） | 采用 **GitHub Actions CI/CD** 在 Windows runner 上编译发布（详见第八章） |
| Win10 少数机器未预装 WebView2 | NSIS 安装器自动引导安装 WebView2（+1.8MB bootstrapper，需首次联网） |

**已排除的方案：**
- **Electron + electron-builder**：虽然支持 Linux 交叉编译 Windows 包，但包体积大（~80MB vs ~5MB）、内存占用高、加密能力不如 Rust 后端，综合评估后不采用

---

## 二、前端技术栈

| 项目 | 选择 | 理由 |
|------|------|------|
| 框架 | Vue 3 + TypeScript | Composition API + `<script setup>`，适合工具类组件复用 |
| UI 组件库 | Naive UI | Vue 3 原生、Tree-shaking 友好、主题定制强、中文文档完善 |
| 代码编辑器 | CodeMirror 6 | 轻量、模块化、按需加载语言模式，适合嵌入工具面板 |
| 状态管理 | Pinia | Vue 3 官方推荐，TypeScript 友好，轻量 |
| 构建工具 | Vite | Tauri 官方默认支持，极快的 HMR 开发体验 |

---

## 三、功能模块划分

### 3.1 模块总览

```
开发者工具箱
├── 字符编码转换
│   ├── 字符串 ↔ Hex 互转
│   ├── ASCII 码表查询
│   ├── ASCII 码 ↔ 字符串互转
│   ├── Base64 编码/解码
│   ├── URL 编码/解码
│   └── Unicode 编码/解码
│
├── JSON 工具
│   ├── JSON Pretty 格式化（美化输出，可配置缩进）
│   ├── JSON 压缩（紧凑字符串，去除空白）
│   ├── JSON 序列化（对象 → JSON 字符串）
│   ├── JSON 反序列化（JSON 字符串 → Map/树形结构可视化展示）
│   ├── JSON Path 查询（输入 JSONPath 表达式读取指定值）
│   ├── JSON 校验（语法错误检查，错误行定位）
│   ├── JSON ↔ XML 互转
│   ├── JSON ↔ YAML 互转
│   └── JSON Diff 对比
│
├── 加密解密工具集
│   ├── 对称加密
│   │   ├── AES 加密/解密（CBC/ECB/GCM/CTR 模式）
│   │   ├── DES 加密/解密（CBC/ECB 模式）
│   │   └── 3DES 加密/解密
│   │
│   ├── 非对称加密
│   │   ├── RSA 加密/解密
│   │   ├── RSA 密钥对生成
│   │   └── RSA 签名/验签
│   │
│   ├── 哈希摘要
│   │   ├── MD5 哈希计算
│   │   ├── SHA-1 / SHA-256 / SHA-384 / SHA-512
│   │   ├── HMAC 计算验证
│   │   └── CRC32 计算
│   │
│   ├── 密钥工具
│   │   ├── 随机密钥生成（自定义长度）
│   │   ├── 单倍长/双倍长/三倍长密钥生成
│   │   ├── 密钥校验值计算（KCV）
│   │   └── PBE 密钥派生
│   │
│   └── OpenSSL 集成
│       ├── OpenSSL 命令生成器
│       ├── 证书解析（X.509）
│       ├── CSR 生成
│       └── PEM ↔ DER 格式互转
│
├── 数字计算
│   ├── 进制转换（二进制/八进制/十进制/十六进制互转）
│   ├── 数学表达式计算（字符串公式求值）
│   ├── 取模计算（modulo）
│   └── 整除计算（integer division）
│
├── 二维码工具
│   ├── 字符串 → 二维码（输入文本/URL，生成二维码图片）
│   └── 二维码 → 字符串（截图粘贴/拖拽二维码图片，解析出内容）
│
├── HTTP Client
│   ├── 请求构造（支持 GET/POST/PUT/DELETE/PATCH 等方法）
│   ├── 请求头设置（自定义 Header，Content-Type 媒体类型选择）
│   ├── 请求体编辑（JSON/Form-Data/x-www-form-urlencoded/Raw/Binary）
│   ├── 响应查看（状态码、响应头、响应体，支持 JSON 美化/预览）
│   ├── 请求 ↔ cURL 互转（HTTP 请求导出为 cURL 命令 / cURL 命令导入为请求）
│   └── 请求历史记录
│
├── 时间计算
│   ├── 时间戳 ↔ 可读日期（Long 类型毫秒/秒级时间戳转日期，默认格式 yyyy-MM-dd HH:mm:ss.SSS，用户可自定义 Pattern）
│   ├── 时间推算 - 基于时间戳（输入时间戳 ± 天/时/分/秒，计算目标时间戳及可读日期）
│   └── 时间推算 - 基于日期（输入日期 ± 天/时/分/秒，计算目标日期及时间戳）
│
├── Cron 表达式
│   ├── 可视化配置（秒/分/时/日/月/周/年 标签页，支持单选/周期/指定值等模式）
│   ├── 表达式 ↔ 可视化双向同步（手动输入表达式反解析到 UI，UI 选择同步到表达式）
│   ├── 最近 N 次执行时间预览（验证表达式正确性）
│   ├── 常用 Cron 表达式收藏/预设（如"每天 0 点"、"每 5 分钟"）
│   └── 自然语言描述（生成/显示 Cron 的中文含义说明）
│
├── 正则表达式调试
│   ├── 正则匹配测试（输入正则 + 测试文本，实时高亮匹配结果）
│   ├── 匹配分组查看（捕获组内容、位置、数量）
│   ├── 常用正则表达式库（手机号/邮箱/IP/URL/身份证 等，支持一键导入）
│   └── 正则语法速查（语法提示、错误定位）
│
├── Grok 表达式调试
│   ├── Grok 模式匹配测试（输入 Grok 表达式 + 日志文本，实时解析输出字段）
│   ├── 内置 Grok 模式库（常见日志格式：Nginx/Apache/Syslog/Java 等）
│   ├── 自定义 Grok 模式（支持用户编写和保存自定义模式）
│   └── 解析结果展示（字段名 → 值 的键值对列表，支持 JSON 导出）
│
├── Nginx 配置工具
│   ├── Nginx 配置格式化（美化缩进、排序 directive）
│   ├── Nginx 配置语法校验（合法性检查，错误行定位提示）
│   ├── 常用配置模板
│   │   ├── upstream 负载均衡配置
│   │   ├── HTTP 基础配置（gzip/keepalive/client_max_body_size 等）
│   │   ├── Vue/React 静态资源映射（history 模式 + 静态文件）
│   │   ├── WebSocket 反向代理配置
│   │   └── 缓存策略配置（proxy_cache/fastcgi_cache）
│   └── 配置 Diff 对比（对比两份配置差异）
│
├── 配置文件转换
│   ├── Properties ↔ YAML 互转（粘贴或导入文件，一键转换格式）
│   ├── Properties ↔ JSON 互转
│   ├── YAML 校验（语法检查，错误行定位）
│   └── Properties 校验（重复 key 检测、编码问题提示）
│
├── 编码/解码
│   ├── JWT 编解码（解码：Header/Payload/Signature 分段展示；编码：输入 Header/Payload/Secret 生成 JWT）
│   ├── HTML 实体编码/解码
│   └── 颜色转换（HEX ↔ RGB ↔ HSL）
│
└── 通用工具（未来扩展）
    ├── IP 地址查询
    └── 文本差异对比
```

### 3.2 每个工具的标准功能规格

| 功能 | 说明 |
|------|------|
| 输入区域 | 支持文本输入、文件拖拽、粘贴 |
| 输出区域 | 只读展示，支持一键复制 |
| 参数配置 | 算法选择、密钥输入、模式选择等 |
| 即时转换 | 输入变化时实时计算（debounce 300ms） |
| 交换模式 | 输入输出互换（如编码变解码） |
| 历史记录 | 保存最近 20 条操作记录到本地 |
| 批量处理 | 支持多行文本批量转换（可选） |

---

## 四、项目架构设计

### 4.1 目录结构

```
developer-tools/
├── src-tauri/                     # Tauri Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   └── commands/
│   │       ├── mod.rs
│   │       ├── crypto.rs          # 加密解密命令
│   │       ├── encoding.rs        # 编码转换命令
│   │       ├── keygen.rs          # 密钥生成命令
│   │       ├── openssl.rs         # OpenSSL 集成命令
│   │       └── file.rs            # 文件操作命令
│   └── icons/
│
├── src/                           # Vue 前端
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts               # 路由配置（自动注册工具路由）
│   ├── stores/
│   │   ├── app.ts                 # 全局状态（主题、语言等）
│   │   ├── history.ts             # 历史记录管理
│   │   └── tool-registry.ts       # 工具注册表
│   ├── layouts/
│   │   ├── MainLayout.vue         # 主布局（侧边栏 + 内容区）
│   │   └── TitleBar.vue           # 自定义标题栏
│   ├── components/
│   │   ├── common/
│   │   │   ├── ToolContainer.vue  # 工具通用容器
│   │   │   ├── TextInput.vue      # 代码编辑器输入组件
│   │   │   ├── TextOutput.vue     # 代码编辑器输出组件
│   │   │   ├── ParamPanel.vue     # 参数配置面板
│   │   │   ├── ActionButton.vue   # 操作按钮组
│   │   │   └── CopyButton.vue     # 复制按钮
│   │   └── layout/
│   │       ├── Sidebar.vue
│   │       ├── SearchBar.vue
│   │       └── CategoryGroup.vue
│   ├── views/
│   │   ├── Home.vue
│   │   └── tools/
│   │       ├── encoding/
│   │       ├── json/
│   │       ├── crypto/
│   │       ├── calculator/
│   │       ├── qrcode/
│   │       ├── http-client/
│   │       ├── time/
│   │       ├── cron/
│   │       ├── regex/
│   │       ├── grok/
│   │       ├── nginx/
│   │       └── config/
│   ├── composables/
│   │   ├── useToolBase.ts         # 工具基础逻辑
│   │   ├── useClipboard.ts
│   │   ├── useHistory.ts
│   │   └── useTheme.ts
│   ├── utils/
│   │   ├── crypto/                # 前端加密工具
│   │   ├── encoding/
│   │   ├── json/
│   │   └── registry.ts
│   ├── types/
│   │   ├── tool.ts
│   │   ├── crypto.ts
│   │   └── history.ts
│   ├── assets/
│   │   └── styles/
│   └── plugins/
│       ├── registry.ts
│       └── types.ts
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── docs/
```

### 4.2 分层架构

```
┌─────────────────────────────────────────────┐
│              UI 层（Vue 3 组件）              │
│  views/tools/*.vue  │  components/common/*   │
├─────────────────────────────────────────────┤
│           业务逻辑层（Composables）           │
│  useToolBase  │  useHistory  │  useClipboard │
├─────────────────────────────────────────────┤
│            工具函数层（Utils）                │
│  utils/crypto/*  │  utils/encoding/*         │
├──────────────┬──────────────────────────────┤
│  Tauri IPC   │   Web Crypto API / JS 实现    │
│  (加密/文件) │   (轻量编码转换)               │
├──────────────┴──────────────────────────────┤
│              Rust 后端（Tauri Commands）      │
│  commands/crypto  │  commands/openssl        │
└─────────────────────────────────────────────┘
```

**核心原则：**
- **前端优先**：以下模块直接在前端用 TypeScript 实现，不调用 Tauri IPC：
  - 字符编码转换（Base64、Hex、URL、ASCII、Unicode）
  - JSON 工具（格式化、压缩、校验、Path 查询、Diff、XML/YAML 互转）
  - 数字计算（进制转换、公式求值、取模、整除）
  - 时间计算（时间戳转换、时间推算）
  - Cron 表达式（可视化配置、解析、执行预览、自然语言描述）
  - 正则表达式调试（匹配高亮、分组查看、常用库）
  - Grok 调试（模式匹配、内置/自定义模式库）
  - 编码/解码（JWT、HTML 实体、颜色转换）
  - 配置文件转换（Properties/YAML/JSON 互转）
  - Nginx 配置工具（格式化、校验、模板、Diff）
- **后端处理重计算**：加密解密（AES、RSA、DES）、大文件处理、OpenSSL 操作、二维码图片处理通过 Tauri Command 在 Rust 侧执行
- **双通道备份**：加密操作前端提供 Web Crypto API 实现，Rust 侧提供 ring/openssl 实现

### 4.3 插件化架构

```typescript
// 工具定义接口
interface ToolDefinition {
  id: string;                    // 唯一标识，如 'crypto-aes'
  name: string;                  // 显示名称
  description: string;           // 工具描述
  category: ToolCategory;        // 分类
  icon: string;                  // 图标
  keywords: string[];            // 搜索关键词
  route: string;                 // 路由路径
  component: () => Promise<any>; // 懒加载组件
  isFavorite?: boolean;          // 是否收藏
}

type ToolCategory =
  | 'encoding'      // 字符编码
  | 'json'          // JSON 工具
  | 'crypto'        // 加密解密（含哈希摘要、密钥工具、OpenSSL）
  | 'calculator'    // 数字计算
  | 'qrcode'        // 二维码工具
  | 'http'          // HTTP Client
  | 'time'          // 时间计算
  | 'cron'          // Cron 表达式
  | 'regex'         // 正则表达式调试
  | 'grok'          // Grok 表达式调试
  | 'nginx'         // Nginx 配置工具
  | 'config'        // 配置文件转换
  | 'codec';        // 编码/解码（JWT、HTML实体、颜色转换）
```

新增工具只需：
1. 在 `views/tools/` 下创建组件
2. 在 registry 中注册 ToolDefinition
3. 路由自动生成，侧边栏自动显示

> **CRITICAL**: 侧边栏菜单结构必须严格按照原型 HTML（`docs/ui-html/01-main-framework.html`）定义。
> 功能列表定义"有什么"，原型 HTML 定义"怎么展示"。两者不可混用。
> 详见下方 4.4 节"UI 页面映射表"。

### 4.4 UI 页面映射表（原型 HTML 为权威来源）

> 原型文件位于 `docs/ui-html/`，是 UI 结构的唯一权威来源。
> 编码时侧边栏菜单、分组、菜单项名称必须与此表完全一致。

| 侧边栏分组 | 菜单项 | 原型文件 | 页面内功能 | 对应 Vue 组件 |
|---|---|---|---|---|
| — | 首页 | 02-home.html | 工具卡片网格 | Home.vue |
| 字符编码 | Hex 转换 | 03-encoding.html | 编码/解码互换 | HexConverter.vue |
| 字符编码 | Base64 编解码 | 03b-base64.html | 编码/解码互换 | Base64Converter.vue |
| 字符编码 | ASCII 转换 | 03c-ascii.html | 编码/解码互换 | AsciiConverter.vue |
| 字符编码 | URL 编解码 | 03d-url.html | 编码/解码互换 | UrlConverter.vue |
| 字符编码 | Unicode 编解码 | 03e-unicode.html | 编码/解码互换 | UnicodeConverter.vue |
| JSON 工具 | 格式化 & 压缩 | 04-json.html | **2 合 1**：JSON Pretty 格式化 + JSON 压缩 | JsonFormatter.vue |
| JSON 工具 | 反序列化 | 04c-json-deserialize.html | JSON 树形可视化 | JsonDeserializer.vue |
| JSON 工具 | JSONPath 查询 | 04d-json-path.html | JSONPath 表达式查询 | JsonPathQuery.vue |
| JSON 工具 | JSON Diff | 04e-json-diff.html | JSON 对比 | JsonDiff.vue |
| 加密解密 | AES 加密/解密 | 05-crypto-aes.html | 加密/解密/密钥生成 tab | AesCrypto.vue |
| 加密解密 | DES/3DES | 05b-crypto-des.html | DES + 3DES 加解密 | DesCrypto.vue |
| 加密解密 | RSA 工具 | 06-crypto-rsa.html | 密钥生成/加解密/签名验签 | RsaCrypto.vue |
| 加密解密 | 哈希摘要 | 07-hash.html | **多合一**：SHA/MD5/HMAC/CRC32 | ShaHash.vue |
| 加密解密 | 密钥工具 | 08-keygen.html | **多合一**：随机密钥生成 + KCV + PBE + 多倍长密钥 | KeyGenerator.vue |
| 加密解密 | OpenSSL 工具 | 09-openssl.html | **3 tab**：命令生成器/证书解析/格式转换 | OpenSslTool.vue |
| 数字计算 | 进制转换 | 10-calculator.html | 二/八/十/十六进制互转 | BaseConverter.vue |
| 二维码 | 二维码生成 | 11-qrcode.html | 文本/URL → 二维码 | QrCodeGenerator.vue |
| 二维码 | 二维码解析 | 11b-qrcode-parse.html | 二维码图片 → 文本 | QrCodeParser.vue |
| HTTP Client | HTTP 请求 | 12-http-client.html | 请求构造+响应查看 | HttpClient.vue |
| 时间计算 | 时间戳转换 | 13-time.html | **多合一**：时间戳↔日期 + 时间推算 | TimestampConverter.vue |
| Cron | Cron 表达式 | 14-cron.html | 可视化配置+解析+预览 | CronEditor.vue |
| 正则调试 | 正则调试 | 15-regex.html | 匹配测试+高亮+常用库 | RegexTester.vue |
| Grok | Grok 调试 | 16-grok.html | 模式匹配+模式库 | GrokTester.vue |
| Nginx | Nginx 工具 | 17-nginx.html | **4 tab**：格式化/语法检查/Diff/模板 | NginxFormatter.vue |
| 配置转换 | 配置文件转换 | 18-config-converter.html | **多合一**：Properties/YAML/JSON 互转+校验 | PropertiesYamlConverter.vue |
| 编码解码 | JWT 编解码 | 19-codec.html | **3 tab**：JWT/HTML实体/颜色转换 | JwtCodec.vue |

**关键约束**：

1. **侧边栏共 28 个菜单项**，不是 45+ 个。功能列表中的子功能通过 tab 或区域划分合并到同一页面。
2. **"加密解密"是一个分组**（不是 4 个），包含 AES、DES、RSA、哈希摘要、密钥工具、OpenSSL 共 6 个菜单项。
3. **JSON 工具只有 4 个菜单项**：格式化 & 压缩、反序列化、JSONPath 查询、JSON Diff。其中 JSON 校验、JSON↔XML、JSON↔YAML 不作为独立菜单项，合并到"格式化 & 压缩"页面或作为子功能。
4. **子菜单项不带图标**。原型侧边栏菜单项是纯文本链接，分组标题也不带图标。
5. **未出现在原型侧边栏的功能**（公式求值、取模、整除等）作为对应页面的扩展功能实现，不单独出现在侧边栏。

---

## 五、加密库选型

### 5.1 方案对比

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| Web Crypto API | 浏览器原生、零依赖、高性能 | 异步 API、不支持 DES/MD5 | AES、RSA、SHA、HMAC |
| crypto-js | 纯 JS、同步 API、算法覆盖广 | 性能较差、非原生实现 | DES、3DES、MD5 |
| node-forge | RSA 完整支持、X.509 证书 | 维护不活跃、API 底层 | RSA 密钥、证书操作 |
| Rust ring crate | 高性能、内存安全 | 需要 Rust 代码 | 所有加密操作的首选后端 |
| Rust openssl crate | OpenSSL 兼容、算法最全 | 需 OpenSSL 动态库 | OpenSSL 集成、证书操作 |

### 5.2 前端/后端职责划分

```
前端纯 TypeScript（~42 个功能，不调用 Tauri IPC）
├── 字符编码转换（5 个）      Hex/Base64/ASCII/URL/Unicode 编解码
├── JSON 工具（8 个功能 → 4 个页面） 格式化&压缩/反序列化/Path 查询/Diff（校验/XML/YAML 合并到页面内）
├── 数字计算（4 个功能 → 1 个页面） 进制转换（公式求值/取模/整除合并到页面内）
├── 时间计算（3 个功能 → 1 个页面） dayjs 时间戳转换+推算+自定义 Pattern
├── Cron 表达式（1 个）       cron-parser 解析/cronstrue 自然语言/可视化 UI
├── 正则调试（1 个）          原生 RegExp + matchAll 匹配高亮/分组/常用库
├── Grok 调试（1 个）         grok-js 模式匹配/内置+自定义模式库
├── Nginx 工具（4 个功能 → 1 个页面，tab 切换） 格式化/语法校验/配置模板/Diff
├── 配置文件转换（4 个功能 → 1 个页面） Properties/YAML/JSON 互转+校验
├── 编码/解码（3 个功能 → 1 个页面，tab 切换） JWT 编解码/HTML 实体/颜色转换
├── 哈希摘要（4 个功能 → 1 个页面） Web Crypto API: SHA-1/256/384/512/HMAC
└── 随机密钥生成（1 个功能，合并到密钥工具页面） Web Crypto API: getRandomValues()

后端 Rust（~9 个工具，通过 Tauri IPC 调用）
├── 对称加密（3 个）          AES/DES/3DES 加解密（ring + openssl crate）
├── RSA 工具（3 个）          密钥对生成/加解密/签名验签（ring crate）
├── 密钥工具（3 个）          KCV 计算/PBE 密钥派生/单双三倍长密钥
└── OpenSSL 集成（4 个）      命令生成器/证书解析/CSR 生成/PEM·DER 互转

Tauri 插件（非加密原生能力）
├── 二维码（2 个）            生成（qrcode）+ 解析（jsqr/rust 后端）
└── HTTP Client（1 个）       tauri-plugin-http 发起请求 + 前端 UI
```

### 5.3 前端依赖库清单

| 库 | 用途 | 体积（gzip） |
|----|------|-------------|
| `mathjs` | 数学表达式计算 | ~30KB |
| `dayjs` | 时间日期处理 | ~2KB |
| `cron-parser` | Cron 表达式解析 + 下次执行时间计算 | ~10KB |
| `cronstrue` | Cron 表达式转自然语言描述 | ~5KB |
| `grok-js` | Grok 模式匹配 | ~20KB |
| `jsonpath-plus` | JSON Path 查询 | ~10KB |
| `fast-xml-parser` | JSON ↔ XML 互转 | ~8KB |
| `js-yaml` | JSON ↔ YAML 互转 | ~18KB |
| `deep-diff` | JSON / Nginx Diff 对比 | ~5KB |
| `crypto-js` | MD5 哈希（前端降级方案） | ~15KB |
| `qrcode` | 二维码图片生成 | ~10KB |
| `jsqr` | 二维码图片解析 | ~25KB |

### 5.4 算法实现覆盖

| 算法 | 前端实现 | 后端实现 |
|------|---------|---------|
| AES-CBC/GCM/CTR | Web Crypto API | ring crate |
| RSA-OAEP/PSS | Web Crypto API（有限） | ring crate |
| SHA-1/256/384/512 | Web Crypto API | ring crate |
| HMAC | Web Crypto API | ring crate |
| MD5 | crypto-js | openssl crate |
| DES/3DES | crypto-js | openssl crate |
| RSA 签名（PKCS#1 v1.5） | - | ring crate |
| 证书操作 | - | x509-parser + rcgen |

---

## 六、安全性设计

### 6.1 安全原则

1. **离线优先**：所有计算在本地完成，不发送任何数据到外部服务器
2. **最小权限**：Tauri 只申请必要权限（剪贴板读写、文件选择）
3. **敏感数据不持久化**：密钥、明文不写入磁盘
4. **内存清零**：Rust 侧处理完密钥后使用 `zeroize` crate 清零
5. **输入验证**：前端和后端双重验证

### 6.2 数据存储策略

| 数据类型 | 存储方式 |
|----------|----------|
| 工具配置 | localStorage（非敏感） |
| 历史记录 | localStorage（可配置加密存储） |
| 主题偏好 | localStorage |
| 密钥/密码 | **不存储**，仅内存中临时使用 |

---

## 七、用户体验设计

### 7.1 界面布局

> 以下布局图严格基于原型 HTML（`docs/ui-html/01-main-framework.html`）绘制。

```
┌──────────────────────────────────────────────────────┐
│  ◉ ◉ ◉   开发者工具箱  v1.0   🌙  ─  □  ✕          │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│  🔍 搜索  │  ┌─ AES 加密/解密 ─────────────────────┐ │
│          │  │                                       │ │
│  首页     │  │  [加密] [解密]    模式: [CBC ▾]       │ │
│          │  │  填充: [PKCS7 ▾]   密钥长度: [256 ▾]  │ │
│ 字符编码  │  │                                       │ │
│  Hex 转换 │  │  密钥: [••••••••••]   [👁] [📋]       │ │
│  Base64   │  │  IV:  [••••••••••]   [🎲 随机生成]    │ │
│  ASCII    │  │                                       │ │
│  URL      │  ├─ 输入 ──────────────────────────────┤ │
│  Unicode  │  │                                       │ │
│          │  │  Hello World                          │ │
│ JSON 工具 │  │                                       │ │
│  格式化&压缩│  ├─ 输出 ──────────────────────────────┤ │
│  反序列化  │  │                                       │ │
│  JSONPath │  │  7H8aey3Kx9Pm2/QdFw==                │ │
│  Diff     │  │                                       │ │
│          │  │                      [📋 复制] [📥 下载]│ │
│ 加密解密  │  └───────────────────────────────────────┘ │
│  AES      │                                           │
│  DES/3DES │                                           │
│  RSA      │                                           │
│  哈希摘要  │                                           │
│  密钥工具  │                                           │
│  OpenSSL  │                                           │
│          │                                           │
│ 数字计算  │                                           │
│  进制转换  │                                           │
│          │                                           │
│ 二维码    │                                           │
│  二维码生成│                                           │
│  二维码解析│                                           │
│          │                                           │
│ HTTP Client│                                          │
│  HTTP 请求│                                           │
│          │                                           │
│ 时间计算  │                                           │
│  时间戳转换│                                           │
│          │                                           │
│ Cron     │                                           │
│  Cron 表达式│                                          │
│          │                                           │
│ 正则调试  │                                           │
│  正则调试 │                                           │
│          │                                           │
│ Grok     │                                           │
│  Grok 调试│                                           │
│          │                                           │
│ Nginx    │                                           │
│  Nginx 工具│                                          │
│          │                                           │
│ 配置转换  │                                           │
│  配置文件转换│                                         │
│          │                                           │
│ 编码解码  │                                           │
│  JWT 编解码│                                          │
│          │                                           │
└──────────┴───────────────────────────────────────────┘
```

### 7.2 核心交互

| 功能 | 实现方式 |
|------|----------|
| 工具搜索 | 全局快捷键 `Cmd/Ctrl + K`，模糊匹配 |
| 快速切换 | `Cmd/Ctrl + 1~9` 切换最近工具 |
| 主题切换 | 暗色/亮色/跟随系统，`Cmd/Ctrl + Shift + T` |
| 即时转换 | 防抖 300ms 自动计算（可配置手动触发） |
| 一键复制 | 输出区复制按钮 + toast 提示 |
| 输入输出交换 | 一键互换（编码变解码） |
| 文件导入 | 拖拽文件 + 点击选择 |
| 收藏工具 | 侧边栏顶部显示收藏 |

---

## 八、构建与发布

### 8.1 目标平台与安装包格式

| 平台 | 优先级 | 格式 | 安装包大小（估算） | 说明 |
|------|--------|------|-------------------|------|
| **Windows** | **P0（首要）** | `.exe`（NSIS）+ `.msi` | ~5-8MB | WebView2 bootstrapper 内嵌（+1.8MB），面向 Win10+ 用户 |
| macOS | P1 | `.dmg` | ~4-10MB | Universal Binary（Intel + Apple Silicon） |
| Linux | P2 | `.deb` + `.AppImage` + `.rpm` | ~3-8MB | 开发调试用，AppImage 免安装 |

### 8.2 编译与发布策略

**开发环境：** Linux（日常开发、调试，编译 Linux 版本）

**编译策略：** Tauri v2 不支持跨平台编译（Linux 无法直接编译 Windows .exe），采用 **GitHub Actions CI/CD** 在对应平台原生编译。

**CI/CD 流水线：**

```
Linux 开发机                           GitHub Actions
┌──────────────┐                    ┌─────────────────────────────┐
│  编写代码      │   git push tag     │  windows-latest runner      │
│  本地调试      │ ─────────────────→ │    → 编译 Windows .exe/.msi │
│  编译 Linux 版 │                    │                             │
└──────────────┘                    │  macos-latest runner        │
                                    │    → 编译 macOS .dmg        │
                                    │                             │
                                    │  ubuntu-latest runner       │
                                    │    → 编译 Linux .deb/.AppImage│
                                    │                             │
                                    │  → 发布到 GitHub Releases   │
                                    └─────────────────────────────┘
```

**触发方式：** 推送 `v*` 格式的 Git Tag 触发全平台构建发布

**工作流配置：** 项目根目录 `.github/workflows/build.yml`，使用官方 `tauri-apps/tauri-action`

**自动更新**：Tauri 内置 Updater 插件，GitHub Releases 作为更新源，签名验证防篡改。

---

## 九、待确认问题

### 已确认问题（2026-04-27）

1. **目标平台优先级** → **已确认：Windows（Win10+）为首要平台**，macOS/Linux 为次要
2. **Rust 技术能力** → **已确认：采用 AI Coding Agent 辅助，不作为阻碍项**
3. **桌面框架选型** → **已确认：Tauri v2**（详见第一章 1.2 节）
4. **编译策略** → **已确认：GitHub Actions CI/CD**，Linux 开发 + 云端编译全平台（详见第八章 8.2 节）

### 高优先级（影响架构设计）

5. **DES 的必要性**：DES 已不安全（56位密钥），是否确实需要？还是仅需要 3DES？
6. **OpenSSL 集成的具体需求**：
   - (a) 调用系统 OpenSSL 命令行工具？
   - (b) 应用内实现 OpenSSL 常用命令的等效功能？
   - (c) 提供 OpenSSL 命令参考/生成器？
7. **"单倍长/双倍长/三倍长密钥"**：是金融支付领域的密钥体系，还是通用的 8/16/24 字节 DES 密钥？

### 中优先级（影响开发排期）

6. **国际化**：是否需要多语言支持（中/英文）？
7. **数据导入/导出**：是否需要批量导出功能？
8. **工具配置持久化**：参数设置是否需要在重启后保留？
9. **RSA 密钥格式**：需要支持哪些格式？PKCS#1、PKCS#8、OpenSSH？
10. **RSA 签名算法**：需要支持 PKCS#1 v1.5、PSS？

### 低优先级（可后续迭代）

11. **插件市场**：是否计划第三方工具插件？
12. **命令行模式**：是否需要 CLI 模式？
13. **团队协作**：是否需要多人共享配置/模板？

---

## 十、实施计划

详见 [work-plan.md](work-plan.md)

共 9 个阶段，28 个 UI 页面（51 个功能点通过 tab 和区域划分合并到 28 个页面中），Phase 1 为所有后续任务前置条件，Phase 2~8 可并行推进。
