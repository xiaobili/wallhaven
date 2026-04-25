# Electron + Vue 3 应用推荐架构

## 概述

本文档定义了 Wallhaven 壁纸浏览器的目标架构，针对现有代码的问题（IPC 单文件过大、Alert 状态重复、类型安全缺失等）提供渐进式重构方案。

---

## 1. 主进程与渲染进程通信架构

### 1.1 分层 IPC 架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           渲染进程 (Renderer)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Components    │───►│    Services     │───►│   Repositories  │         │
│  │   (Vue SFC)     │    │  (Business)     │    │   (Data Access) │         │
│  └─────────────────┘    └─────────────────┘    └────────┬────────┘         │
│                                                          │                   │
│                                                          ▼                   │
│                                              ┌─────────────────────┐         │
│                                              │  ElectronClient     │         │
│                                              │  (IPC Abstraction)  │         │
│                                              └──────────┬──────────┘         │
└─────────────────────────────────────────────────────────┼────────────────────┘
                                                          │
                                   Preload Script Bridge  │
┌─────────────────────────────────────────────────────────┼────────────────────┐
│                                                      │   │                    │
│  ┌─────────────────────┐        ┌─────────────────────┐│                    │
│  │   IPC Dispatcher    │◄───────│   Preload Script    │◄┘                    │
│  │   (Route & Validate)│        │   (contextBridge)   │                      │
│  └──────────┬──────────┘        └─────────────────────┘                      │
│             │                                                                  │
├─────────────┼─────────────────────────────────────────────────────────────────┤
│             │                      主进程 (Main)                               │
│             ▼                                                                  │
│  ┌─────────────────────┐                                                      │
│  │   Handler Registry  │                                                      │
│  └──────────┬──────────┘                                                      │
│             │                                                                  │
│  ┌──────────┴──────────┬──────────────────┬──────────────────┐               │
│  │                     │                  │                  │               │
│  ▼                     ▼                  ▼                  ▼               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │FileHandler  │ │DownloadHdlr │ │SettingsHdlr │ │WallpaperHdlr│             │
│ │(文件操作)    │ │(下载管理)    │ │(设置存储)    │ │(壁纸设置)    │             │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘             │
│       │               │               │               │                      │
│       └───────────────┴───────────────┴───────────────┘                      │
│                               │                                              │
│                               ▼                                              │
│                    ┌─────────────────────┐                                   │
│                    │   Native Services   │                                   │
│                    │ (Node.js / OS APIs) │                                   │
│                    └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 IPC 处理器模块化拆分

**目标结构：**

```
electron/main/ipc/
├── index.ts                 # 处理器注册入口
├── base.ts                  # 基础类型和工具函数
├── handlers/
│   ├── file.handler.ts      # 文件系统操作
│   ├── download.handler.ts  # 下载管理
│   ├── settings.handler.ts  # 设置持久化
│   ├── wallpaper.handler.ts # 壁纸设置
│   ├── window.handler.ts    # 窗口控制
│   ├── cache.handler.ts     # 缓存管理
│   └── api.handler.ts       # API 代理
└── types.ts                 # IPC 消息类型定义
```

**处理器基类模式：**

```typescript
// electron/main/ipc/base.ts
interface IpcHandlerContext {
  store: ElectronStore;
  mainWindow: BrowserWindow | null;
}

interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

abstract class BaseHandler {
  constructor(protected context: IpcHandlerContext) {}
  
  protected createResponse<T>(data: T): IpcResponse<T> {
    return { success: true, data };
  }
  
  protected createError(code: string, message: string): IpcResponse {
    return { success: false, error: { code, message } };
  }
}

// electron/main/ipc/handlers/file.handler.ts
export class FileHandler extends BaseHandler {
  readonly channel = 'file';
  
  register(): void {
    ipcMain.handle(`${this.channel}:select-folder`, this.selectFolder.bind(this));
    ipcMain.handle(`${this.channel}:read-directory`, this.readDirectory.bind(this));
    ipcMain.handle(`${this.channel}:delete`, this.deleteFile.bind(this));
  }
  
  private async selectFolder(): Promise<IpcResponse<string | null>> {
    // 实现细节...
  }
}
```

