# DevToolkit 用户使用手册

## 应用简介

DevToolkit 是一款功能强大的开发者工具箱桌面应用，采用 Vue 3 + Rust/Tauri 技术栈开发。应用内含 13 个主要类别，共 26 个实用工具，涵盖开发者在日常工作中最常用的各种工具。

DevToolkit 提供了直观易用的界面，支持快速启动和高效操作，让开发者能够轻松完成各种编码、数据处理和网络调试任务。

## 功能亮点

- 🎯 **多工具合一** - 集成 26 个实用工具，无需切换多个应用
- ⚡ **高性能** - Rust 核心确保快速响应和低资源占用
- 🖥️ **跨平台** - 支持 Windows、macOS 和 Linux 操作系统
- 📱 **双模式运行** - 开发环境 HTTP 双进程模式，生产环境 Tauri IPC 单进程模式
- 🔧 **现代化界面** - 基于 Vue 3 的优雅用户界面设计
- 🌐 **离线使用** - 所有功能均可离线运行，保护数据隐私

## 工具分类

### 字符编码工具
- Hex 转换
- Base64 编解码
- ASCII 转换
- URL 编解码
- Unicode 编解码

### JSON 工具
- JSON 格式化 & 压缩
- JSON 反序列化
- JSONPath 查询
- JSON Diff 对比

### 加密解密工具
- AES 加密/解密
- DES/3DES 加密
- RSA 密钥工具
- 哈希摘要生成
- 密钥生成与管理
- OpenSSL 兼容工具

### 数字计算工具
- 多进制转换计算器

### 二维码工具
- 二维码生成
- 二维码解析识别

### 网络工具
- HTTP 客户端
- Nginx 配置工具

### 时间工具
- 时间戳转换
- Cron 表达式编辑器

### 调试工具
- 正则表达式调试
- Grok 模式调试

### 其他工具
- 配置文件转换
- JWT 编解码

## 快速导航

### 快速开始
- [安装与启动](getting-started/installation.md) - 了解如何安装和启动应用
- [界面总览](getting-started/interface-guide.md) - 熟悉应用界面和基本操作
- [通用功能](getting-started/common-features.md) - 了解通用功能和使用技巧

### 按类别浏览
- [字符编码](encoding/) - 各种字符编码转换工具
- [JSON 工具](json/) - JSON 处理相关工具
- [加密解密](crypto/) - 数据加密和哈希工具
- [数字计算](calculator/) - 进制转换计算器
- [二维码](qrcode/) - 二维码生成和解析
- [HTTP Client](http/) - HTTP 请求测试工具
- [时间计算](time/) - 时间戳转换工具
- [Cron](cron/) - Cron 表达式编辑器
- [正则调试](regex/) - 正则表达式测试工具
- [Grok](grok/) - Grok 模式调试工具
- [Nginx](nginx/) - Nginx 配置工具
- [配置转换](config/) - 配置文件格式转换
- [编解码](codec/) - JWT 编解码工具

---

*本手册将持续更新，以反映 DevToolkit 的最新功能。如有疑问，请访问项目仓库或提交 Issue。*