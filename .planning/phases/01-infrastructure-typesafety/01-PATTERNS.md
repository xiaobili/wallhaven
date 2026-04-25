# Phase 1: Pattern Mapping - 基础设施与类型安全

**Generated:** 2025-04-25
**Phase:** 01-infrastructure-typesafety

---

## Overview

本文档为阶段 1 的每个待创建/修改文件提供：
1. 代码库中最接近的参考文件（analog）
2. 需要遵循的具体代码模式
3. 导入/导出约定
4. TypeScript 规范

---

## 1. 类型定义文件

### 1.1 `src/types/domain/index.ts` (NEW)

**Analog File:** `src/types/index.ts`

**Role:** 领域类型导出入口
**Data Flow:** 被其他模块导入使用

**Code Pattern from Analog:**
```typescript
// src/types/index.ts (现有模式)
// ==================== 壁纸相关类型 ====================

/**
 * 壁纸元数据
 */
export interface WallpaperMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  query?: string | WallpaperQuery
  seed?: string | null
}

/**
 * 壁纸项目信息
 */
export interface WallpaperItem {
  id: string
  url: string
  // ... 其他属性
}
```

**New File Pattern:**
```typescript
// src/types/domain/index.ts
/**
 * 领域类型统一导出
 * 阶段 1：创建空导出文件，后续阶段逐步迁移类型
 */

// 阶段 1 仅创建目录结构，暂不迁移类型
// 后续阶段将迁移以下类型：
// - WallpaperItem
// - WallpaperMeta
// - PageData
// - TotalPageData
// - DownloadItem
// - DownloadState
// - AppSettings
// - WallpaperFit

export {}
```

**Import/Export Convention:**
- 使用 JSDoc 注释说明类型用途
- 使用 `export interface` 导出接口
- 使用 `export type` 导出类型别名

---

### 1.2 `src/types/api/index.ts` (NEW)

**Analog File:** `src/types/index.ts`

**Role:** API 相关类型导出入口
**Data Flow:** 被 API 服务层导入使用

**Code Pattern:**
```typescript
// src/types/api/index.ts
/**
 * API 相关类型统一导出
 * 阶段 1：创建空导出文件，后续阶段逐步迁移类型
 */

// 后续阶段将迁移以下类型：
// - GetParams
// - CustomParams
// - WallpaperQuery
// - WallpaperThumb
// - SearchBarProps
// - WallpaperListProps

export {}
```

---

### 1.3 `src/types/ipc/index.ts` (NEW)

**Analog File:** `src/types/index.ts`

**Role:** IPC 类型导出入口（渲染进程专用）
**Data Flow:** 被渲染进程 IPC 调用代码导入

**Code Pattern:**
```typescript
// src/types/ipc/index.ts
/**
 * IPC 相关类型统一导出（渲染进程专用）
 * 阶段 1：创建空导出文件，后续阶段逐步迁移类型
 *
 * 注意：主进程和渲染进程共享的类型定义在 src/shared/types/ipc.ts
 */

// 后续阶段将迁移以下类型：
// - ElectronAPI 接口（从 preload 迁移）
// - 各 IPC 通道的请求/响应类型

export {}
```

---

### 1.4 `src/shared/types/ipc.ts` (NEW)

**Analog File:** `electron/preload/index.ts` (L7-84)

**Role:** 主进程和渲染进程共享的 IPC 类型定义
**Data Flow:** 双向 - 主进程和渲染进程都导入使用

**Code Pattern from Analog:**
```typescript
// electron/preload/index.ts (现有模式)
export interface ElectronAPI {
  // 文件夹选择
  selectFolder: () => Promise<string | null>

  // 目录操作
  readDirectory: (dirPath: string) => Promise<{ error: string | null; files: any[] }>
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>

  // 文件操作
  deleteFile: (filePath: string) => Promise<{ success: boolean; error: string | null }>

  // 下载功能
  downloadWallpaper: (params: {
    url: string
    filename: string
    saveDir: string
  }) => Promise<{ success: boolean; filePath: string | null; error: string | null }>

  // ... 其他方法
}
```