### 1.3 IPC 通道命名规范

采用领域:操作的命名模式，提供清晰的语义：

| 旧通道名 | 新通道名 | 说明 |
|---------|---------|------|
| `select-folder` | `file:select-folder` | 文件系统领域 |
| `read-directory` | `file:read-directory` | 文件系统领域 |
| `delete-file` | `file:delete` | 文件系统领域 |
| `start-download-task` | `download:start` | 下载领域 |
| `save-settings` | `settings:save` | 设置领域 |
| `load-settings` | `settings:load` | 设置领域 |
| `set-wallpaper` | `wallpaper:set` | 壁纸领域 |
| `store-get` | `store:get` | 存储领域 |

**渐进迁移策略：** 新旧通道并行支持，逐步废弃旧通道。

---

## 2. 前端代码分层架构

### 2.1 四层架构模型

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              表现层 (Presentation)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Components (Vue SFC)                                                │   │
│  │  - 纯 UI 渲染和用户交互                                               │   │
│  │  - 调用 Composables 获取数据和方法                                    │   │
│  │  - 不直接访问 Store 或 Electron API                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              组合层 (Composition)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Composables (Vue Composition Functions)                             │   │
│  │  - 封装可复用的状态逻辑                                               │   │
│  │  - 协调 Service 调用                                                  │   │
│  │  - 管理组件级状态 (Alert、Loading 等)                                  │   │
│  │                                                                       │   │
│  │  例: useAlert(), useWallpaperList(), useDownload()                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              业务层 (Business)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Services (业务服务)                                                  │   │
│  │  - 实现业务逻辑和规则                                                  │   │
│  │  - 协调多个 Repository                                                │   │
│  │  - 处理数据转换和验证                                                  │   │
│  │                                                                       │   │
│  │  例: WallpaperService, DownloadService, SettingsService              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              数据层 (Data)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Repositories (数据访问)                                              │   │
│  │  - 抽象数据源访问                                                      │   │
│  │  - 统一数据访问接口                                                    │   │
│  │  - 缓存策略                                                           │   │
│  │                                                                       │   │
│  │  例: WallpaperRepository (API), SettingsRepository (Store)           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Clients (底层客户端)                                                 │   │
│  │  - ElectronClient (IPC 封装)                                         │   │
│  │  - ApiClient (HTTP 请求)                                             │   │
│  │  - StoreClient (持久化存储)                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 各层职责与依赖规则

| 层级 | 职责 | 允许依赖 | 禁止依赖 |
|-----|------|---------|---------|
| **表现层** | UI 渲染、用户交互、表单验证 | Composables, Types | Services, Repositories, Store |
| **组合层** | 状态管理、逻辑组合、事件协调 | Services, Store, Types | Repositories, Electron API |
| **业务层** | 业务规则、数据转换、跨域协调 | Repositories, Types | Store, Components |
| **数据层** | 数据访问、缓存、持久化 | Clients, Types | Services, Components |

### 2.3 目录结构重组

