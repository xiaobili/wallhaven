# 架构文档

> 最后更新: 2026-05-06

## 概述

Wallhaven 壁纸浏览器采用 **Electron + Vue 3** 架构，遵循分层设计原则，实现了清晰的关注点分离。

---

## 架构模式

### 整体架构: 主进程 + 渲染进程

```
┌─────────────────────────────────────────────────────────────────┐
│                         Electron 应用                            │
├─────────────────────────────────────────────────────────────────┤
│  主进程 (Node.js 环境)                                           │
│  ├── 应用生命周期管理                                             │
│  ├── 窗口创建与管理                                               │
│  ├── IPC 通信处理                                                 │
│  ├── SQLite 数据库操作                                            │
│  └── 原生 API 调用 (wallpaper, sharp)                             │
├─────────────────────────────────────────────────────────────────┤
│  渲染进程 (浏览器环境)                                            │
│  ├── Vue 3 应用                                                   │
│  ├── 状态管理 (Pinia)                                             │
│  ├── UI 组件                                                      │
│  └── 通过 preload 脚本与主进程通信                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 分层架构

### 渲染进程分层 (严格单向依赖)

```
Views (视图层)
  ↓ 只能调用
Composables (组合函数层)
  ↓ 可以调用
Services (服务层)
  ↓ 可以调用
Repositories (数据仓库层)
  ↓ 可以调用
Clients (客户端层)
```

**架构约束** (由 ESLint 强制执行):
- Views 层禁止直接导入 stores
- 必须通过 composables 访问状态

```javascript
// eslint.config.js 中的规则
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

---

## 各层职责

### 1. Views 层 (`src/views/`)

**职责**: 页面级 UI 组件，处理用户交互

| 文件 | 描述 |
|------|------|
| `OnlineWallpaper.vue` | 在线壁纸浏览页面 |
| `LocalWallpaper.vue` | 本地壁纸管理页面 |
| `FavoritesPage.vue` | 收藏管理页面 |
| `DownloadWallpaper.vue` | 下载管理页面 |
| `SettingPage.vue` | 设置页面 |

**约束**: 不直接导入 stores，通过 composables 访问

---

### 2. Composables 层 (`src/composables/`)

**职责**: 封装可复用的组合式逻辑，协调 services 和 stores

| 文件 | 功能 |
|------|------|
| `useWallpaperList.ts` | 壁纸列表状态和逻辑 |
| `useWallpaperSelection.ts` | 壁纸选择状态管理 |
| `useWallpaperDownload.ts` | 下载操作封装 |
| `useWallpaperSetter.ts` | 设置壁纸功能 |
| `useDownload.ts` | 下载队列管理 |
| `useFavorites.ts` | 收藏状态和操作 |
| `useCollections.ts` | 收藏夹管理 |
| `useSettings.ts` | 应用设置管理 |
| `useLocalFiles.ts` | 本地文件操作 |
| `useAlert.ts` | 警告/提示消息 |

---

### 3. Services 层 (`src/services/`)

**职责**: 业务逻辑处理，缓存管理，错误转换

| 文件 | 功能 | 缓存策略 |
|------|------|----------|
| `wallpaper.service.ts` | 壁纸搜索和详情 | Map 缓存, TTL 5分钟 |
| `favorites.service.ts` | 收藏操作 | 内存缓存 |
| `collections.service.ts` | 收藏夹管理 | 内存缓存 |
| `download.service.ts` | 下载业务逻辑 | 进度回调管理 |
| `settings.service.ts` | 设置读写 | 无缓存 |
| `window.service.ts` | 窗口控制 | 无缓存 |

---

### 4. Repositories 层 (`src/repositories/`)

**职责**: 数据访问抽象，持久化操作

| 文件 | 数据源 |
|------|--------|
| `wallpaper.repository.ts` | API 客户端封装 |
| `favorites.repository.ts` | SQLite + IPC |
| `download.repository.ts` | IPC 通信 |
| `settings.repository.ts` | SQLite + IPC |
| `window.repository.ts` | IPC 通信 |

---

### 5. Clients 层 (`src/clients/`)

**职责**: 外部系统通信，IPC 调用

| 文件 | 通信目标 |
|------|----------|
| `api.client.ts` | Wallhaven API (开发环境) |
| `wallpaper.client.ts` | 主进程 IPC |
| `download.client.ts` | 主进程 IPC |
| `favorites.client.ts` | 主进程 IPC |
| `file.client.ts` | 主进程 IPC |
| `cache.client.ts` | 主进程 IPC |
| `window.client.ts` | 主进程 IPC |
| `store.client.ts` | 主进程 IPC |

---

## 主进程架构

### 入口与生命周期

```
electron/main/index.ts
├── app.whenReady()
│   ├── registerLocalFileProtocol()  // 注册 wallhaven:// 协议
│   ├── createSplashWindow()         // 启动画面
│   ├── createWindow()               // 主窗口
│   └── registerAllHandlers()        // 注册所有 IPC handlers
├── app.on('before-quit')
│   └── closeDatabase()              // 关闭数据库连接
└── app.on('window-all-closed')
    └── app.quit()                   // 退出应用
```

### IPC Handlers 组织