**New File Pattern:**
```typescript
// src/shared/types/ipc.ts
/**
 * IPC 通道名称常量和共享类型定义
 * 此文件可被主进程和渲染进程共同使用
 */

// ==================== IPC 通道名称常量 ====================
/**
 * IPC 通道名称常量
 * 使用常量避免字符串拼写错误
 */
export const IPC_CHANNELS = {
  // 文件操作
  SELECT_FOLDER: 'select-folder',
  READ_DIRECTORY: 'read-directory',
  OPEN_FOLDER: 'open-folder',
  DELETE_FILE: 'delete-file',

  // 下载
  DOWNLOAD_WALLPAPER: 'download-wallpaper',
  START_DOWNLOAD_TASK: 'start-download-task',
  DOWNLOAD_PROGRESS: 'download-progress',

  // 壁纸设置
  SET_WALLPAPER: 'set-wallpaper',

  // 设置管理
  SAVE_SETTINGS: 'save-settings',
  LOAD_SETTINGS: 'load-settings',

  // API 代理
  WALLHAVEN_API_REQUEST: 'wallhaven-api-request',

  // 窗口控制
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',

  // Store 操作
  STORE_GET: 'store-get',
  STORE_SET: 'store-set',
  STORE_DELETE: 'store-delete',
  STORE_CLEAR: 'store-clear',

  // 缓存管理
  CLEAR_APP_CACHE: 'clear-app-cache',
  GET_CACHE_INFO: 'get-cache-info',
} as const

// ==================== IPC 响应类型 ====================
/**
 * 通用 IPC 响应包装类型
 */
export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: IpcErrorInfo
}

/**
 * IPC 错误信息
 */
export interface IpcErrorInfo {
  code: string
  message: string
}

// ==================== 各通道的请求/响应类型 ====================

/**
 * 选择文件夹响应
 */
export interface SelectFolderResponse {
  path: string | null
}

/**
 * 本地文件信息
 */
export interface LocalFile {
  name: string
  path: string
  thumbnailPath: string
  size: number
  modifiedAt: number
  width: number
  height: number
}

/**
 * 读取目录响应
 */
export interface ReadDirectoryResponse {
  error: string | null
  files: LocalFile[]
}

/**
 * 下载壁纸请求参数
 */
export interface DownloadWallpaperRequest {
  url: string
  filename: string
  saveDir: string
}

/**
 * 下载壁纸响应
 */
export interface DownloadWallpaperResponse {
  success: boolean
  filePath: string | null
  error: string | null
}

/**
 * 开始下载任务请求参数
 */
export interface StartDownloadTaskRequest {
  taskId: string
  url: string
  filename: string
  saveDir: string
}

/**
 * 下载进度数据
 */
export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed'
  filePath?: string
  error?: string
  totalSize?: number
}

/**
 * 保存设置请求
 */
export interface SaveSettingsRequest {
  settings: Record<string, unknown>
}

/**
 * 加载设置响应
 */
export interface LoadSettingsResponse {
  success: boolean
  settings: Record<string, unknown> | null
  error?: string
}

/**
 * Wallhaven API 请求参数
 */
export interface WallhavenApiRequest {
  endpoint: string
  params?: Record<string, unknown>
  apiKey?: string
}

/**
 * Wallhaven API 响应
 */
export interface WallhavenApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error?: string
  status?: number
}

/**
 * Store 操作请求
 */
export interface StoreSetRequest {
  key: string
  value: unknown
}

/**
 * Store 获取响应
 */
export interface StoreGetResponse {
  success: boolean
  value: unknown
  error?: string
}

/**
 * 缓存信息
 */
export interface CacheInfo {
  thumbnailsCount: number
  tempFilesCount: number
}

/**
 * 清理缓存响应
 */
export interface ClearCacheResponse {
  success: boolean
  thumbnailsDeleted: number
  tempFilesDeleted: number
  errors?: string[]
  error?: string
}
```

**Import Convention:**
```typescript
// 渲染进程使用
import { IPC_CHANNELS, IpcResponse } from '@/shared/types/ipc'

// 主进程使用（相对路径或配置 alias）
import { IPC_CHANNELS } from '../../src/shared/types/ipc'
```

---

## 2. 错误类文件

### 2.1 `src/errors/index.ts` (NEW)

**Analog File:** `src/stores/modules/wallpaper/index.ts` (统一导出模式)