```
src/
├── components/                 # 表现层：可复用 UI 组件
│   ├── common/                 # 通用组件
│   │   ├── Alert.vue
│   │   ├── LoadingOverlay.vue
│   │   └── ImagePreview.vue
│   ├── layout/                 # 布局组件
│   │   ├── PageHeader.vue
│   │   └── Sidebar.vue
│   └── wallpaper/              # 业务组件
│       ├── SearchBar.vue
│       └── WallpaperList.vue
│
├── composables/                # 组合层：可复用逻辑
│   ├── useAlert.ts             # Alert 状态管理
│   ├── useWallpaperList.ts     # 壁纸列表逻辑
│   ├── useDownload.ts          # 下载管理逻辑
│   ├── useImagePreview.ts      # 图片预览逻辑
│   └── useLocalStorage.ts      # 本地存储抽象
│
├── services/                   # 业务层：业务逻辑
│   ├── wallpaper.service.ts    # 壁纸业务逻辑
│   ├── download.service.ts     # 下载业务逻辑
│   ├── settings.service.ts     # 设置业务逻辑
│   └── index.ts                # 服务注册
│
├── repositories/               # 数据层：数据访问
│   ├── wallpaper.repository.ts # 壁纸数据访问 (API)
│   ├── settings.repository.ts  # 设置数据访问 (Store)
│   ├── download.repository.ts  # 下载数据访问 (Store)
│   └── index.ts                # 仓库注册
│
├── clients/                    # 数据层：底层客户端
│   ├── electron.client.ts      # Electron IPC 封装
│   ├── api.client.ts           # HTTP API 客户端
│   └── store.client.ts         # 持久化存储客户端
│
├── stores/                     # Pinia Store (精简版)
│   ├── modules/
│   │   ├── wallpaper/
│   │   └── download/
│   └── index.ts
│
├── types/                      # 类型定义
│   ├── api.types.ts            # API 相关类型
│   ├── electron.types.ts       # Electron IPC 类型
│   ├── store.types.ts          # Store 状态类型
│   └── index.ts
│
└── utils/                      # 工具函数
    ├── helpers.ts
    ├── validators.ts
    └── constants.ts
```

---

## 3. 模块化和依赖注入模式

### 3.1 依赖注入容器

使用 Vue 3 的 `inject/provide` 实现轻量级依赖注入：

```typescript
// src/di/container.ts
import type { App } from 'vue'

interface ServiceContainer {
  wallpaperService: WallpaperService
  downloadService: DownloadService
  settingsService: SettingsService
}

const ServiceKey = Symbol('services')

export function provideServices(app: App): void {
  const clients = {
    electronClient: new ElectronClient(),
    apiClient: new ApiClient(),
    storeClient: new StoreClient(),
  }
  
  const repositories = {
    wallpaperRepository: new WallpaperRepository(clients.apiClient),
    settingsRepository: new SettingsRepository(clients.storeClient),
    downloadRepository: new DownloadRepository(clients.storeClient),
  }
  
  const services: ServiceContainer = {
    wallpaperService: new WallpaperService(repositories.wallpaperRepository),
    downloadService: new DownloadService(repositories.downloadRepository),
    settingsService: new SettingsService(repositories.settingsRepository),
  }
  
  app.provide(ServiceKey, services)
}

export function useServices(): ServiceContainer {
  const services = inject<ServiceContainer>(ServiceKey)
  if (!services) {
    throw new Error('Services not provided. Did you forget to call provideServices?')
  }
  return services
}
```

### 3.2 Composable 模式

**Alert Composable 示例（解决重复状态问题）：**

```typescript
// src/composables/useAlert.ts
import { ref, readonly, type Ref } from 'vue'

interface AlertState {
  visible: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const globalState = ref<AlertState>({
  visible: false,
  type: 'info',
  message: '',
})

let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useAlert() {
  const show = (type: AlertState['type'], message: string, duration = 3000) => {
    if (hideTimer) clearTimeout(hideTimer)
    
    globalState.value = { visible: true, type, message }
    
    if (duration > 0) {
      hideTimer = setTimeout(hide, duration)
    }
  }
  
  const hide = () => {
    globalState.value.visible = false
    hideTimer = null
  }
  
  return {
    alertState: readonly(globalState),
    showSuccess: (msg: string) => show('success', msg),
    showError: (msg: string) => show('error', msg),
    showWarning: (msg: string) => show('warning', msg),
    showInfo: (msg: string) => show('info', msg),
    hide,
  }
}
```

### 3.3 Repository 模式

抽象数据访问，解耦 Store 和 Electron API：

```typescript
// src/repositories/settings.repository.ts
import type { AppSettings } from '@/types'

export interface ISettingsRepository {
  load(): Promise<AppSettings>
  save(settings: Partial<AppSettings>): Promise<void>
  reset(): Promise<void>
}

export class SettingsRepository implements ISettingsRepository {
  constructor(private storeClient: StoreClient) {}
  
  async load(): Promise<AppSettings> {
    const settings = await this.storeClient.get<AppSettings>('appSettings')
    return settings ?? this.getDefaultSettings()
  }
  
  async save(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.load()
    await this.storeClient.set('appSettings', { ...current, ...settings })
  }
  
  private getDefaultSettings(): AppSettings {
    return {
      downloadPath: '',
      maxConcurrentDownloads: 3,
      apiKey: '',
      wallpaperFit: 'fill',
    }
  }
}
```

