# 目录结构文档

> 最后更新: 2026-05-06

## 概述

本文档描述 Wallhaven 壁纸浏览器的目录结构和文件组织方式。

---

## 根目录结构

```
wallhaven/
├── .claude/              # Claude Code 配置
│   ├── settings.local.json
│   └── skills/           # 项目技能定义
│       ├── generated/    # GitNexus 自动生成的领域技能
│       └── gitnexus/     # GitNexus 相关技能
├── .github/              # GitHub 配置
├── .gitnexus/            # GitNexus 图数据库索引
├── .planning/            # GSD 工作流规划目录
│   └── codebase/         # 代码库映射文档
├── archlinux/            # Arch Linux 打包文件
├── build/                # 构建资源 (图标等)
├── dist/                 # Vite 构建输出
├── docs/                 # 项目文档
├── electron/             # Electron 主进程代码
├── node_modules/         # 依赖包
├── out/                  # Electron 构建输出
├── public/               # 静态资源
├── scripts/              # 构建脚本
├── src/                  # 渲染进程代码 (Vue 应用)
├── CLAUDE.md             # Claude 指导文件
├── AGENTS.md             # 其他 AI 指导文件
├── README.md             # 项目说明
├── LICENSE               # 许可证
├── package.json          # 项目配置
├── package-lock.json     # 依赖锁定
├── index.html            # 入口 HTML
├── splash.html           # 启动画面 HTML
├── electron.vite.config.ts # Electron Vite 配置
├── vite.config.ts        # Vite 配置
├── vitest.config.ts      # 测试配置
├── tsconfig.json         # TypeScript 主配置
├── tsconfig.app.json     # 应用 TypeScript 配置
├── tsconfig.electron.json # Electron TypeScript 配置
├── tsconfig.node.json    # Node.js TypeScript 配置
├── tsconfig.vitest.json  # 测试 TypeScript 配置
├── eslint.config.js      # ESLint 配置
├── .prettierrc.json      # Prettier 配置
├── electron-builder.yml  # Electron Builder 配置
├── env.d.ts              # 环境类型声明
└── .gitignore            # Git 忽略规则
```

---

## 源码目录结构

### 渲染进程 (`src/`)