**Role:** 错误类统一导出入口
**Data Flow:** 被其他模块导入使用

**Code Pattern from Analog:**
```typescript
// src/stores/modules/wallpaper/index.ts (现有模式)
import { defineStore } from 'pinia'
import { createInitialState } from './state'
import { createWallpaperActions } from './actions'

export const useWallpaperStore = defineStore('wallpaper', () => {
  // ...
})
```

**New File Pattern:**
```typescript
// src/errors/index.ts
/**
 * 错误类统一导出
 */

export { AppError } from './AppError'
export { IpcError } from './IpcError'
export { StoreError } from './StoreError'
export { NetworkError } from './NetworkError'

// 类型导出
export type { AppErrorOptions, IpcErrorOptions, StoreErrorOptions, NetworkErrorOptions } from './types'
```

---

### 2.2 `src/errors/AppError.ts` (NEW)

**Analog File:** 无直接对应，参考 TypeScript Error 最佳实践

**Role:** 基础错误类
**Data Flow:** 被其他错误类继承

**Code Pattern:**
```typescript
// src/errors/AppError.ts
/**
 * 应用基础错误类
 * 提供统一的错误结构，包含错误码和上下文信息
 */

/**
 * AppError 构造选项
 */
export interface AppErrorOptions {
  code?: string
  context?: Record<string, unknown>
  cause?: Error
}

/**
 * 应用基础错误类
 *
 * @example
 * ```typescript
 * throw new AppError('操作失败', { code: 'OPERATION_FAILED', context: { userId: 123 } })
 * ```
 */
export class AppError extends Error {
  /**
   * 错误码，用于错误分类
   */
  readonly code: string

  /**
   * 错误上下文，用于调试和日志
   */
  readonly context?: Record<string, unknown>

  /**
   * 原始错误，用于错误链追踪
   */
  readonly cause?: Error

  constructor(message: string, options?: AppErrorOptions) {
    super(message)
    this.name = 'AppError'
    this.code = options?.code ?? 'UNKNOWN_ERROR'
    this.context = options?.context
    this.cause = options?.cause

    // 确保原型链正确（TypeScript 编译到 ES5 时需要）
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      cause: this.cause?.message,
    }
  }

  /**
   * 转换为字符串
   */
  override toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`
    if (this.context) {
      result += ` (context: ${JSON.stringify(this.context)})`
    }
    return result
  }
}
```

---

### 2.3 `src/errors/IpcError.ts` (NEW)

**Analog File:** `electron/preload/index.ts` (IPC 上下文)

**Role:** IPC 错误类
**Data Flow:** 在 IPC 调用失败时抛出

**Code Pattern:**
```typescript
// src/errors/IpcError.ts
import { AppError, type AppErrorOptions } from './AppError'

/**
 * IpcError 构造选项
 */
export interface IpcErrorOptions extends AppErrorOptions {
  channel?: string
}

/**
 * IPC 通信错误
 *
 * @example
 * ```typescript
 * throw new IpcError('IPC 调用失败', {
 *   channel: 'select-folder',
 *   context: { args: [] }
 * })
 * ```
 */
export class IpcError extends AppError {
  /**
   * IPC 通道名称
   */
  readonly channel?: string

  constructor(message: string, options?: IpcErrorOptions) {
    super(message, {
      code: options?.code ?? 'IPC_ERROR',
      context: options?.context,
      cause: options?.cause,
    })
    this.name = 'IpcError'
    this.channel = options?.channel

    Object.setPrototypeOf(this, IpcError.prototype)
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      channel: this.channel,
    }
  }
}
```

---

### 2.4 `src/errors/StoreError.ts` (NEW)

**Analog File:** `electron/main/ipc/handlers.ts` (L679-731 Store 操作)

**Role:** Store 错误类
**Data Flow:** 在 Store 操作失败时抛出

**Code Pattern:**
```typescript
// src/errors/StoreError.ts
import { AppError, type AppErrorOptions } from './AppError'

/**
 * StoreError 构造选项
 */
export interface StoreErrorOptions extends AppErrorOptions {
  key?: string
  operation?: 'get' | 'set' | 'delete' | 'clear'
}