### 3.4 Service 模式

业务逻辑封装，协调多个数据源：

```typescript
// src/services/download.service.ts
import type { DownloadItem, DownloadProgress } from '@/types'

export class DownloadService {
  constructor(
    private repository: DownloadRepository,
    private electronClient: ElectronClient
  ) {}
  
  async startDownload(item: DownloadItem): Promise<void> {
    // 业务逻辑：检查路径、验证 URL、准备下载
    const settings = await this.repository.getDownloadSettings()
    
    if (!settings.downloadPath) {
      throw new DownloadError('DOWNLOAD_PATH_NOT_SET', '请先设置下载路径')
    }
    
    // 调用 Electron 进行实际下载
    await this.electronClient.download.start({
      id: item.id,
      url: item.url,
      filename: item.filename,
      savePath: settings.downloadPath,
    })
  }
  
  async handleProgress(progress: DownloadProgress): Promise<void> {
    // 更新 Repository 中的下载状态
    await this.repository.updateProgress(progress)
    
    // 业务逻辑：完成后的处理
    if (progress.percent === 100) {
      await this.handleDownloadComplete(progress.id)
    }
  }
  
  private async handleDownloadComplete(id: string): Promise<void> {
    // 下载完成后的业务处理
  }
}
```

---

## 4. 错误处理架构

### 4.1 错误分类与层次

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              错误处理层次                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  UI 错误边界     │  ← Vue ErrorBoundary 组件                              │
│  │  (组件级隔离)    │    捕获渲染错误，显示降级 UI                             │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│  ┌────────┴────────┐                                                        │
│  │  Composable 层   │  ← useErrorHandler()                                   │
│  │  (逻辑错误处理)   │    统一错误捕获，转换用户友好消息                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│  ┌────────┴────────┐                                                        │
│  │  Service 层      │  ← DomainError 子类                                    │
│  │  (业务异常)      │    抛出领域特定错误，包含错误码                          │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│  ┌────────┴────────┐                                                        │
│  │  Repository 层   │  ← 原始错误包装                                        │
│  │  (数据访问错误)   │    包装底层错误 (IPC、HTTP、存储)                       │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 错误类型定义

```typescript
// src/types/errors.ts

// 基础错误类
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// 领域错误
export class DomainError extends AppError {
  constructor(code: string, message: string, cause?: Error) {
    super(code, message, cause)
    this.name = 'DomainError'
  }
}

// 下载相关错误
export class DownloadError extends DomainError {
  static readonly DOWNLOAD_PATH_NOT_SET = 'DOWNLOAD_PATH_NOT_SET'
  static readonly NETWORK_ERROR = 'NETWORK_ERROR'
  static readonly FILE_EXISTS = 'FILE_EXISTS'
  static readonly PERMISSION_DENIED = 'PERMISSION_DENIED'
}

// 文件操作错误
export class FileError extends DomainError {
  static readonly NOT_FOUND = 'NOT_FOUND'
  static readonly PERMISSION_DENIED = 'PERMISSION_DENIED'
  static readonly INVALID_PATH = 'INVALID_PATH'
}

// 设置错误
export class SettingsError extends DomainError {
  static readonly INVALID_API_KEY = 'INVALID_API_KEY'
  static readonly SAVE_FAILED = 'SAVE_FAILED'
}

// IPC 通信错误
export class IpcError extends AppError {
  static readonly CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND'
  static readonly INVALID_RESPONSE = 'INVALID_RESPONSE'
  static readonly TIMEOUT = 'TIMEOUT'
}
```

### 4.3 Vue Error Boundary

