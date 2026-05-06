# 技术栈文档

> 最后更新: 2026-05-06

## 概述

Wallhaven 壁纸浏览器是一个基于 **Electron + Vue 3** 构建的跨平台桌面应用程序，用于浏览和下载 Wallhaven.cc 网站的壁纸。

---

## 核心技术栈

### 运行时与语言

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | >= 24 | JavaScript 运行时 |
| **TypeScript** | ~6.0.0 | 主要开发语言，类型安全 |
| **Electron** | 41.2.2 | 跨平台桌面应用框架 |

### 前端框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue** | 3.5.32 | 前端 UI 框架 |
| **Vue Router** | 5.0.4 | 路由管理 |
| **Pinia** | 3.0.4 | 状态管理 |

### 构建工具

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vite** | 7.3.2 | 前端构建工具 |
| **electron-vite** | 5.0.0 | Electron 专用 Vite 集成 |
| **esbuild** | (内置) | 生产环境代码压缩 |
| **electron-builder** | 26.8.1 | 应用打包与发布 |

---

## 项目结构

```
wallhaven/
├── electron/                    # Electron 主进程代码
│   ├── main/                    # 主进程入口与 IPC 处理器
│   │   ├── index.ts             # 应用入口，窗口创建
│   │   ├── database.ts          # SQLite 数据库管理
│   │   ├── migration.ts         # 数据迁移
│   │   └── ipc/handlers/        # IPC 通道处理器
│   └── preload/                 # 预加载脚本
│       ├── index.ts             # contextBridge API 暴露
│       └── types.ts             # IPC 类型定义
├── src/                         # 渲染进程 (Vue 应用)
│   ├── clients/                 # API 客户端层
│   ├── services/                # 业务服务层
│   ├── repositories/            # 数据仓库层
│   ├── composables/             # Vue Composables
│   ├── components/              # Vue 组件
│   ├── views/                   # 页面视图
│   ├── stores/                  # Pinia 状态存储
│   ├── types/                   # TypeScript 类型定义
│   ├── errors/                  # 错误处理
│   └── utils/                   # 工具函数
├── build/                       # 构建资源 (图标等)
├── dist/                        # 构建输出
├── out/                         # Electron 输出
└── public/                      # 静态资源
```

---

## 架构分层

### 渲染进程架构 (View → Composable → Service → Repository → Client)

```
┌─────────────────────────────────────────────────────────────┐
│  Views (页面)                                                │
│  ├── OnlineWallpaper.vue    # 在线壁纸浏览                    │
│  ├── LocalWallpaper.vue     # 本地壁纸管理                    │
│  ├── FavoritesPage.vue      # 收藏管理                       │
│  ├── DownloadWallpaper.vue  # 下载管理                       │
│  └── SettingPage.vue        # 设置页面                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Composables (组合式函数)                                    │
│  ├── useWallpaperList       # 壁纸列表逻辑                    │
│  ├── useWallpaperSelection  # 壁纸选择                       │
│  ├── useWallpaperDownload   # 下载逻辑                       │
│  ├── useFavorites           # 收藏功能                       │
│  ├── useCollections         # 收藏夹管理                      │
│  ├── useSettings            # 设置管理                       │
│  └── useDownload            # 下载队列                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Services (业务服务)                                         │
│  ├── wallpaper.service.ts   # 壁纸业务逻辑                    │
│  ├── download.service.ts    # 下载业务逻辑                    │
│  ├── favorites.service.ts   # 收藏业务逻辑                    │
│  ├── settings.service.ts    # 设置业务逻辑                    │
│  └── window.service.ts      # 窗口控制                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Repositories (数据仓库)                                     │
│  ├── wallpaper.repository.ts                                │
│  ├── download.repository.ts                                 │
│  ├── favorites.repository.ts                                │
│  └── settings.repository.ts                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Clients (客户端)                                            │
│  ├── api.client.ts          # Wallhaven API 客户端           │
│  ├── download.client.ts     # 下载客户端                     │
│  ├── file.client.ts         # 文件操作客户端                  │
│  ├── cache.client.ts        # 缓存客户端                     │
│  └── window.client.ts       # 窗口控制客户端                  │
└─────────────────────────────────────────────────────────────┘
```

