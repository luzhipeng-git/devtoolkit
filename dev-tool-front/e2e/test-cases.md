# DevToolkit 前端 Playwright 测试用例（完整功能测试）

> **测试原则**：
> 1. 前端 + Rust HTTP 后端联调，不使用 mock
> 2. 每个测试用例是完整功能测试，明确输入和预期值
> 3. 验证数据正确性，非仅检查 UI 展示
> 4. 每个测试用例对应 Playwright 脚本，支持回归测试

## 测试环境

- 启动方式：`pnpm dev`（Vite 开发服务器，端口 1420）+ Rust HTTP 后端
- 测试框架：Playwright
- 基础 URL：`http://localhost:1420`

---

## TC-01: 主框架与布局（IX-01）

### TC-01-01: 应用启动 - 初始态验证

| 项目 | 内容 |
|------|------|
| **前置条件** | 应用已启动，Vite dev server 运行在 1420 端口 |
| **输入** | 打开 `http://localhost:1420` |
| **预期结果** | 1) 标题栏显示 "DevToolkit" 和版本号<br>2) 侧边栏可见且展开<br>3) 侧边栏包含 13 个分类（字符编码、JSON 工具、加密解密、数字计算、二维码、HTTP Client、时间计算、Cron、正则调试、Grok、Nginx、配置转换、编码解码）<br>4) 内容区显示占位页面（首页），包含快捷键提示和功能卡片网格<br>5) 面包屑显示"首页" |
| **Playwright** | `layout.spec.ts :: 应用启动初始态验证` |

### TC-01-02: 侧边栏分类展开/折叠

| 项目 | 内容 |
|------|------|
| **前置条件** | 在首页 |
| **输入** | 1) 点击侧边栏分类"字符编码" → 2) 再次点击"字符编码" |
| **预期结果** | 1) 第一次点击：展开子工具列表，显示 Hex 转换、Base64 编解码、ASCII 转换、URL 编解码、Unicode 编解码<br>2) 第二次点击：折叠子工具列表 |
| **Playwright** | `layout.spec.ts :: 侧边栏分类展开折叠` |

### TC-01-03: 侧边栏工具导航

| 项目 | 内容 |
|------|------|
| **前置条件** | 在首页 |
| **输入** | 1) 点击"字符编码"分类展开 → 2) 点击"Hex 转换" |
| **预期结果** | 1) "Hex 转换"菜单项高亮<br>2) 面包屑更新为"字符编码 > Hex 转换"<br>3) 内容区加载 Hex 转换工具页面<br>4) 页面包含编码/解码标签、选项栏、输入编辑器、输出编辑器 |
| **Playwright** | `layout.spec.ts :: 侧边栏工具导航` |

### TC-01-04: 侧边栏折叠/展开（Ctrl+B）

| 项目 | 内容 |
|------|------|
| **前置条件** | 在首页，侧边栏展开 |
| **输入** | 1) 按 `Ctrl+B` → 2) 再按 `Ctrl+B` |
| **预期结果** | 1) 第一次：侧边栏折叠为图标列（宽度 48-56px），分类名称和子工具列表隐藏<br>2) 第二次：侧边栏恢复展开（宽度 240-280px）<br>3) 内容区宽度相应扩展/恢复 |
| **Playwright** | `layout.spec.ts :: 侧边栏折叠展开CtrlB` |

### TC-01-05: 搜索覆盖层打开（Ctrl+K）

| 项目 | 内容 |
|------|------|
| **前置条件** | 在首页 |
| **输入** | 按 `Ctrl+K` |
| **预期结果** | 1) 显示搜索覆盖层，背景半透明遮罩<br>2) 搜索输入框自动获得焦点<br>3) 初始显示全部工具（按分类分组） |
| **Playwright** | `layout.spec.ts :: 搜索覆盖层打开` |

### TC-01-06: 搜索关键词过滤

| 项目 | 内容 |
|------|------|
| **前置条件** | 搜索覆盖层已打开 |
| **输入** | 在搜索框输入 "base64" |
| **预期结果** | 1) 结果按分类分组显示<br>2) 至少包含"Base64 编解码"工具项<br>3) 匹配不区分大小写 |
| **Playwright** | `layout.spec.ts :: 搜索关键词过滤` |

### TC-01-07: 搜索选择并跳转

| 项目 | 内容 |
|------|------|
| **前置条件** | 搜索覆盖层已打开，搜索结果已显示 |
| **输入** | 1) 输入"base64" → 2) 按 `Enter` |
| **预期结果** | 1) 加载 Base64 编解码工具页面<br>2) 搜索覆盖层关闭<br>3) 侧边栏"Base64 编解码"高亮<br>4) 面包屑更新为"字符编码 > Base64 编解码" |
| **Playwright** | `layout.spec.ts :: 搜索选择并跳转` |

### TC-01-08: 搜索 Esc 关闭

| 项目 | 内容 |
|------|------|
| **前置条件** | 搜索覆盖层已打开 |
| **输入** | 按 `Escape` |
| **预期结果** | 1) 搜索覆盖层关闭<br>2) 搜索框内容清空 |
| **Playwright** | `layout.spec.ts :: 搜索Esc关闭` |

### TC-01-09: 搜索键盘导航（上下键）

| 项目 | 内容 |
|------|------|
| **前置条件** | 搜索覆盖层已打开，有多个搜索结果 |
| **输入** | 1) 按 `↓` → 2) 按 `↓` → 3) 按 `↑` |
| **预期结果** | 1) 第一次↓：第一个结果高亮<br>2) 第二次↓：第二个结果高亮<br>3) ↑：回到第一个结果高亮 |
| **Playwright** | `layout.spec.ts :: 搜索键盘导航` |

### TC-01-10: 搜索无匹配结果

| 项目 | 内容 |
|------|------|
| **前置条件** | 搜索覆盖层已打开 |
| **输入** | 输入 "xyznotexist123" |
| **预期结果** | 显示"未找到相关工具"提示 |
| **Playwright** | `layout.spec.ts :: 搜索无匹配结果` |

### TC-01-11: 首页功能卡片导航

| 项目 | 内容 |
|------|------|
| **前置条件** | 在首页 |
| **输入** | 点击首页分类区的 "Hex 转换" 功能卡片 |
| **预期结果** | 1) 记录使用时间到本地存储<br>2) 导航到 Hex 转换工具页面<br>3) 侧边栏对应项高亮 |
| **Playwright** | `layout.spec.ts :: 首页功能卡片导航` |

---

## TC-02: 字符编码转换（IX-03）

> 所有 5 个编码工具共享通用交互模式：实时转换（无防抖）、标签切换互换、交换按钮、复制按钮、清除按钮、历史记录。

### TC-02-01: Hex 编码 - 基本转换

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/encoding/hex`，默认编码模式，默认分隔符"空格"，前缀"无"，大小写"大写" |
| **输入** | 在输入区填入 `Hello` |
| **预期结果** | 输出区实时显示 `48 65 6C 6C 6F`（H=48, e=65, l=6C, l=6C, o=6F） |
| **Playwright** | `encoding.spec.ts :: Hex编码基本转换` |

### TC-02-02: Hex 解码 - 基本转换

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/encoding/hex` |
| **输入** | 1) 点击"解码"标签 → 2) 输入 `48 65 6C 6C 6F` |
| **预期结果** | 输出区实时显示 `Hello` |
| **Playwright** | `encoding.spec.ts :: Hex解码基本转换` |