```vue
<!-- src/components/common/ErrorBoundary.vue -->
<script setup lang="ts">
import { ref, onErrorCaptured, type Component } from 'vue'
import { useAlert } from '@/composables/useAlert'

const props = defineProps<{
  fallback?: Component
}>()

const emit = defineEmits<{
  error: [error: Error, instance: unknown, info: string]
}>()

const hasError = ref(false)
const { showError } = useAlert()

onErrorCaptured((error, instance, info) => {
  hasError.value = true
  
  // 记录错误
  console.error('ErrorBoundary captured:', error, info)
  
  // 显示用户友好错误
  const message = error instanceof AppError 
    ? error.message 
    : '发生了未知错误，请刷新页面重试'
  showError(message)
  
  // 通知父组件
  emit('error', error, instance, info)
  
  // 返回 false 阻止错误继续传播
  return false
})

const retry = () => {
  hasError.value = false
}
</script>

<template>
  <slot v-if="!hasError" />
  <component 
    v-else-if="fallback" 
    :is="fallback" 
    @retry="retry" 
  />
  <div v-else class="error-fallback">
    <p>组件加载失败</p>
    <button @click="retry">重试</button>
  </div>
</template>
```

### 4.4 全局错误处理

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { useAlert } from './composables/useAlert'

const app = createApp(App)

// Vue 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
  
  // 转换为用户友好消息
  const message = err instanceof AppError
    ? err.message
    : '应用发生错误，请刷新页面重试'
  
  // 如果有 Alert 服务可用，显示错误
  // 注意：这里需要特殊处理，因为可能在组件外
}

// Promise 未捕获错误
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Rejection:', event.reason)
  
  // 阻止默认的控制台错误输出
  event.preventDefault()
  
  // 可选：发送到错误追踪服务
})

// 全局 JavaScript 错误
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error)
})

app.mount('#app')
```

### 4.5 IPC 错误处理标准化

```typescript
// electron/main/ipc/base.ts
export class IpcErrorHandler {
  static handle(error: unknown): IpcResponse<never> {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      }
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message,
        },
      }
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: '未知错误',
      },
    }
  }
}

// 在处理器中使用
ipcMain.handle('download:start', async (event, params) => {
  try {
    const result = await downloadHandler.start(params)
    return { success: true, data: result }
  } catch (error) {
    return IpcErrorHandler.handle(error)
  }
})
```

---

## 5. 数据流向

### 5.1 完整数据流图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据流向总览                                       │
└─────────────────────────────────────────────────────────────────────────────┘

用户操作 ──────► Component ──────► Composable ──────► Service ──────► Repository
                   │                  │                │                 │
                   │                  │                │                 │
                   ▼                  ▼                ▼                 ▼
              [UI 更新]         [状态管理]        [业务逻辑]         [数据访问]
                   │                  │                │                 │
                   │                  │                │                 │
                   │                  │                │                 ▼
                   │                  │                │          ┌───────────┐
                   │                  │                │          │  Client   │
                   │                  │                │          │(IPC/HTTP) │
                   │                  │                │          └─────┬─────┘
                   │                  │                │                │
                   │                  │                │                │ Preload
                   │                  │                │                │ Bridge
                   │                  │                │                │
                   │                  │                │                ▼
                   │                  │                │          ┌───────────┐
                   │                  │                │          │   Main    │
                   │                  │                │          │  Process  │
                   │                  │                │          └───────────┘
                   │                  │                │
                   │                  ◄────────────────┘
                   │                  │
                   ◄──────────────────┘
                   
              响应数据/错误 流回 Component 进行 UI 更新
```

### 5.2 关键场景数据流

#### 场景 1：壁纸搜索

```
用户输入搜索词
    │
    ▼
OnlineWallpaper.vue
    │ onSearch(query)
    ▼
useWallpaperList()
    │ search(params)
    ▼
WallpaperService.search()
    │ 协调 API 调用和缓存逻辑
    ▼
WallpaperRepository.search()
    │ 调用 API 客户端
    ▼
ApiClient.get('/api/search')
    │ HTTP 请求或 IPC 代理
    ▼
Wallhaven API
    │ 返回数据
    ▼
Repository 缓存处理
    │
    ▼
Service 数据转换
    │
    ▼
Composable 更新状态
    │
    ▼
Component 响应式渲染
```