/**
 * Store 操作错误
 *
 * @example
 * ```typescript
 * throw new StoreError('读取设置失败', {
 *   key: 'user-preferences',
 *   operation: 'get',
 *   context: { reason: '文件不存在' }
 * })
 * ```
 */
export class StoreError extends AppError {
  /**
   * 操作的键名
   */
  readonly key?: string

  /**
   * 操作类型
   */
  readonly operation?: 'get' | 'set' | 'delete' | 'clear'

  constructor(message: string, options?: StoreErrorOptions) {
    super(message, {
      code: options?.code ?? 'STORE_ERROR',
      context: options?.context,
      cause: options?.cause,
    })
    this.name = 'StoreError'
    this.key = options?.key
    this.operation = options?.operation

    Object.setPrototypeOf(this, StoreError.prototype)
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      key: this.key,
      operation: this.operation,
    }
  }
}
```

---

### 2.5 `src/errors/NetworkError.ts` (NEW)

**Analog File:** `src/services/wallpaperApi.ts` (L159-180 错误处理)

**Role:** 网络错误类
**Data Flow:** 在网络请求失败时抛出

**Code Pattern from Analog:**
```typescript
// src/services/wallpaperApi.ts (现有错误处理模式)
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[API Response Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
    })

    // 提供更友好的错误信息
    if (error.code === 'ECONNABORTED') {
      console.error('请求超时，请检查网络连接')
    } else if (error.response?.status === 401) {
      console.error('API Key 无效或已过期')
    }
    // ...
    return Promise.reject(error)
  },
)
```

**New File Pattern:**
```typescript
// src/errors/NetworkError.ts
import { AppError, type AppErrorOptions } from './AppError'

/**
 * NetworkError 构造选项
 */
export interface NetworkErrorOptions extends AppErrorOptions {
  statusCode?: number
  url?: string
  timeout?: boolean
}

/**
 * 网络请求错误
 *
 * @example
 * ```typescript
 * throw new NetworkError('请求超时', {
 *   timeout: true,
 *   url: 'https://wallhaven.cc/api/v1/search',
 *   context: { timeout: 15000 }
 * })
 * ```
 */
export class NetworkError extends AppError {
  /**
   * HTTP 状态码
   */
  readonly statusCode?: number

  /**
   * 请求 URL
   */
  readonly url?: string

  /**
   * 是否为超时错误
   */
  readonly timeout: boolean

  constructor(message: string, options?: NetworkErrorOptions) {
    super(message, {
      code: options?.code ?? 'NETWORK_ERROR',
      context: options?.context,
      cause: options?.cause,
    })
    this.name = 'NetworkError'
    this.statusCode = options?.statusCode
    this.url = options?.url
    this.timeout = options?.timeout ?? false

    Object.setPrototypeOf(this, NetworkError.prototype)
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    if (this.timeout) {
      return '网络请求超时，请检查网络连接'
    }

    if (this.statusCode === 401) {
      return '认证失败，请检查 API Key'
    }

    if (this.statusCode === 403) {
      return '访问被拒绝'
    }

    if (this.statusCode === 404) {
      return '请求的资源不存在'
    }

    if (this.statusCode && this.statusCode >= 500) {
      return '服务器错误，请稍后重试'
    }

    if (!this.statusCode) {
      return '网络连接失败，请检查网络'
    }

    return this.message
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      url: this.url,
      timeout: this.timeout,
    }
  }
}
```

---

## 3. Composable 文件

### 3.1 `src/composables/core/useAlert.ts` (NEW)

**Analog File:** `src/views/OnlineWallpaper.vue` (L99-117)

**Role:** Alert 状态管理 composable
**Data Flow:** 被组件调用，返回响应式状态和方法

**Code Pattern from Analog:**
```typescript
// src/views/OnlineWallpaper.vue (现有模式)
import { reactive } from 'vue'

// Alert 状态管理
const alert = reactive({
  visible: false,
  type: 'info' as 'success' | 'error' | 'warning' | 'info',
  message: '',
  duration: 3000
})