### TC-02-03: Hex 编码 - 中文 UTF-8

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式 |
| **输入** | 输入 `A`（单字符） |
| **预期结果** | 输出区显示 `41`（ASCII 65 = 0x41） |
| **Playwright** | `encoding.spec.ts :: Hex编码单字符` |

### TC-02-04: Hex 选项 - 分隔符切换为逗号

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式，输入区有 `AB` |
| **输入** | 将分隔符从"空格"切换为"逗号" |
| **预期结果** | 输出从 `41 42` 变为 `41,42` |
| **Playwright** | `encoding.spec.ts :: Hex选项分隔符切换` |

### TC-02-05: Hex 选项 - 前缀切换为 0x

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式，输入区有 `AB` |
| **输入** | 将前缀从"无"切换为 `0x` |
| **预期结果** | 输出从 `41 42` 变为 `0x41 0x42` |
| **Playwright** | `encoding.spec.ts :: Hex选项前缀切换` |

### TC-02-06: Hex 选项 - 大小写切换为小写

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式，输入区有 `Hello` |
| **输入** | 将大小写从"大写"切换为"小写" |
| **预期结果** | 输出从 `48 65 6C 6C 6F` 变为 `48 65 6c 6c 6f` |
| **Playwright** | `encoding.spec.ts :: Hex选项大小写切换` |

### TC-02-07: Hex 标签切换 - 编码→解码互换

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式，输入 `Hello`，输出 `48 65 6C 6C 6F` |
| **输入** | 点击"解码"标签 |
| **预期结果** | 1) 输出区内容 `48 65 6C 6C 6F` 移入输入区<br>2) 模式切换为解码<br>3) 输出区显示重新解码结果 `Hello` |
| **Playwright** | `encoding.spec.ts :: Hex标签切换互换` |

### TC-02-08: Hex 标签重复点击忽略

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式 |
| **输入** | 点击"编码"标签（当前已激活的标签） |
| **预期结果** | 不执行任何操作，不切换模式、不互换输入输出、不重新转换 |
| **Playwright** | `encoding.spec.ts :: Hex标签重复点击忽略` |

### TC-02-09: Hex 交换按钮

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式，输入 `AB`，输出 `41 42` |
| **输入** | 点击交换按钮（双向箭头） |
| **预期结果** | 1) 输入区变为 `41 42`<br>2) 模式切换为解码<br>3) 输出区显示 `AB` |
| **Playwright** | `encoding.spec.ts :: Hex交换按钮` |

### TC-02-10: Hex 错误处理 - 非法输入解码

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 解码模式 |
| **输入** | 输入 `GHIJKL`（非 Hex 字符） |
| **预期结果** | 输出区显示红色错误提示，说明输入包含非 Hex 字符 |
| **Playwright** | `encoding.spec.ts :: Hex错误处理非法输入` |

### TC-02-11: Hex 清除按钮

| 项目 | 内容 |
|------|------|
| **前置条件** | 输入区有内容，输出区有结果 |
| **输入** | 点击"清除"按钮 |
| **预期结果** | 1) 输入区清空<br>2) 输出区清空<br>3) 信息提示区清空<br>4) 选项配置不变<br>5) 历史记录不清除 |
| **Playwright** | `encoding.spec.ts :: Hex清除按钮` |

### TC-02-12: Hex 紧凑复制

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 编码模式，输入 `Hello`，输出 `48 65 6C 6C 6F` |
| **输入** | 点击"紧凑复制"按钮 |
| **预期结果** | 剪贴板内容为 `48656C6C6F`（无分隔符） |
| **Playwright** | `encoding.spec.ts :: Hex紧凑复制` |

### TC-02-13: Base64 编码 - 基本

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/encoding/base64` |
| **输入** | 输入 `Hello World` |
| **预期结果** | 输出区实时显示 `SGVsbG8gV29ybGQ=` |
| **Playwright** | `encoding.spec.ts :: Base64编码基本` |

### TC-02-14: Base64 解码 - 往返验证

| 项目 | 内容 |
|------|------|
| **前置条件** | `/encoding/base64` |
| **输入** | 1) 输入 `你好世界` 得到编码结果 → 2) 点击"解码"标签 → 3) 确认输入区有编码结果 |
| **预期结果** | 解码输出区显示 `你好世界`，与原始输入一致 |
| **Playwright** | `encoding.spec.ts :: Base64解码往返验证` |

### TC-02-15: Base64 错误 - 无效 Base64 输入

| 项目 | 内容 |
|------|------|
| **前置条件** | Base64 解码模式 |
| **输入** | 输入 `!!!invalid!!!` |
| **预期结果** | 输出区显示红色错误提示"输入不是有效的 Base64 字符串" |
| **Playwright** | `encoding.spec.ts :: Base64错误无效输入` |

### TC-02-16: ASCII 编码 - 十进制

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/encoding/ascii`，默认十进制格式 |
| **输入** | 输入 `AB` |
| **预期结果** | 输出区显示 `65 66` |
| **Playwright** | `encoding.spec.ts :: ASCII编码十进制` |

### TC-02-17: ASCII 编码 - 十六进制格式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/encoding/ascii` |
| **输入** | 1) 输入 `AB` → 2) 将进制切换为十六进制 |
| **预期结果** | 输出从 `65 66` 变为 `41 42` |
| **Playwright** | `encoding.spec.ts :: ASCII编码十六进制` |

### TC-02-18: ASCII 非 ASCII 字符处理

| 项目 | 内容 |
|------|------|
| **前置条件** | `/encoding/ascii` |
| **输入** | 输入 `A中`（含中文） |
| **预期结果** | 输出包含 `65`（A 的 ASCII）和 `[非ASCII:20013]`（"中"的 Unicode 码值） |
| **Playwright** | `encoding.spec.ts :: ASCII非ASCII字符处理` |

### TC-02-19: URL 编码 - 组件编码模式

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/encoding/url`，默认"组件编码"模式 |
| **输入** | 输入 `hello world=1&foo=bar` |
| **预期结果** | 输出包含 `hello%20world%3D1%26foo%3Dbar`（所有特殊字符编码） |
| **Playwright** | `encoding.spec.ts :: URL编码组件编码` |

### TC-02-20: URL 编码 - 完整编码模式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/encoding/url` |
| **输入** | 1) 切换为"完整编码" → 2) 输入 `http://example.com/path?q=test` |
| **预期结果** | 输出保留 URL 结构字符：`http://example.com/path?q=test`（encodeURI 不编码 `:/?=&` 等） |
| **Playwright** | `encoding.spec.ts :: URL编码完整编码` |

### TC-02-21: URL 解码往返

| 项目 | 内容 |
|------|------|
| **前置条件** | `/encoding/url`，编码模式 |
| **输入** | 输入 `a=1&b=2` → 切换解码 → 确认输入为编码结果 |
| **预期结果** | 解码输出为 `a=1&b=2`，与原始输入一致 |
| **Playwright** | `encoding.spec.ts :: URL解码往返` |