```
electron/main/ipc/handlers/
├── index.ts              // 统一注册所有 handlers
├── api.handler.ts        // API 代理
├── download.handler.ts   // 下载管理
├── download-queue.ts     // 下载队列类
├── file.handler.ts       // 文件操作
├── wallpaper.handler.ts  // 壁纸设置
├── window.handler.ts     // 窗口控制
├── favorites.handler.ts  // 收藏管理
├── store.handler.ts      // 设置存储
├── cache.handler.ts      // 缓存清理
└── base.ts               // 共享工具函数
```

---

## 数据流

### 壁纸搜索数据流

```
OnlineWallpaper.vue
  └── useWallpaperList()
       └── wallpaperService.search()
            ├── 检查缓存 → 命中返回
            └── apiClient.get('/search')
                 ├── 开发环境: Vite Proxy → Wallhaven API
                 └── 生产环境: IPC → api.handler → axios → Wallhaven API
```

### 下载流程

```
useWallpaperDownload.startDownload()
  └── downloadClient.startDownload()
       └── IPC: 'start-download-task'
            └── download.handler.ts
                 ├── 创建下载队列
                 ├── HTTP Range 请求
                 ├── 断点续传支持
                 └── IPC: 'download-progress' 事件推送
```

### 收藏操作数据流

```
useFavorites.toggleFavorite()
  └── favoritesService.add()/remove()
       └── favoritesRepository
            └── IPC → favorites.handler.ts
                 └── SQLite 操作
```

---

## IPC 通信模式

### 请求-响应模式

```typescript
// 渲染进程
const result = await window.electronAPI.favoritesGetCollections()
if (result.success) {
  // 处理 result.data
} else {
  // 处理 result.error
}

// 主进程 handler
ipcMain.handle('favorites-get-collections', async () => {
  try {
    const data = await getCollections()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: { code: 'XXX', message: '...' } }
  }
})
```

### 事件推送模式

```typescript
// 主进程推送
mainWindow.webContents.send('download-progress', progressData)

// 渲染进程监听
window.electronAPI.onDownloadProgress((data) => {
  // 更新 UI
})
```

---

## 状态管理

### Pinia Store 结构

```
src/stores/
├── modules/
│   ├── wallpaper/
│   │   └── index.ts     // 壁纸状态
│   ├── favorites/
│   │   └── index.ts     // 收藏状态
│   └── download/
│       └── index.ts     // 下载状态
```

### Store 职责

| Store | 状态 | 用途 |
|-------|------|------|
| `useWallpaperStore` | searchParams, currentPage | 搜索参数持久化 |
| `useFavoritesStore` | collections, items, selectedCollectionId | 收藏 UI 状态 |
| `useDownloadStore` | tasks, progresses | 下载任务状态 |

---

## 数据持久化

### SQLite 数据库

```
electron/main/database.ts
├── 数据库文件: {userData}/wallhaven-data.db
├── 日志模式: WAL
├── 外键约束: 启用
└── 表:
    ├── settings        // 应用设置
    ├── search_params   // 搜索参数
    ├── download_history // 下载历史
    ├── collections     // 收藏夹
    └── favorites       // 收藏项
```

### 数据迁移

```
electron/main/migration.ts
└── runMigration()
     ├── 检查版本
     ├── 创建新表
     ├── 数据迁移
     └── 清理旧数据
```

---

## 关键执行流程

### 应用启动流程

```
1. main/index.ts: app.whenReady()
2. 注册 wallhaven:// 协议处理
3. 设置 App User Model ID
4. 创建启动画面窗口
5. 创建主窗口
6. 注册所有 IPC handlers
7. 运行数据库迁移
8. 关闭启动画面
```

### 下载执行流程

```
1. 渲染进程: useDownload.startDownload()
2. IPC: start-download-task
3. 主进程: download.handler
   ├── 创建 ActiveDownload 对象
   ├── 加入 DownloadQueue
   ├── 执行下载 (支持 Range)
   └── 定期发送 download-progress 事件
4. 渲染进程: 更新下载状态
```

---

## 模块划分 (GitNexus Clusters)

根据 GitNexus 分析，代码库分为以下功能模块：

| 模块 | 符号数 | 描述 |
|------|--------|------|
| Clients | 95 | API 和 IPC 客户端 |
| Services | 79 | 业务服务层 |
| Handlers | 38 | IPC 处理器 |
| Favorites | 27 | 收藏功能 |
| Wallpaper | 27 | 壁纸功能 |
| Repositories | 13 | 数据仓库 |
| Errors | 8 | 错误处理 |
| Download | 7 | 下载功能 |
| Main | 6 | 主进程入口 |
| Show | 5 | 展示功能 |
| Scripts | 5 | 脚本 |

---

## 设计决策

### 为什么采用严格的分层架构？

1. **可测试性**: 各层可独立测试
2. **关注点分离**: UI 与业务逻辑解耦
3. **维护性**: 修改影响范围可控
4. **可扩展性**: 新功能遵循既定模式

### 为什么使用 IPC 代理 API？

1. **绕过 CORS**: 生产环境无代理服务器
2. **统一入口**: 所有网络请求经主进程
3. **安全性**: API Key 不暴露到渲染进程

### 为什么选择 SQLite？

1. **轻量级**: 无需额外服务
2. **本地持久化**: 用户数据存储在本地
3. **WAL 模式**: 支持并发读取
4. **Node.js 内置**: 无额外依赖 (Electron 33+)