// 显示提示消息
const showAlert = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration: number = 3000
) => {
  alert.message = message
  alert.type = type
  alert.duration = duration
  alert.visible = true
}
```

**New File Pattern:**
```typescript
// src/composables/core/useAlert.ts
/**
 * Alert 状态管理 composable
 *
 * 用于统一管理 Alert 提示框的状态和显示逻辑
 *
 * @example
 * ```typescript
 * const { alert, showAlert, showSuccess, showError } = useAlert()
 *
 * // 显示成功提示
 * showSuccess('操作成功')
 *
 * // 显示错误提示（默认更长显示时间）
 * showError('操作失败')
 *
 * // 在模板中使用
 * // <Alert v-if="alert.visible" :type="alert.type" :message="alert.message" />
 * ```
 */

import { reactive, type Reactive } from 'vue'

/**
 * Alert 类型
 */
export type AlertType = 'success' | 'error' | 'warning' | 'info'

/**
 * Alert 状态接口
 */
export interface AlertState {
  visible: boolean
  type: AlertType
  message: string
  duration: number
}

/**
 * useAlert 返回值接口
 */
export interface UseAlertReturn {
  alert: Reactive<AlertState>
  showAlert: (message: string, type?: AlertType, duration?: number) => void
  hideAlert: () => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

/**
 * 创建 Alert 状态管理
 *
 * @param defaultDuration 默认显示时长（毫秒）
 * @returns Alert 状态和方法
 */
export function useAlert(defaultDuration = 3000): UseAlertReturn {
  const alert = reactive<AlertState>({
    visible: false,
    type: 'info',
    message: '',
    duration: defaultDuration,
  })

  /**
   * 显示 Alert
   */
  const showAlert = (
    message: string,
    type: AlertType = 'info',
    duration: number = defaultDuration
  ): void => {
    alert.message = message
    alert.type = type
    alert.duration = duration
    alert.visible = true
  }

  /**
   * 隐藏 Alert
   */
  const hideAlert = (): void => {
    alert.visible = false
  }

  /**
   * 显示成功提示
   */
  const showSuccess = (message: string, duration?: number): void => {
    showAlert(message, 'success', duration)
  }

  /**
   * 显示错误提示
   * 错误提示默认显示更长时间（5000ms）
   */
  const showError = (message: string, duration = 5000): void => {
    showAlert(message, 'error', duration)
  }

  /**
   * 显示警告提示
   */
  const showWarning = (message: string, duration?: number): void => {
    showAlert(message, 'warning', duration)
  }

  /**
   * 显示信息提示
   */
  const showInfo = (message: string, duration?: number): void => {
    showAlert(message, 'info', duration)
  }

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
```

**Usage in Component:**
```typescript
// 迁移后的组件使用方式
import { useAlert } from '@/composables/core/useAlert'

const { alert, showSuccess, showError } = useAlert()

// 显示提示
showSuccess('操作成功')

// 模板绑定
// <Alert v-if="alert.visible" :type="alert.type" :message="alert.message" :duration="alert.duration" @close="alert.visible = false" />
```

---

## 4. 修改文件

### 4.1 `src/main.ts` (MODIFIED)

**Current Content:**
```typescript
// src/main.ts (现有内容)
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

let wallpaperStore: any = null
let downloadStore: any = null

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

async function initializeApp() {
  // ...
}

initializeApp()
```

**Changes Required:**
```typescript
// src/main.ts (修改后)
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { AppError } from '@/errors'

let wallpaperStore: any = null
let downloadStore: any = null

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// ==================== 全局错误处理器 ====================

/**
 * Vue 错误处理器
 */
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err, info)

  if (err instanceof AppError) {
    console.error('[Error Code]', err.code)
    console.error('[Error Context]', err.context)
  }

  // 注意：不在此处显示 Alert，因为应用可能未完全初始化
  // 全局错误应通过控制台记录，UI 层错误由组件自行处理
}

/**
 * 未处理的 Promise rejection
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)

  // 如果是 AppError 实例，提取结构化信息
  if (event.reason instanceof AppError) {
    console.error('[Error Code]', event.reason.code)
    console.error('[Error Context]', event.reason.context)
  }

  // 阻止默认的控制台警告
  event.preventDefault()
})

/**
 * 全局 JavaScript 错误
 */
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
})

// ==================== 应用挂载 ====================

app.mount('#app')

// 异步初始化
async function initializeApp() {
  // ... 现有代码保持不变
}