### TC-02-22: Unicode 编码 - 基本

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/encoding/unicode`，默认 `\uXXXX` 格式 |
| **输入** | 输入 `你好` |
| **预期结果** | 输出包含 `你好`（"你"=0x4F60, "好"=0x597D） |
| **Playwright** | `encoding.spec.ts :: Unicode编码基本` |

### TC-02-23: Unicode 解码 - 往返验证

| 项目 | 内容 |
|------|------|
| **前置条件** | `/encoding/unicode`，编码模式 |
| **输入** | 输入 `AB` → 点击"解码"标签 → 确认输入为 `AB` |
| **预期结果** | 解码输出为 `AB` |
| **Playwright** | `encoding.spec.ts :: Unicode解码往返` |

### TC-02-24: 空输入处理（所有编码工具）

| 项目 | 内容 |
|------|------|
| **前置条件** | 任意编码工具，输入区有内容 |
| **输入** | 清空输入区 |
| **预期结果** | 输出区清空，不显示错误 |
| **Playwright** | `encoding.spec.ts :: 空输入处理` |

### TC-02-25: 复制按钮反馈（通用）

| 项目 | 内容 |
|------|------|
| **前置条件** | 任意编码工具，输出区有内容 |
| **输入** | 点击"复制"按钮 |
| **预期结果** | 1) 按钮文字变为"已复制"，颜色变绿<br>2) 1.2 秒后恢复原状<br>3) 剪贴板内容与输出区一致 |
| **Playwright** | `encoding.spec.ts :: 复制按钮反馈` |

### TC-02-26: 选项重复选择忽略（通用）

| 项目 | 内容 |
|------|------|
| **前置条件** | Hex 工具，当前分隔符为"空格" |
| **输入** | 再次选择分隔符"空格" |
| **预期结果** | 不重复触发转换，输出不变 |
| **Playwright** | `encoding.spec.ts :: 选项重复选择忽略` |

---

## TC-03: JSON 工具（IX-04）

### TC-03-01: JSON 格式化 & 压缩 - 同时双输出

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/json/format` |
| **输入** | 在输入区填入 `{"name":"test","value":123}` 并点击"格式化 & 压缩" |
| **预期结果** | 1) 格式化面板显示带缩进的 JSON：`{\n  "name": "test",\n  "value": 123\n}`<br>2) 压缩面板显示单行：`{"name":"test","value":123}`<br>3) 底部显示压缩率和字符数 |
| **Playwright** | `json-tools.spec.ts :: JSON格式化压缩同时双输出` |

### TC-03-02: JSON 格式化 - 缩进方式切换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/format`，输入 `{"a":1,"b":2}` 已格式化，默认 2 空格缩进 |
| **输入** | 将缩进切换为 4 空格 |
| **预期结果** | 格式化面板中每级缩进从 2 个空格变为 4 个空格 |
| **Playwright** | `json-tools.spec.ts :: JSON格式化缩进切换` |

### TC-03-03: JSON 格式化 - 排序 Keys

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/format`，输入 `{"b":2,"a":1,"c":3}` |
| **输入** | 开启"排序 Keys"开关 |
| **预期结果** | 格式化和压缩面板中 keys 按字母序排列：`a` 在 `b` 前，`b` 在 `c` 前 |
| **Playwright** | `json-tools.spec.ts :: JSON格式化排序Keys` |

### TC-03-04: JSON 格式化 - Unicode 转义

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/format`，输入 `{"name":"张三"}` |
| **输入** | 开启"Unicode 转义"开关 |
| **预期结果** | 输出中 "张三" 变为 `张三` |
| **Playwright** | `json-tools.spec.ts :: JSON格式化Unicode转义` |

### TC-03-05: JSON 格式化 - 非法 JSON 错误

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/format` |
| **输入** | 输入 `{invalid}` 并点击"格式化 & 压缩" |
| **预期结果** | 1) 输入区下方显示红色错误提示<br>2) 错误包含行号和原因（如"Unexpected token"）<br>3) 两个输出区清空 |
| **Playwright** | `json-tools.spec.ts :: JSON格式化非法JSON错误` |

### TC-03-06: JSON 格式化 - 重置按钮

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/format`，有输入和输出 |
| **输入** | 点击"重置"按钮 |
| **预期结果** | 1) 输入区清空<br>2) 两个输出区清空<br>3) 选项配置不变 |
| **Playwright** | `json-tools.spec.ts :: JSON格式化重置按钮` |

### TC-03-07: JSON 格式化 - 独立复制

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/format`，有格式化和压缩结果 |
| **输入** | 点击格式化面板的复制按钮 |
| **预期结果** | 仅复制格式化面板内容，不影响压缩面板 |
| **Playwright** | `json-tools.spec.ts :: JSON格式化独立复制` |

### TC-03-08: JSON 反序列化 - 生成 Java POJO

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/json/deserialize`，默认目标语言 Java |
| **输入** | 输入 `{"name":"John","age":30}` 并点击"生成" |
| **预期结果** | 输出区显示 Java 类定义，包含 `private String name;` 和 `private Integer age;` 字段 |
| **Playwright** | `json-tools.spec.ts :: JSON反序列化Java` |

### TC-03-09: JSON 反序列化 - 切换目标语言

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/deserialize` |
| **输入** | 输入 `{"name":"John","age":30}` → 切换为 Python → 点击"生成" |
| **预期结果** | 输出区显示 Python dataclass 格式 |
| **Playwright** | `json-tools.spec.ts :: JSON反序列化切换语言` |

### TC-03-10: JSONPath 查询 - 基本路径

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/json/path` |
| **输入** | JSON: `{"name":"test","value":123}`，JSONPath: `$.name`，点击"查询" |
| **预期结果** | 结果区显示匹配值 `"test"`，显示"找到 1 个匹配" |
| **Playwright** | `json-tools.spec.ts :: JSONPath基本路径` |

### TC-03-11: JSONPath 查询 - 数组查询

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/path` |
| **输入** | JSON: `{"store":{"book":[{"title":"A"},{"title":"B"}]}}`，JSONPath: `$..title` |
| **预期结果** | 匹配结果包含 `"A"` 和 `"B"` |
| **Playwright** | `json-tools.spec.ts :: JSONPath数组查询` |

### TC-03-12: JSONPath 查询 - 无匹配

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/path` |
| **输入** | JSON: `{"a":1}`，JSONPath: `$.nonexistent` |
| **预期结果** | 结果区显示"无匹配结果" |
| **Playwright** | `json-tools.spec.ts :: JSONPath无匹配` |

### TC-03-13: JSONPath 查询 - 无效表达式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/path` |
| **输入** | JSON: `{"a":1}`，JSONPath: `[invalid` |
| **预期结果** | 显示表达式错误提示 |
| **Playwright** | `json-tools.spec.ts :: JSONPath无效表达式` |

### TC-03-14: JSON Diff - 检测修改

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/json/diff` |
| **输入** | JSON A: `{"a":1,"b":2}`，JSON B: `{"a":1,"b":3}`，点击"对比" |
| **预期结果** | 1) 差异结果显示 `b` 值从 2 变为 3<br>2) 统计栏显示：相同 1，修改 1 |
| **Playwright** | `json-tools.spec.ts :: JSONDiff检测修改` |

### TC-03-15: JSON Diff - 检测新增

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/diff` |
| **输入** | JSON A: `{"a":1}`，JSON B: `{"a":1,"b":2}` |
| **预期结果** | 1) 差异显示 `b` 为新增（绿色标记）<br>2) 统计栏显示新增 1 |
| **Playwright** | `json-tools.spec.ts :: JSONDiff检测新增` |