### 主进程架构

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process (electron/main/)                              │
│  ├── index.ts               # 应用入口，窗口生命周期          │
│  └── ipc/handlers/          # IPC 通道处理器                 │
│      ├── api.handler.ts     # API 代理                      │
│      ├── download.handler.ts # 下载管理                     │
│      ├── wallpaper.handler.ts # 壁纸设置                    │
│      ├── file.handler.ts    # 文件操作                      │
│      ├── favorites.handler.ts # 收藏管理                    │
│      ├── store.handler.ts   # 设置存储                      │
│      ├── cache.handler.ts   # 缓存清理                      │
│      └── window.handler.ts  # 窗口控制                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心依赖

### 生产依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `axios` | ^1.15.0 | HTTP 客户端 |
| `sharp` | ^0.34.5 | 图像处理 (原生模块) |
| `wallpaper` | ^7.3.1 | 设置桌面壁纸 |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `@electron-toolkit/utils` | ^4.0.0 | Electron 开发工具 |
| `@vitejs/plugin-vue` | ^6.0.6 | Vite Vue 插件 |
| `@vitejs/plugin-vue-jsx` | ^5.1.5 | Vue JSX 支持 |
| `vite-plugin-vue-devtools` | ^8.1.1 | Vue DevTools |
| `eslint` | ^9.0.0 | 代码检查 |
| `eslint-plugin-vue` | ^9.0.0 | Vue ESLint 插件 |
| `typescript-eslint` | ^8.0.0 | TypeScript ESLint |
| `prettier` | 3.8.3 | 代码格式化 |
| `vitest` | ^4.1.4 | 单元测试 |
| `@vue/test-utils` | ^2.4.6 | Vue 测试工具 |
| `jsdom` | ^29.0.2 | DOM 模拟环境 |
| `vue-tsc` | ^3.2.6 | Vue TypeScript 检查 |

---

## 配置文件

### TypeScript 配置

| 文件 | 用途 |
|------|------|
| `tsconfig.json` | 主配置，引用其他配置文件 |
| `tsconfig.app.json` | 渲染进程 (Vue 应用) 配置 |
| `tsconfig.electron.json` | 主进程配置 |
| `tsconfig.node.json` | Node.js 脚本配置 |
| `tsconfig.vitest.json` | 测试配置 |

### 构建配置

| 文件 | 用途 |
|------|------|
| `electron.vite.config.ts` | electron-vite 主配置 |
| `vite.config.ts` | Vite 配置 (代理、插件) |
| `vitest.config.ts` | Vitest 测试配置 |
| `electron-builder.yml` | electron-builder 打包配置 |

### 代码质量

| 文件 | 用途 |
|------|------|
| `eslint.config.js` | ESLint 扁平配置 |
| `.prettierrc.json` | Prettier 格式化配置 |

---

## 平台支持

根据 `electron-builder.yml` 配置：

| 平台 | 构建目标 |
|------|----------|
| **Windows** | NSIS 安装程序 |
| **macOS** | DMG 磁盘镜像 |
| **Linux** | AppImage, Snap, DEB, Pacman |

---

## 关键特性

### 1. 双环境 API 请求
- **开发环境**: 通过 Vite 代理 (`/api` → `https://wallhaven.cc/api/v1`)
- **生产环境**: 通过 Electron IPC 代理绕过 CORS

### 2. SQLite 数据持久化
- 使用 Node.js 内置 `node:sqlite` 模块
- WAL 日志模式，支持并发读取
- 5 张数据表：settings, search_params, download_history, collections, favorites

### 3. 下载管理
- 支持断点续传 (HTTP Range)
- 并发队列控制
- 指数退避重试机制

### 4. 原生模块集成
- `sharp`: 图像处理
- `wallpaper`: 桌面壁纸设置
- 通过 ASAR 解包支持原生二进制文件

---

## NPM Scripts

```json
{
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "preview": "electron-vite preview",
  "test:unit": "vitest",
  "type-check": "vue-tsc --build",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write --experimental-cli src/",
  "build:win": "npm run build && electron-builder --win --config",
  "build:mac": "npm run build && electron-builder --mac --config",
  "build:linux": "npm run build && electron-builder --linux --config"
}
```

---

## 代码风格

- **ESLint**: 扁平配置，集成 TypeScript 和 Vue 规则
- **Prettier**: 自动格式化
- **架构约束**: Views 层禁止直接导入 stores，必须通过 composables 访问

```javascript
// eslint.config.js 中的架构规则
{
  files: ['src/views/**/*.{vue,ts}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/stores/*'],
        message: 'Views must import from @/composables, not @/stores.'
      }]
    }]
  }
}
```