```
src/
├── main.ts                    # Vue 应用入口
├── App.vue                    # 根组件
├── router/                    # Vue Router 路由配置
│   └── index.ts
├── views/                     # 页面视图 (Views 层)
│   ├── OnlineWallpaper.vue    # 在线壁纸浏览
│   ├── LocalWallpaper.vue     # 本地壁纸管理
│   ├── FavoritesPage.vue      # 收藏页面
│   ├── DownloadWallpaper.vue  # 下载管理
│   └── SettingPage.vue        # 设置页面
├── components/                # 可复用组件
│   ├── ImagePreview.vue       # 图片预览弹窗
│   ├── WallpaperCard.vue      # 壁纸卡片
│   ├── DownloadProgress.vue   # 下载进度
│   └── ...                    # 其他组件
├── composables/               # 组合式函数 (Composables 层)
│   ├── index.ts               # 统一导出
│   ├── core/                  # 核心功能
│   │   └── useAlert.ts        # 警告消息
│   ├── animation/             # 动画
│   │   └── useImageTransition.ts
│   ├── download/              # 下载相关
│   │   └── useDownload.ts     # 下载队列管理
│   ├── favorites/             # 收藏相关
│   │   ├── useFavorites.ts    # 收藏状态和操作
│   │   ├── useCollections.ts  # 收藏夹管理
│   │   └── useFavoriteDropdown.ts
│   ├── local/                 # 本地文件
│   │   └── useLocalFiles.ts
│   ├── settings/              # 设置
│   │   └── useSettings.ts
│   └── wallpaper/             # 壁纸相关
│       ├── useWallpaperList.ts      # 壁纸列表
│       ├── useWallpaperSelection.ts # 选择状态
│       ├── useWallpaperDownload.ts  # 下载操作
│       └── useWallpaperSetter.ts    # 设置壁纸
├── services/                  # 业务服务 (Services 层)
│   ├── index.ts               # 统一导出
│   ├── wallpaper.service.ts   # 壁纸业务逻辑
│   ├── wallpaperApi.ts        # API 封装
│   ├── favorites.service.ts   # 收藏业务逻辑
│   ├── collections.service.ts # 收藏夹业务逻辑
│   ├── download.service.ts    # 下载业务逻辑
│   ├── settings.service.ts    # 设置业务逻辑
│   └── window.service.ts      # 窗口控制
├── repositories/              # 数据仓库 (Repositories 层)
│   ├── index.ts               # 统一导出
│   ├── wallpaper.repository.ts
│   ├── favorites.repository.ts
│   ├── download.repository.ts
│   ├── settings.repository.ts
│   └── window.repository.ts
├── clients/                   # 客户端层 (Clients 层)
│   ├── index.ts               # 统一导出
│   ├── base.client.ts         # 基础客户端
│   ├── api.client.ts          # API 客户端
│   ├── wallpaper.client.ts    # 壁纸 IPC 客户端
│   ├── download.client.ts     # 下载 IPC 客户端
│   ├── favorites.client.ts    # 收藏 IPC 客户端
│   ├── file.client.ts         # 文件 IPC 客户端
│   ├── cache.client.ts        # 缓存 IPC 客户端
│   ├── window.client.ts       # 窗口 IPC 客户端
│   ├── store.client.ts        # 存储 IPC 客户端
│   └── constants.ts           # 客户端常量
├── stores/                    # Pinia 状态存储
│   └── modules/
│       ├── wallpaper/
│       │   └── index.ts       # 壁纸状态
│       ├── favorites/
│       │   └── index.ts       # 收藏状态
│       └── download/
│           └── index.ts       # 下载状态
├── types/                     # TypeScript 类型定义
│   ├── index.ts               # 统一导出
│   ├── ipc.ts                 # IPC 通道和类型
│   └── domain/                # 领域类型
│       ├── index.ts
│       ├── api.ts             # API 响应类型
│       ├── wallpaper.ts       # 壁纸类型
│       ├── download.ts        # 下载类型
│       ├── favorite.ts        # 收藏类型
│       ├── settings.ts        # 设置类型
│       ├── ui.ts              # UI 类型
│       └── components.ts      # 组件类型
├── errors/                    # 错误处理
│   ├── index.ts               # 统一导出
│   ├── AppError.ts            # 基础错误类
│   ├── NetworkError.ts        # 网络错误
│   ├── IpcError.ts            # IPC 错误
│   ├── StoreError.ts          # 存储错误
│   └── types.ts               # 错误类型定义
├── utils/                     # 工具函数
│   ├── helpers.ts             # 通用帮助函数
│   └── heart.ts               # 心形动画
└── __tests__/                 # 单元测试
    └── App.spec.ts            # App 组件测试
```

---

### 主进程 (`electron/`)

```
electron/
├── main/                      # 主进程代码
│   ├── index.ts               # 应用入口
│   ├── database.ts            # SQLite 数据库管理
│   ├── migration.ts           # 数据迁移
│   ├── sqlite.d.ts            # SQLite 类型声明
│   └── ipc/
│       └── handlers/          # IPC 处理器
│           ├── index.ts       # 统一注册所有 handlers
│           ├── api.handler.ts # API 代理
│           ├── download.handler.ts # 下载管理
│           ├── download-queue.ts   # 下载队列类
│           ├── file.handler.ts     # 文件操作
│           ├── wallpaper.handler.ts # 壁纸设置
│           ├── window.handler.ts   # 窗口控制
│           ├── favorites.handler.ts # 收藏管理
│           ├── store.handler.ts    # 设置存储
│           ├── cache.handler.ts    # 缓存清理
│           └── base.ts             # 共享工具
└── preload/                   # 预加载脚本
    ├── index.ts               # contextBridge API 暴露
    └── types.ts               # IPC 类型定义
```