### TC-03-16: JSON Diff - 检测删除

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/diff` |
| **输入** | JSON A: `{"a":1,"b":2}`，JSON B: `{"a":1}` |
| **预期结果** | 1) 差异显示 `b` 被删除（红色标记）<br>2) 统计栏显示删除 1 |
| **Playwright** | `json-tools.spec.ts :: JSONDiff检测删除` |

### TC-03-17: JSON Diff - 完全相同

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/diff` |
| **输入** | JSON A: `{"a":1,"b":2}`，JSON B: `{"a":1,"b":2}` |
| **预期结果** | 显示"完全相同"，无差异标记 |
| **Playwright** | `json-tools.spec.ts :: JSONDiff完全相同` |

### TC-03-18: JSON Diff - 键顺序不同视为相同

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/diff` |
| **输入** | JSON A: `{"level":"high","language":"java","seq":1}`，JSON B: `{"language":"java","level":"high","seq":1}` |
| **预期结果** | 显示"完全相同"（结构化比较，非文本比较） |
| **Playwright** | `json-tools.spec.ts :: JSONDiff键顺序不同` |

### TC-03-19: JSON Diff - 无效 JSON 错误

| 项目 | 内容 |
|------|------|
| **前置条件** | `/json/diff` |
| **输入** | JSON A: `{invalid}`，JSON B: `{"a":1}` |
| **预期结果** | 显示 JSON 解析错误提示 |
| **Playwright** | `json-tools.spec.ts :: JSONDiff无效JSON` |

---

## TC-04: 对称加密（IX-05）

### TC-04-01: AES-CBC 加密解密完整流程

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/crypto/aes`，默认 CBC 模式，PKCS7 填充，128 位密钥 |
| **输入** | 1) 点击"随机生成密钥"（生成 32 Hex 字符） → 2) 点击"随机生成 IV"（生成 32 Hex 字符） → 3) 输入明文 `Hello AES` → 4) 点击"加密" → 5) 记录密文 → 6) 点击"解密"标签 → 7) 点击"解密" |
| **预期结果** | 1) 加密后输出 Base64 密文（非空字符串）<br>2) 解密标签切换后密文自动移入输入区<br>3) 解密输出 `Hello AES`（与原始明文一致） |
| **Playwright** | `crypto-hash.spec.ts :: AES-CBC加密解密完整流程` |

### TC-04-02: AES-ECB 模式（IV 隐藏）

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/aes` |
| **输入** | 1) 切换模式为 ECB → 2) 随机生成密钥 → 3) 输入明文 `ECB test` → 4) 加密 |
| **预期结果** | 1) IV 输入行隐藏（display:none）<br>2) 加密成功，输出密文<br>3) 解密还原为 `ECB test` |
| **Playwright** | `crypto-hash.spec.ts :: AES-ECB模式` |

### TC-04-03: AES-GCM 模式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/aes` |
| **输入** | 切换为 GCM → 随机生成密钥和 IV → 输入 `GCM test data` → 加密 |
| **预期结果** | 加密成功，输出密文；解密还原为 `GCM test data` |
| **Playwright** | `crypto-hash.spec.ts :: AES-GCM模式` |

### TC-04-04: AES 密钥长度切换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/aes`，当前密钥长度 128 |
| **输入** | 1) 随机生成密钥 → 2) 切换密钥长度为 256 |
| **预期结果** | 1) 密钥输入框清空<br>2) 显示提示"密钥长度已变更，请重新输入或生成密钥"<br>3) 重新生成后密钥为 64 个 Hex 字符 |
| **Playwright** | `crypto-hash.spec.ts :: AES密钥长度切换` |

### TC-04-05: AES 输出格式 Hex

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/aes`，已加密 |
| **输入** | 切换输出格式为 Hex |
| **预期结果** | 输出为纯 Hex 字符串（匹配 `/^[0-9a-fA-F]+$/`） |
| **Playwright** | `crypto-hash.spec.ts :: AES输出格式Hex` |

### TC-04-06: AES 加密校验 - 缺少密钥

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/aes`，密钥为空 |
| **输入** | 输入明文 `test` → 点击"加密" |
| **预期结果** | 密钥输入框下方显示红色错误提示 |
| **Playwright** | `crypto-hash.spec.ts :: AES加密校验缺少密钥` |

### TC-04-07: AES 交换按钮

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/aes`，已加密成功，有密文输出 |
| **输入** | 点击交换按钮 |
| **预期结果** | 1) 密文移入输入区<br>2) Tab 自动切换为"解密"<br>3) 可直接点击解密还原明文 |
| **Playwright** | `crypto-hash.spec.ts :: AES交换按钮` |

### TC-04-08: DES 加密解密

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/crypto/des` |
| **输入** | 1) 选择单倍长 DES → 2) 随机生成密钥（8 字节/16 Hex） → 3) 输入 `Hello DES` → 4) 加密 → 5) 切换解密 → 6) 解密 |
| **预期结果** | 解密输出 `Hello DES` |
| **Playwright** | `crypto-hash.spec.ts :: DES加密解密` |

### TC-04-09: 3DES 加密解密

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/des` |
| **输入** | 切换为 3DES → 随机生成密钥（24 字节/48 Hex） → 加密 `Hello 3DES` → 解密 |
| **预期结果** | 解密输出 `Hello 3DES` |
| **Playwright** | `crypto-hash.spec.ts :: 3DES加密解密` |

---

## TC-05: RSA 工具（IX-06）

### TC-05-01: RSA 密钥生成 - 2048 位

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/crypto/rsa`，密钥生成 Tab |
| **输入** | 点击"生成密钥对" |
| **预期结果** | 1) 公钥输出区显示 PEM 格式，包含 `-----BEGIN PUBLIC KEY-----`<br>2) 私钥输出区默认遮罩显示<br>3) 安全提示框显示"私钥是敏感信息，请妥善保管，切勿泄露" |
| **Playwright** | `crypto-hash.spec.ts :: RSA密钥生成2048` |

### TC-05-02: RSA 私钥可见性切换

| 项目 | 内容 |
|------|------|
| **前置条件** | 已生成密钥对 |
| **输入** | 点击私钥眼睛图标 |
| **预期结果** | 1) 私钥从遮罩变为 PEM 明文显示<br>2) 图标从闭眼变为睁眼 |
| **Playwright** | `crypto-hash.spec.ts :: RSA私钥可见性切换` |

### TC-05-03: RSA 加密解密流程

| 项目 | 内容 |
|------|------|
| **前置条件** | 已生成密钥对 |
| **输入** | 1) 切换到"加密/解密"Tab → 2) 加密子 Tab → 3) 输入明文 `Hello RSA` → 4) 填入公钥 → 5) 点击"加密" → 6) 切换解密子 Tab → 7) 填入私钥 → 8) 点击"解密" |
| **预期结果** | 1) 加密输出 Base64 密文<br>2) 解密输出 `Hello RSA` |
| **Playwright** | `crypto-hash.spec.ts :: RSA加密解密流程` |

### TC-05-04: RSA 签名验签 - 验证通过