#### 场景 2：下载壁纸

```
用户点击下载
    │
    ▼
WallpaperList.vue
    │ onDownload(wallpaper)
    ▼
useDownload()
    │ startDownload(item)
    ▼
DownloadService.startDownload()
    │ 验证设置、检查路径
    ▼
SettingsRepository.getDownloadSettings()
    │ 读取存储设置
    ▼
StoreClient.get('appSettings')
    │ IPC 调用
    ▼
Main Process: store.get()
    │
    ▼ (返回设置)
DownloadService
    │ 调用下载
    ▼
ElectronClient.download.start()
    │ IPC: 'download:start'
    ▼
Main Process: DownloadHandler
    │ 执行下载
    │ 发送进度事件
    ▼
Preload: onDownloadProgress
    │ 回调到渲染进程
    ▼
useDownload().handleProgress()
    │ 更新下载状态
    ▼
Component 更新进度条
```

---

## 6. 组件边界

### 6.1 核心边界定义

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           组件边界图                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│           表现层边界                 │
│  Components ──► 只依赖 Composables  │
│  不直接访问 Service/Repository      │
└───────────────┬─────────────────────┘
                │
                │ 通过 Composable 暴露的接口
                ▼
┌─────────────────────────────────────┐
│           组合层边界                 │
│  Composables ──► 依赖 Services      │
│  可访问 Store，不访问 Repository     │
└───────────────┬─────────────────────┘
                │
                │ 调用 Service 方法
                ▼
┌─────────────────────────────────────┐
│           业务层边界                 │
│  Services ──► 依赖 Repositories     │
│  不访问 Electron API / HTTP 客户端  │
└───────────────┬─────────────────────┘
                │
                │ 通过 Repository 接口
                ▼
┌─────────────────────────────────────┐
│           数据层边界                 │
│  Repositories ──► 依赖 Clients      │
│  封装所有外部数据访问                │
└─────────────────────────────────────┘
```

### 6.2 跨边界通信规则

| 从 → 到 | 允许方式 | 禁止方式 |
|--------|---------|---------|
| Component → Composable | 函数调用、返回值 | 直接访问 Store |
| Composable → Service | 方法调用、Promise | 直接调用 IPC |
| Service → Repository | 接口方法 | 直接使用 axios |
| Repository → Client | 客户端方法 | 跨层访问 |

### 6.3 Store 的角色

Store 在新架构中角色转变：

| 旧角色 | 新角色 |
|-------|-------|
| 直接调用 Electron API | 通过 Repository 访问 |
| 包含业务逻辑 | 仅存储响应式状态 |
| 处理数据持久化 | 由 Repository 负责 |
| 直接被组件使用 | 通过 Composable 访问 |

---

## 7. 构建顺序

### 7.1 阶段划分

```
阶段 0: 基础设施 (Foundation)
├── 类型定义完善
├── 错误类定义
└── 客户端抽象

阶段 1: 数据层 (Data Layer)
├── Clients 实现
├── Repositories 实现
└── Repository 测试

阶段 2: 业务层 (Business Layer)
├── Services 实现
├── Service 测试
└── DI 容器

阶段 3: 组合层 (Composition Layer)
├── Composables 实现
├── Store 重构
└── Composable 测试

阶段 4: 表现层 (Presentation Layer)
├── Components 重构
├── Error Boundary
└── 组件测试

阶段 5: 主进程重构 (Main Process)
├── IPC 处理器拆分
├── 错误处理标准化
└── 主进程测试

阶段 6: 集成与清理 (Integration)
├── 端到端测试
├── 死代码清理
└── 文档更新
```

### 7.2 阶段依赖关系

```
                    阶段 0 (基础设施)
                         │
                         ▼
                    阶段 1 (数据层)
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
    阶段 2 (业务层)              阶段 5 (主进程)
          │                             │
          ▼                             │
    阶段 3 (组合层) ◄───────────────────┘
          │
          ▼
    阶段 4 (表现层)
          │
          ▼
    阶段 6 (集成)