initializeApp()
```

---

### 4.2 `src/stores/modules/wallpaper/actions.ts` (MODIFIED)

**Current Content (Line 13):**
```typescript
// src/stores/modules/wallpaper/actions.ts:13
export function createWallpaperActions(
  totalPageData: any, // ❌ 应为 ShallowRef<TotalPageData>
  loading: Ref<boolean>,
  error: Ref<boolean>,
  // ...
)
```

**Changes Required:**
```typescript
// src/stores/modules/wallpaper/actions.ts (修改后)
import type { Ref, Reactive, ShallowRef } from 'vue'  // 添加 ShallowRef
import type { TotalPageData, GetParams, CustomParams, AppSettings } from '@/types'
import { searchWallpapers } from '@/services/wallpaperApi'
import { saveCustomParamsToStorage, getSavedParamsFromStorage } from './storage'
import { saveSettingsToStorage, getSettingsFromStorage } from './settings-storage'

/**
 * 创建壁纸 actions（优化版）
 */
export function createWallpaperActions(
  totalPageData: ShallowRef<TotalPageData>,  // ✅ 明确类型
  loading: Ref<boolean>,
  error: Ref<boolean>,
  queryParams: Ref<GetParams | null>,
  savedParams: Ref<CustomParams | null>,
  settings: Reactive<AppSettings>,
) {
  // ... 其余代码保持不变
}
```

---

## 5. Import/Export 约定总结

### 路径别名
```typescript
// tsconfig.app.json 配置
"paths": {
  "@/*": ["./src/*"]
}

// 使用示例
import { WallpaperItem } from '@/types'
import { useAlert } from '@/composables/core/useAlert'
import { AppError } from '@/errors'
import { IPC_CHANNELS } from '@/shared/types/ipc'
```

### 导出模式
```typescript
// 命名导出（推荐）
export interface Foo {}
export function bar() {}
export const BAZ = 'baz'

// 统一导出（index.ts）
export { Foo } from './Foo'
export type { FooOptions } from './types'

// 避免默认导出（便于 tree-shaking 和重命名）
// ❌ export default class AppError {}
// ✅ export class AppError {}
```

### TypeScript 规范
```typescript
// 类型导入使用 type 关键字
import type { Ref, ShallowRef } from 'vue'
import type { TotalPageData } from '@/types'

// 运行时导入不使用 type
import { reactive, ref } from 'vue'
import { searchWallpapers } from '@/services/wallpaperApi'

// 使用 readonly 标记不可变属性
export class AppError extends Error {
  readonly code: string
  readonly context?: Record<string, unknown>
}

// 使用 as const 断言常量对象
export const IPC_CHANNELS = {
  SELECT_FOLDER: 'select-folder',
} as const
```

---

## 6. 验证清单

创建文件后，确认以下内容：

### 类型定义
- [ ] `src/types/domain/index.ts` 存在且可导入
- [ ] `src/types/api/index.ts` 存在且可导入
- [ ] `src/types/ipc/index.ts` 存在且可导入
- [ ] `src/shared/types/ipc.ts` 存在且 `IPC_CHANNELS` 可导入

### 错误类
- [ ] `src/errors/index.ts` 导出所有错误类
- [ ] `AppError` 可实例化，包含 `code`、`context`、`toJSON()`
- [ ] `IpcError` 继承 `AppError`，包含 `channel`
- [ ] `StoreError` 继承 `AppError`，包含 `key`、`operation`
- [ ] `NetworkError` 继承 `AppError`，包含 `statusCode`、`getUserMessage()`

### Composable
- [ ] `src/composables/core/useAlert.ts` 存在
- [ ] `useAlert()` 返回 `{ alert, showAlert, hideAlert, showSuccess, showError, showWarning, showInfo }`
- [ ] `alert` 是响应式对象

### 修改文件
- [ ] `src/main.ts` 包含全局错误处理器
- [ ] `src/stores/modules/wallpaper/actions.ts` 第 13 行 `any` 类型已替换为 `ShallowRef<TotalPageData>`

### 编译验证
```bash
npm run typecheck  # 应无错误
npm run dev        # 应用应正常启动
```

---

*Pattern mapping completed: 2025-04-25*