| 项目 | 内容 |
|------|------|
| **前置条件** | 已生成密钥对 |
| **输入** | 1) 切换到"签名/验签"Tab → 2) 签名子 Tab → 3) 输入数据 `test data` → 4) 填入私钥 → 5) 点击"签名" → 6) 记录签名值 → 7) 切换验签子 Tab → 8) 输入原始数据 `test data` → 9) 填入签名值 → 10) 填入公钥 → 11) 点击"验签" |
| **预期结果** | 1) 签名输出 Base64 值<br>2) 验签显示绿色"验证通过"结果框 |
| **Playwright** | `crypto-hash.spec.ts :: RSA签名验签通过` |

### TC-05-05: RSA 签名验签 - 验证失败

| 项目 | 内容 |
|------|------|
| **前置条件** | 已生成密钥对，已签名 |
| **输入** | 验签时原始数据改为 `tampered data`（与签名数据不同） |
| **预期结果** | 显示红色"验证失败"结果框 |
| **Playwright** | `crypto-hash.spec.ts :: RSA签名验签失败` |

---

## TC-06: 哈希摘要（IX-07）

### TC-06-01: SHA-256 哈希计算

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/crypto/hash`，默认 SHA-256 |
| **输入** | 输入 `hello` → 点击"计算" |
| **预期结果** | 主结果卡片显示 `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`（64 字符） |
| **Playwright** | `crypto-hash.spec.ts :: SHA256哈希计算` |

### TC-06-02: MD5 哈希计算

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/hash` |
| **输入** | 切换算法为 MD5 → 输入 `hello` → 点击"计算" |
| **预期结果** | 结果显示 `5d41402abc4b2a76b9719d911017c592`（32 字符） |
| **Playwright** | `crypto-hash.spec.ts :: MD5哈希计算` |

### TC-06-03: HMAC-SHA256 计算

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/hash` |
| **输入** | 切换算法为 HMAC-SHA256 → Secret Key 输入区出现 → 输入密钥 `secret` → 输入数据 `hello` → 点击"计算" |
| **预期结果** | HMAC Secret Key 区域显示；结果显示 64 字符 Hex 值 |
| **Playwright** | `crypto-hash.spec.ts :: HMACSHA256计算` |

### TC-06-04: CRC32 计算

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/hash` |
| **输入** | 切换算法为 CRC32 → 输入 `hello` → 点击"计算" |
| **预期结果** | 结果显示 8 字符 Hex 值 |
| **Playwright** | `crypto-hash.spec.ts :: CRC32计算` |

### TC-06-05: 哈希 - 展开其他算法结果

| 项目 | 内容 |
|------|------|
| **前置条件** | 已计算 SHA-256 |
| **输入** | 点击"查看其他算法结果" |
| **预期结果** | 1) 展开其他算法结果网格<br>2) 显示 MD5、SHA-1、SHA-384、SHA-512、CRC32 等结果<br>3) 不包含当前选中的 SHA-256 |
| **Playwright** | `crypto-hash.spec.ts :: 展开其他算法结果` |

### TC-06-06: HMAC 缺少密钥错误

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/hash`，选择了 HMAC-SHA256，Secret Key 为空 |
| **输入** | 输入数据 `hello` → 点击"计算" |
| **预期结果** | 显示错误提示"HMAC 计算需要密钥" |
| **Playwright** | `crypto-hash.spec.ts :: HMAC缺少密钥错误` |

---

## TC-07: 密钥工具（IX-08）

### TC-07-01: 随机密钥生成 - 默认参数

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/crypto/key` |
| **输入** | 页面加载（自动生成 1 个 AES 128bit Hex 密钥） |
| **预期结果** | 1) 显示一张密钥卡片<br>2) 密钥值为 32 个 Hex 字符（128bit / 16字节） |
| **Playwright** | `remaining-tools.spec.ts :: 密钥生成默认参数` |

### TC-07-02: 随机密钥生成 - 多个密钥

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/key` |
| **输入** | 设置数量为 5 → 点击"生成" |
| **预期结果** | 1) 显示 5 张密钥卡片<br>2) 显示"批量复制"按钮 |
| **Playwright** | `remaining-tools.spec.ts :: 密钥生成多个` |

### TC-07-03: 随机密钥 - AES 密钥长度切换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/key`，随机密钥 Tab |
| **输入** | 选择算法 AES → 密钥长度切换为 256bit → 点击"生成" |
| **预期结果** | 生成的密钥为 64 个 Hex 字符（32 字节） |
| **Playwright** | `remaining-tools.spec.ts :: 密钥生成AES256` |

### TC-07-04: 随机密钥 - DES 单倍长/双倍长/三倍长

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/key`，随机密钥 Tab |
| **输入** | 选择算法 DES/3DES → 密钥长度切换为双倍长 → 点击"生成" |
| **预期结果** | 生成的密钥为 32 个 Hex 字符（16 字节） |
| **Playwright** | `remaining-tools.spec.ts :: 密钥生成DES双倍长` |

### TC-07-05: 随机密钥 - Hex 大小写切换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/key`，已生成 Hex 格式密钥 |
| **输入** | 点击"小写"按钮 → 复制密钥 |
| **预期结果** | 1) 显示的密钥变为小写<br>2) 复制内容为小写 Hex |
| **Playwright** | `remaining-tools.spec.ts :: 密钥生成大小写切换` |

### TC-07-06: KCV 计算 - AES 基本计算

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/key`，KCV 计算 Tab |
| **输入** | 选择算法 AES → 密钥长度 128bit → 输入 32 个 Hex 字符密钥 → 点击"计算 KCV" |
| **预期结果** | KCV 输出为 6 个大写 Hex 字符 |
| **Playwright** | `remaining-tools.spec.ts :: KCV计算` |

### TC-07-07: KCV 计算 - Hex 输入限制

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/key`，KCV 计算 Tab，算法 AES 128bit |
| **输入** | 在密钥输入框中尝试输入非 Hex 字符 `G`、`K` |
| **预期结果** | 1) 非 Hex 字符无法输入（按键无反应）<br>2) 输入框只包含 0-9、a-f、A-F |
| **Playwright** | `remaining-tools.spec.ts :: KCVHex输入限制` |

### TC-07-08: KCV 计算 - 密钥长度与字节数显示

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/key`，KCV 计算 Tab，算法 DES 单倍长 |
| **输入** | 输入 10 个 Hex 字符 |
| **预期结果** | 1) 字节数显示 `5/8`（已输入 5 字节 / 需要 8 字节）<br>2) 字节数颜色为灰色（未填满）<br>3) "计算 KCV"按钮禁用 |
| **Playwright** | `remaining-tools.spec.ts :: KCV字节数显示` |

### TC-07-09: KCV 计算 - 结果大小写切换

| 项目 | 内容 |
|------|------|
| **前置条件** | 已计算出 KCV 结果 |
| **输入** | 点击"小写"按钮 |
| **预期结果** | 1) KCV 结果变为小写显示<br>2) 复制内容为小写 Hex |
| **Playwright** | `remaining-tools.spec.ts :: KCV大小写切换` |

---

## TC-08: 数字计算（IX-10）

### TC-08-01: 进制转换 - 十进制转其他

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/calculator/base`，源进制十进制 |
| **输入** | 输入 `255` |
| **预期结果** | 1) 二进制卡片显示 `11111111`<br>2) 八进制卡片显示 `377`<br>3) 十六进制卡片显示 `FF` |
| **Playwright** | `calc-time.spec.ts :: 进制转换十进制转其他` |