```

### 7.3 每阶段详细任务

#### 阶段 0: 基础设施

```
任务 0.1: 类型定义完善
├── 创建 src/types/api.types.ts
├── 创建 src/types/electron.types.ts  
├── 创建 src/types/store.types.ts
├── 创建 src/types/errors.ts
└── 消除关键位置的 any 类型

任务 0.2: 错误类定义
├── 创建 src/errors/AppError.ts
├── 创建 src/errors/DomainError.ts
├── 创建 src/errors/DownloadError.ts
├── 创建 src/errors/FileError.ts
└── 创建 src/errors/index.ts

任务 0.3: 客户端接口定义
├── 定义 IClient 接口
├── 定义 IElectronClient 接口
├── 定义 IApiClient 接口
└── 定义 IStoreClient 接口
```

#### 阶段 1: 数据层

```
任务 1.1: Clients 实现
├── 创建 src/clients/electron.client.ts
│   └── 封装 window.electronAPI
├── 创建 src/clients/api.client.ts
│   └── 封装 axios，环境感知
└── 创建 src/clients/store.client.ts
    └── 封装 electron-store IPC

任务 1.2: Repositories 实现
├── 创建 src/repositories/wallpaper.repository.ts
├── 创建 src/repositories/settings.repository.ts
├── 创建 src/repositories/download.repository.ts
└── 创建 src/repositories/index.ts

任务 1.3: 旧代码兼容
├── 创建适配层保持旧接口
└── 添加废弃警告
```

#### 阶段 2: 业务层

```
任务 2.1: Services 实现
├── 创建 src/services/wallpaper.service.ts
├── 创建 src/services/download.service.ts
├── 创建 src/services/settings.service.ts
└── 创建 src/services/index.ts

任务 2.2: DI 容器
├── 创建 src/di/container.ts
├── 在 main.ts 中注册
└── 创建 useServices composable
```

#### 阶段 3: 组合层

```
任务 3.1: 核心状态 Composables
├── 创建 src/composables/useAlert.ts (解决重复问题)
├── 创建 src/composables/useLoading.ts
└── 创建 src/composables/useError.ts

任务 3.2: 业务 Composables
├── 创建 src/composables/useWallpaperList.ts
├── 创建 src/composables/useDownload.ts
├── 创建 src/composables/useSettings.ts
└── 创建 src/composables/useImagePreview.ts

任务 3.3: Store 重构
├── 精简 WallpaperStore
├── 精简 DownloadStore
└── 移除 Store 中的业务逻辑
```

#### 阶段 4: 表现层

```
任务 4.1: Error Boundary
├── 创建 src/components/common/ErrorBoundary.vue
├── 在关键位置添加边界
└── 配置全局错误处理

任务 4.2: 组件重构
├── 重构 OnlineWallpaper.vue 使用 composables
├── 重构 LocalWallpaper.vue 使用 composables
├── 重构 DownloadWallpaper.vue 使用 composables
└── 重构 SettingPage.vue 使用 composables

任务 4.3: 清理
├── 移除组件中的重复状态
├── 统一错误处理
└── 统一 Loading 状态
```

#### 阶段 5: 主进程重构

```
任务 5.1: IPC 基础设施
├── 创建 electron/main/ipc/base.ts
├── 创建 electron/main/ipc/types.ts
└── 创建 electron/main/ipc/index.ts

任务 5.2: 处理器拆分
├── 创建 electron/main/ipc/handlers/file.handler.ts
├── 创建 electron/main/ipc/handlers/download.handler.ts
├── 创建 electron/main/ipc/handlers/settings.handler.ts
├── 创建 electron/main/ipc/handlers/wallpaper.handler.ts
├── 创建 electron/main/ipc/handlers/window.handler.ts
├── 创建 electron/main/ipc/handlers/cache.handler.ts
└── 创建 electron/main/ipc/handlers/api.handler.ts