---

## 配置文件说明

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
| `vite.config.ts` | Vite 插件和代理配置 |
| `vitest.config.ts` | Vitest 测试配置 |
| `electron-builder.yml` | 打包配置 |

### 代码质量

| 文件 | 用途 |
|------|------|
| `eslint.config.js` | ESLint 扁平配置 |
| `.prettierrc.json` | Prettier 格式化配置 |

---

## 命名约定

### 文件命名

| 类型 | 命名风格 | 示例 |
|------|----------|------|
| Vue 组件 | PascalCase | `WallpaperCard.vue` |
| TypeScript 模块 | camelCase | `wallpaper.service.ts` |
| 类型定义 | camelCase | `wallpaper.ts` |
| 测试文件 | 原文件名 + `.spec.ts` | `App.spec.ts` |
| IPC Handler | kebab-case | `download.handler.ts` |

### 目录命名

| 类型 | 命名风格 | 示例 |
|------|----------|------|
| 功能模块 | kebab-case | `download/`, `favorites/` |
| 层级目录 | 复数名词 | `views/`, `components/`, `services/` |

---

## 导入路径别名

```typescript
// tsconfig.json 中的路径映射
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**使用示例**:
```typescript
import { useWallpaperList } from '@/composables'
import { wallpaperService } from '@/services'
import type { WallpaperItem } from '@/types'
```

---

## 关键文件位置速查

### 入口文件

| 环境 | 文件 |
|------|------|
| 应用入口 | `electron/main/index.ts` |
| Vue 入口 | `src/main.ts` |
| HTML 入口 | `index.html` |

### 核心逻辑

| 功能 | 文件 |
|------|------|
| 窗口管理 | `electron/main/index.ts` |
| 数据库 | `electron/main/database.ts` |
| IPC 通信 | `electron/preload/index.ts` |
| API 代理 | `electron/main/ipc/handlers/api.handler.ts` |
| 下载管理 | `electron/main/ipc/handlers/download.handler.ts` |

### 类型定义

| 类型 | 文件 |
|------|------|
| IPC 类型 | `src/types/ipc.ts` |
| 领域类型 | `src/types/domain/*.ts` |
| 错误类型 | `src/errors/types.ts` |

---

## 构建输出

```
dist/                   # Vite 构建输出
├── main/               # 主进程代码
├── preload/            # 预加载脚本
└── renderer/           # 渲染进程代码

out/                    # Electron Builder 输出
└── {platform}/         # 平台特定安装包
```

---

## 特殊目录

### `.claude/skills/`

自动生成的 GitNexus 领域技能，用于代码库导航：

```
.claude/skills/
├── generated/          # 按模块生成的技能
│   ├── clients/SKILL.md
│   ├── services/SKILL.md
│   ├── handlers/SKILL.md
│   └── ...
└── gitnexus/           # GitNexus 工具技能
    ├── gitnexus-exploring/SKILL.md
    ├── gitnexus-debugging/SKILL.md
    └── ...
```

### `.planning/`

GSD 工作流规划目录：

```
.planning/
├── STATE.md            # 项目状态
├── ROADMAP.md          # 开发路线图
├── codebase/           # 代码库映射文档
├── milestones/         # 里程碑记录
└── phases/             # 阶段规划
```

---

## 文件数量统计

| 目录 | TypeScript 文件数 | 说明 |
|------|-------------------|------|
| `src/` | ~60 | 渲染进程代码 |
| `electron/` | ~17 | 主进程代码 |
| `src/views/` | ~5 | 页面组件 |
| `src/composables/` | ~12 | 组合函数 |
| `src/services/` | ~7 | 业务服务 |
| `src/clients/` | ~10 | 客户端 |
| `src/types/` | ~10 | 类型定义 |