### TC-08-02: 进制转换 - 十六进制输入

| 项目 | 内容 |
|------|------|
| **前置条件** | `/calculator/base` |
| **输入** | 切换源进制为十六进制 → 输入 `FF` |
| **预期结果** | 十进制卡片显示 `255`，二进制卡片显示 `11111111` |
| **Playwright** | `calc-time.spec.ts :: 进制转换十六进制输入` |

### TC-08-03: 进制转换 - 无效字符错误

| 项目 | 内容 |
|------|------|
| **前置条件** | `/calculator/base`，源进制二进制 |
| **输入** | 切换源进制为二进制 → 输入 `123` |
| **预期结果** | 输入框边框变红，显示"输入包含无效字符"错误提示 |
| **Playwright** | `calc-time.spec.ts :: 进制转换无效字符` |

---

## TC-09: 时间计算（IX-13）

### TC-09-01: 时间戳转换 - 秒级

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/time/timestamp` |
| **输入** | 输入时间戳 `1609459200`（2021-01-01 00:00:00 UTC） |
| **预期结果** | 1) 精度标识显示"秒"<br>2) UTC 时间显示包含 `2021` |
| **Playwright** | `calc-time.spec.ts :: 时间戳转换秒级` |

### TC-09-02: 时间戳转换 - 毫秒级自动识别

| 项目 | 内容 |
|------|------|
| **前置条件** | `/time/timestamp` |
| **输入** | 输入 `1609459200000` |
| **预期结果** | 1) 精度标识显示"毫秒"<br>2) 转换结果显示包含 `2021` |
| **Playwright** | `calc-time.spec.ts :: 时间戳转换毫秒级` |

### TC-09-03: 时间戳转换 - "当前时间"按钮

| 项目 | 内容 |
|------|------|
| **前置条件** | `/time/timestamp` |
| **输入** | 点击"当前时间"按钮 |
| **预期结果** | 1) 输入框更新为当前时间戳<br>2) 时间戳为 10 或 13 位数字 |
| **Playwright** | `calc-time.spec.ts :: 时间戳当前时间按钮` |

### TC-09-04: 时间推算

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/time/calculate` |
| **输入** | 基准时间 `2024-01-01 00:00:00`，加 1 天 |
| **预期结果** | 推算结果显示 `2024-01-02 00:00:00`，并显示对应时间戳 |
| **Playwright** | `calc-time.spec.ts :: 时间推算` |

---

## TC-10: Cron 表达式（IX-14）

### TC-10-01: Cron 默认表达式解析

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/cron/editor` |
| **输入** | 页面加载（默认表达式 `*/5 * * * *`） |
| **预期结果** | 1) 人类可读描述包含中文含义<br>2) 显示最近 10 次执行时间列表 |
| **Playwright** | `calc-time.spec.ts :: Cron默认表达式解析` |

### TC-10-02: Cron 手动输入表达式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/cron/editor` |
| **输入** | 清空表达式 → 输入 `0 0 * * *` |
| **预期结果** | 1) 人类可读描述包含"每天"和"00:00"<br>2) 执行时间列表更新 |
| **Playwright** | `calc-time.spec.ts :: Cron手动输入表达式` |

### TC-10-03: Cron 预设模板

| 项目 | 内容 |
|------|------|
| **前置条件** | `/cron/editor` |
| **输入** | 点击"常用 Cron"按钮 → 点击"每分钟"预设 |
| **预期结果** | 表达式输入框填充为 `* * * * *`，描述更新 |
| **Playwright** | `calc-time.spec.ts :: Cron预设模板` |

### TC-10-04: Cron 非法表达式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/cron/editor` |
| **输入** | 输入 `99 99 99 99 99` |
| **预期结果** | 1) 表达式输入框边框变红<br>2) 显示错误信息<br>3) 执行时间列表清空 |
| **Playwright** | `calc-time.spec.ts :: Cron非法表达式` |

---

## TC-11: 正则调试（IX-15）

### TC-11-01: 正则匹配 - 基本匹配

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/regex/tester` |
| **输入** | 正则：`\d+`，测试文本：`abc 123 def 456` |
| **预期结果** | 1) 测试文本中 `123` 和 `456` 黄色高亮<br>2) 匹配数量显示"找到 2 个匹配" |
| **Playwright** | `remaining-tools.spec.ts :: 正则匹配基本` |

### TC-11-02: 正则匹配 - 无匹配

| 项目 | 内容 |
|------|------|
| **前置条件** | `/regex/tester` |
| **输入** | 正则：`xyz123`，测试文本：`hello world` |
| **预期结果** | 显示"未找到匹配"，匹配数量为 0 |
| **Playwright** | `remaining-tools.spec.ts :: 正则匹配无匹配` |

### TC-11-03: 正则匹配 - 语法错误

| 项目 | 内容 |
|------|------|
| **前置条件** | `/regex/tester` |
| **输入** | 正则：`(unclosed` |
| **预期结果** | 正则输入框边框变红，显示错误信息 |
| **Playwright** | `remaining-tools.spec.ts :: 正则匹配语法错误` |

### TC-11-04: 正则 Flag 切换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/regex/tester` |
| **输入** | 正则：`hello`，测试文本：`HELLO world`，点击 `i` flag 按钮 |
| **预期结果** | 切换后匹配到 `HELLO`（忽略大小写） |
| **Playwright** | `remaining-tools.spec.ts :: 正则Flag切换` |

### TC-11-05: 正则常用模板 - Email

| 项目 | 内容 |
|------|------|
| **前置条件** | `/regex/tester` |
| **输入** | 展开常用正则库 → 点击 Email 模板 |
| **预期结果** | 正则输入框自动填入 Email 正则表达式 |
| **Playwright** | `remaining-tools.spec.ts :: 正则常用模板Email` |

---

## TC-12: Grok 调试（IX-16）

### TC-12-01: Grok 基本解析

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/grok/tester` |
| **输入** | Pattern：`%{IP:client_ip} %{GREEDYDATA:message}`，日志：`192.168.1.1 hello world`，点击"解析" |
| **预期结果** | 结果表格显示 `client_ip=192.168.1.1`，`message=hello world` |
| **Playwright** | `remaining-tools.spec.ts :: Grok基本解析` |

### TC-12-02: Grok 多字段解析

| 项目 | 内容 |
|------|------|
| **前置条件** | `/grok/tester` |
| **输入** | Pattern：`%{IP:ip} %{WORD:method} %{URIPATH:path}`，日志：`10.0.0.1 GET /api/users` |
| **预期结果** | 结果包含 `ip=10.0.0.1`、`method=GET`、`path=/api/users` |
| **Playwright** | `remaining-tools.spec.ts :: Grok多字段解析` |

### TC-12-03: Grok 模式语法错误

| 项目 | 内容 |
|------|------|
| **前置条件** | `/grok/tester` |
| **输入** | Pattern：`%{UNKNOWN_PATTERN:field}`，日志：`test` |
| **预期结果** | Pattern 输入框边框变红，显示"未知的 pattern"错误 |
| **Playwright** | `remaining-tools.spec.ts :: Grok模式语法错误` |

---

## TC-13: Nginx 工具（IX-17）

### TC-13-01: Nginx 格式化

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/nginx/tool`，默认"格式化"选项卡 |
| **输入** | 输入 `server{listen 80;location /{proxy_pass http://backend;}}` → 点击"格式化" |
| **预期结果** | 1) 输出显示正确缩进的配置<br>2) `server`、`location` 等块级指令逐级缩进<br>3) 指令蓝色高亮，注释灰色 |
| **Playwright** | `remaining-tools.spec.ts :: Nginx格式化` |