任务 5.3: 错误处理
├── 实现统一错误处理
├── 添加日志记录
└── 错误响应标准化
```

#### 阶段 6: 集成与清理

```
任务 6.1: 死代码清理
├── 移除 ElectronTest.vue
├── 移除 AlertDemo.vue
├── 移除 APITest.vue (或保留为开发工具)
└── 移除 Diagnostic.vue (或保留为诊断工具)

任务 6.2: 类型清理
├── 消除所有剩余 any
├── 添加 JSDoc 注释
└── 类型导出整理

任务 6.3: 文档
├── 更新 ARCHITECTURE.md
├── 更新 STRUCTURE.md
└── 添加迁移指南
```

---

## 8. 渐进式重构路径

### 8.1 安全重构原则

1. **增量式改变**：每次只改一小部分，确保可验证
2. **保持向后兼容**：新旧代码并行运行期间
3. **测试驱动**：重构前添加测试覆盖
4. **回滚准备**：每阶段可独立回滚

### 8.2 并行运行策略

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        新旧代码并行运行示例                                   │
└─────────────────────────────────────────────────────────────────────────────┘

旧代码路径:
  Component → Store → window.electronAPI → IPC

新代码路径:
  Component → Composable → Service → Repository → Client → IPC

并行策略:
  1. 先实现新路径的完整链路
  2. 添加功能开关控制走哪条路径
  3. 逐步将功能切换到新路径
  4. 确认稳定后移除旧路径

示例代码:
```typescript
// src/composables/useWallpaperList.ts
const USE_NEW_ARCH = true // 功能开关

export function useWallpaperList() {
  const { wallpaperService } = useServices()
  const wallpaperStore = useWallpaperStore()
  
  const fetchWallpapers = async (params: GetParams) => {
    if (USE_NEW_ARCH) {
      // 新路径
      return wallpaperService.searchWallpapers(params)
    } else {
      // 旧路径
      return wallpaperStore.fetchWallpapers(params)
    }
  }
  
  return { fetchWallpapers }
}
```

### 8.3 风险控制检查点

| 阶段 | 检查点 | 回滚条件 |
|-----|-------|---------|
| 阶段 0 | 类型检查通过，无运行时错误 | 类型推断失败 |
| 阶段 1 | 数据读写正常，旧功能不受影响 | 数据丢失或损坏 |
| 阶段 2 | 业务逻辑正确，性能无明显下降 | 业务逻辑错误 |
| 阶段 3 | UI 响应正常，状态同步正确 | UI 异常或卡顿 |
| 阶段 4 | 用户体验一致，无新增 bug | 功能异常 |
| 阶段 5 | IPC 通信稳定，错误处理完善 | IPC 通信失败 |
| 阶段 6 | 全功能验证通过 | 功能回归 |

### 8.4 每阶段验证清单

```
阶段验证清单:

[ ] 所有现有功能正常工作
[ ] 无新增 TypeScript 错误
[ ] 无控制台错误或警告
[ ] 性能无明显下降
[ ] 代码审查通过
[ ] 相关测试通过
```

---

## 9. 总结

### 9.1 架构收益

| 问题 | 解决方案 | 收益 |
|-----|---------|------|
| IPC 单文件 866 行 | 处理器模块化拆分 | 可维护性提升 |
| Alert 状态重复 4+ 处 | useAlert composable | 代码复用 |
| 60+ 处 any 类型 | 完整类型定义 | 类型安全 |
| 无服务层抽象 | 四层架构 + DI | 解耦、可测试 |
| Store 与 Electron 耦合 | Repository 模式 | 可替换、可测试 |
| 无错误边界 | ErrorBoundary + 统一处理 | 鲁棒性增强 |

### 9.2 关键成功因素

1. **渐进式重构**：不一次性重写，分阶段进行
2. **保持兼容**：新旧代码并行运行，平滑过渡
3. **边界清晰**：明确的层次和依赖规则
4. **验证充分**：每阶段都有验证清单

### 9.3 后续演进方向

- 添加自动化测试覆盖
- 性能优化（虚拟滚动、代码分割）
- 安全加固（API Key 加密）
- 可访问性改进

---

*创建时间：2025-04-25*
*适用版本：重构项目 Milestone 1*
