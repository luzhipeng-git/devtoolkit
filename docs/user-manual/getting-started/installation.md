# 安装与启动

## 系统要求
- Windows 10+ / macOS 10.15+ / Linux (glibc 2.31+)
- 内存：至少 512MB 可用
- 磁盘：至少 200MB 可用空间

## 安装方式

### 桌面版安装
1. 下载对应平台的安装包
2. Windows: 运行 .exe 安装程序或解压便携版
3. macOS: 打开 .dmg 拖入 Applications
4. Linux: 解压 .tar.gz 运行可执行文件

### 开发模式启动（开发者）
1. 安装 Node.js 18+ 和 Rust 工具链
2. 克隆项目仓库
3. 安装前端依赖: `cd dev-tool-front && pnpm install`
4. 启动前端开发服务器: `pnpm dev` (端口 1420)
5. 启动 Rust 后端: `cd src-tauri && cargo run -p devtoolkit-server` (端口 3030)
6. 浏览器访问 http://localhost:1420