### TC-13-02: Nginx 语法检查 - 通过

| 项目 | 内容 |
|------|------|
| **前置条件** | `/nginx/tool`，切换到"语法检查"选项卡 |
| **输入** | 输入 `server { listen 80; }` → 点击"检查" |
| **预期结果** | 显示绿色"语法检查通过"提示 |
| **Playwright** | `remaining-tools.spec.ts :: Nginx语法检查通过` |

### TC-13-03: Nginx 语法检查 - 失败

| 项目 | 内容 |
|------|------|
| **前置条件** | `/nginx/tool`，"语法检查"选项卡 |
| **输入** | 输入 `server { listen 80 location / { } }`（缺少分号） |
| **预期结果** | 1) 错误行红色标注<br>2) 显示错误列表（如"第 2 行：缺少分号"） |
| **Playwright** | `remaining-tools.spec.ts :: Nginx语法检查失败` |

### TC-13-04: Nginx Diff 对比

| 项目 | 内容 |
|------|------|
| **前置条件** | `/nginx/tool`，切换到"Diff 对比"选项卡 |
| **输入** | 旧配置：`server { listen 80; }`，新配置：`server { listen 443; }` → 点击"对比" |
| **预期结果** | 1) 差异标注（新增绿色，删除红色，修改黄色）<br>2) 差异摘要显示行数统计 |
| **Playwright** | `remaining-tools.spec.ts :: NginxDiff对比` |

### TC-13-05: Nginx 模板

| 项目 | 内容 |
|------|------|
| **前置条件** | `/nginx/tool`，切换到"模板"选项卡 |
| **输入** | 浏览模板列表 → 点击"反向代理"模板卡片 |
| **预期结果** | 1) 模板配置填入输入区<br>2) 自动切换到"格式化"选项卡 |
| **Playwright** | `remaining-tools.spec.ts :: Nginx模板` |

---

## TC-14: 配置文件转换（IX-18）

### TC-14-01: Properties → YAML 转换

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/config/converter`，默认 JSON → YAML |
| **输入** | 切换源格式为 Properties → 输入 `server.port=8080` → 点击"转换" |
| **预期结果** | 输出显示 YAML 格式，包含 `server:` 和 `port:` |
| **Playwright** | `remaining-tools.spec.ts :: Properties转YAML` |

### TC-14-02: JSON → YAML 转换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/config/converter` |
| **输入** | 源格式 JSON → 输入 `{"server":{"port":8080}}` → 目标格式 YAML → 点击"转换" |
| **预期结果** | 输出显示 `server:\n  port: 8080` |
| **Playwright** | `remaining-tools.spec.ts :: JSON转YAML` |

### TC-14-03: 方向交换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/config/converter`，JSON → YAML，已有转换结果 |
| **输入** | 点击中间箭头交换方向 |
| **预期结果** | 1) 源格式和目标格式互换<br>2) 右侧结果移至左侧作为新输入<br>3) 右侧面板清空 |
| **Playwright** | `remaining-tools.spec.ts :: 配置转换方向交换` |

### TC-14-04: 自动检测格式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/config/converter` |
| **输入** | 输入 `{"key":"value"}` → 点击"自动检测" |
| **预期结果** | 源格式自动切换为 JSON |
| **Playwright** | `remaining-tools.spec.ts :: 配置转换自动检测` |

### TC-14-05: 转换错误 - 无效源格式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/config/converter` |
| **输入** | 源格式 JSON → 输入 `{invalid json}` → 点击"转换" |
| **预期结果** | 1) 错误行红色标注<br>2) 显示具体错误信息（包含行号） |
| **Playwright** | `remaining-tools.spec.ts :: 配置转换错误` |

---

## TC-15: 编码解码 - JWT / HTML Entity / 颜色转换（IX-19）

### TC-15-01: JWT 解码 - 基本

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/codec/jwt` |
| **输入** | 输入 JWT `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c` → 点击"解码" |
| **预期结果** | 1) Header 卡片显示 `{"alg":"HS256","typ":"JWT"}`<br>2) Payload 卡片显示 `{"sub":"1234567890","name":"John Doe","iat":1516239022}`<br>3) Signature 卡片显示签名算法和原始 Base64 |
| **Playwright** | `remaining-tools.spec.ts :: JWT解码基本` |

### TC-15-02: JWT 解码 - 无效格式

| 项目 | 内容 |
|------|------|
| **前置条件** | `/codec/jwt` |
| **输入** | 输入 `invalid.jwt.token` |
| **预期结果** | 显示红色错误提示"无效的 JWT 格式" |
| **Playwright** | `remaining-tools.spec.ts :: JWT解码无效格式` |

### TC-15-03: HTML Entity 编码

| 项目 | 内容 |
|------|------|
| **前置条件** | `/codec/jwt`，切换到 HTML Entity 子工具 |
| **输入** | 输入 `<div>"hello"</div>` → 点击"执行" |
| **预期结果** | 输出包含 `&lt;div&gt;&quot;hello&quot;&lt;/div&gt;` |
| **Playwright** | `remaining-tools.spec.ts :: HTMLEntity编码` |

### TC-15-04: HTML Entity 解码

| 项目 | 内容 |
|------|------|
| **前置条件** | `/codec/jwt`，HTML Entity 子工具 |
| **输入** | 切换为"解码" → 输入 `&lt;div&gt;` → 点击"执行" |
| **预期结果** | 输出 `<div>` |
| **Playwright** | `remaining-tools.spec.ts :: HTMLEntity解码` |

### TC-15-05: 颜色转换 - HEX 输入

| 项目 | 内容 |
|------|------|
| **前置条件** | `/codec/jwt`，切换到颜色转换子工具 |
| **输入** | 输入 `#3b82f6` |
| **预期结果** | 1) RGB 显示 `R:59 G:130 B:246`<br>2) HSL 显示对应值<br>3) 颜色预览块更新 |
| **Playwright** | `remaining-tools.spec.ts :: 颜色转换HEX输入` |

### TC-15-06: 颜色转换 - 无效值自动校正

| 项目 | 内容 |
|------|------|
| **前置条件** | 颜色转换子工具 |
| **输入** | RGB R 输入 `300`（超出 0-255 范围） |
| **预期结果** | 1) 值自动校正为 `255`<br>2) 显示黄色提示"值已自动校正" |
| **Playwright** | `remaining-tools.spec.ts :: 颜色转换无效值校正` |

---

## TC-16: 二维码工具（IX-11）

### TC-16-01: 二维码生成 - 基本文本

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/qrcode/generate` |
| **输入** | 在内容框输入 `Hello QR` |
| **预期结果** | 1) 300ms 防抖后右侧显示二维码图片<br>2) 下载按钮可用 |
| **Playwright** | `remaining-tools.spec.ts :: 二维码生成基本` |

### TC-16-02: 二维码生成 - 容错级别切换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/qrcode/generate`，已有二维码 |
| **输入** | 切换容错级别从 L 到 H |
| **预期结果** | 二维码重新生成，图片更新 |
| **Playwright** | `remaining-tools.spec.ts :: 二维码生成容错级别` |

### TC-16-03: 二维码解析 - 页面加载

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/qrcode/parse` |
| **输入** | 页面加载 |
| **预期结果** | 显示拖拽提示"拖拽图片到此处或点击上传"和"支持 Ctrl+V 粘贴" |
| **Playwright** | `remaining-tools.spec.ts :: 二维码解析页面加载` |

---

## TC-17: OpenSSL 工具（IX-09）

### TC-17-01: 命令构建 - 默认生成命令

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/crypto/openssl`，默认命令构建 Tab |
| **输入** | 页面加载 |
| **预期结果** | 命令输出区显示包含 `openssl` 的命令字符串（默认为"查看证书信息"：`openssl x509 -in cert.pem -text -noout`） |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL命令构建默认生成` |

### TC-17-02: 命令构建 - 切换分类和操作

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，命令构建 Tab |
| **输入** | 切换分类为"密钥操作" |
| **预期结果** | 1) 操作下拉框更新为密钥操作选项（生成私钥、查看私钥信息等）<br>2) 命令输出区自动更新为密钥相关命令 |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL命令构建切换分类` |

### TC-17-03: 命令构建 - 修改输入输出文件名

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，命令构建 Tab |
| **输入** | 输入文件名改为 `mycert.pem` |
| **预期结果** | 命令输出区中 `{input}` 替换为 `mycert.pem` |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL命令构建修改文件名` |

### TC-17-04: 证书解析 - PEM 证书解析

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，证书解析 Tab |
| **输入** | 粘贴有效 PEM 证书（含 `-----BEGIN CERTIFICATE-----`） → 点击"解析证书" |
| **预期结果** | 1) 结构化显示：主题（CN·O·C）、颁发者、序列号（Hex）、有效期、签名算法、公钥算法及位数、SHA-256 指纹<br>2) 序列号和指纹带复制按钮 |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL证书解析PEM` |

### TC-17-05: 证书解析 - 裸 base64 自动补充前后缀

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，证书解析 Tab |
| **输入** | 粘贴不含 `-----BEGIN CERTIFICATE-----` 前后缀的裸 base64 内容 |
| **预期结果** | 1) 输入框自动补充 `-----BEGIN CERTIFICATE-----` 和 `-----END CERTIFICATE-----`<br>2) 内容按 64 字符自动折行 |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL证书解析裸base64` |

### TC-17-06: 证书解析 - 空输入错误

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，证书解析 Tab |
| **输入** | 不输入内容 → 点击"解析证书" |
| **预期结果** | 不显示解析结果（`cert-result` 区域不出现） |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL证书解析空输入` |

### TC-17-07: CSR 生成 - 填写信息生成命令

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，CSR 生成 Tab |
| **输入** | C: `CN`，ST: `Shanghai`，O: `MyOrg`，CN: `www.example.com` → 点击"生成命令" |
| **预期结果** | 1) 输出区显示 `openssl req -new -newkey rsa:2048...` 命令<br>2) 命令包含 `/C=CN/ST=Shanghai/O=MyOrg/CN=www.example.com` |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSLCSR生成命令` |

### TC-17-08: 格式转换 - PEM 转 DER

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，格式转换 Tab |
| **输入** | 源格式 PEM → 目标格式 DER → 粘贴 PEM 证书 → 点击"转换" |
| **预期结果** | 1) 转换成功<br>2) 输出区显示 base64 编码的 DER 数据（纯 Base64 字符） |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL格式转换PEM转DER` |

### TC-17-09: 格式转换 - PEM 转 P7B

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，格式转换 Tab |
| **输入** | 源格式 PEM → 目标格式 PKCS7 → 粘贴 PEM 证书 → 点击"转换" |
| **预期结果** | 1) 转换成功<br>2) 输出区显示包含 `-----BEGIN` 的 PKCS7 格式内容 |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL格式转换PEM转P7B` |

### TC-17-10: 格式转换 - 裸 base64 自动补充

| 项目 | 内容 |
|------|------|
| **前置条件** | `/crypto/openssl`，格式转换 Tab |
| **输入** | 粘贴不含 PEM 前后缀的裸 base64 证书内容 |
| **预期结果** | 1) 输入框自动补充 `-----BEGIN CERTIFICATE-----` 前后缀<br>2) 内容按 64 字符折行 |
| **Playwright** | `remaining-tools.spec.ts :: OpenSSL格式转换裸base64` |

---

## TC-18: HTTP Client（IX-12）

### TC-18-01: HTTP Client - 页面加载

| 项目 | 内容 |
|------|------|
| **前置条件** | 导航到 `/http/client` |
| **输入** | 页面加载 |
| **预期结果** | 1) 方法选择器默认 GET（绿色高亮）<br>2) URL 输入框显示占位提示<br>3) 响应区域显示空状态提示 |
| **Playwright** | `remaining-tools.spec.ts :: HTTPClient页面加载` |

### TC-18-02: HTTP Client - 方法切换

| 项目 | 内容 |
|------|------|
| **前置条件** | `/http/client` |
| **输入** | 点击 POST 方法 |
| **预期结果** | 1) POST 徽章蓝色高亮<br>2) GET 徽章取消高亮 |
| **Playwright** | `remaining-tools.spec.ts :: HTTPClient方法切换` |

---

## 测试统计

| 分类 | 测试用例数 | Playwright 文件 |
|------|-----------|----------------|
| 主框架与布局（TC-01） | 11 | `layout.spec.ts` |
| 字符编码转换（TC-02） | 26 | `encoding.spec.ts` |
| JSON 工具（TC-03） | 19 | `json-tools.spec.ts` |
| 对称加密（TC-04） | 9 | `crypto-hash.spec.ts` |
| RSA 工具（TC-05） | 5 | `crypto-hash.spec.ts` |
| 哈希摘要（TC-06） | 6 | `crypto-hash.spec.ts` |
| 密钥工具（TC-07） | 9 | `remaining-tools.spec.ts` |
| 数字计算（TC-08） | 3 | `calc-time.spec.ts` |
| 时间计算（TC-09） | 4 | `calc-time.spec.ts` |
| Cron 表达式（TC-10） | 4 | `calc-time.spec.ts` |
| 正则调试（TC-11） | 5 | `remaining-tools.spec.ts` |
| Grok 调试（TC-12） | 3 | `remaining-tools.spec.ts` |
| Nginx 工具（TC-13） | 5 | `remaining-tools.spec.ts` |
| 配置转换（TC-14） | 5 | `remaining-tools.spec.ts` |
| 编码解码（TC-15） | 6 | `remaining-tools.spec.ts` |
| 二维码（TC-16） | 3 | `remaining-tools.spec.ts` |
| OpenSSL（TC-17） | 10 | `remaining-tools.spec.ts` |
| HTTP Client（TC-18） | 2 | `remaining-tools.spec.ts` |
| **合计** | **135** | 6 个 Playwright 文件 |
