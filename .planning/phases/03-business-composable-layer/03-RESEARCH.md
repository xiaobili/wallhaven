# Phase 3 Research: 业务层与组合层

**Research Date:** 2025-04-25
**Phase Goal:** 实现业务逻辑抽象，简化 Store，建立清晰的分层架构

---

## 1. Current Architecture Analysis

### 1.1 现有代码结构

```
src/
├── clients/                          # Phase 2 已创建
│   ├── index.ts                      # 统一导出
│   ├── constants.ts                  # STORAGE_KEYS
│   ├── electron.client.ts            # Electron IPC 封装
│   └── api.client.ts                 # HTTP 客户端封装
│
├── repositories/                     # Phase 2 已创建
│   ├── index.ts                      # 统一导出
│   ├── settings.repository.ts        # 设置存储
│   ├── download.repository.ts        # 下载记录存储
│   └── wallpaper.repository.ts       # 查询参数存储
│
├── composables/                      # Phase 1 已创建
│   ├── index.ts                      # 统一导出
│   └── core/useAlert.ts              # Alert composable (参考模式)
│
├── services/                         # 待重构
│   └── wallpaperApi.ts               # 现有 API 服务 (混合逻辑)
│
└── stores/                           # 待精简
    ├── wallpaper.ts                  # 重新导出
    └── modules/
        ├── download/index.ts         # 下载 Store (~340行)
        └── wallpaper/
            ├── index.ts              # 入口
            ├── state.ts              # 状态定义
            ├── actions.ts            # 业务逻辑
            ├── storage.ts            # 参数存储
            └── settings-storage.ts   # 设置存储
```

### 1.2 现有 Store 业务逻辑分析

#### DownloadStore (src/stores/modules/download/index.ts)

**当前职责（需迁移到 Service）：**
1. `startDownload()` - 获取下载目录、选择目录、启动 Electron 下载
2. `completeDownload()` - 创建完成记录、保存到存储
3. `saveToStorage()` - 持久化到 electron-store
4. `loadFromStorage()` - 从 electron-store 加载

**保留在 Store 的状态：**
```typescript
// 响应式状态
const downloadingList = ref<DownloadItem[]>([])
const finishedList = ref<FinishedDownloadItem[]>([])

// 计算属性（简单 getter）
const activeDownloads = computed(() => downloadingList.value.filter(item => item.state === 'downloading'))
const pausedDownloads = computed(() => downloadingList.value.filter(item => item.state === 'paused'))
const totalActive = computed(() => activeDownloads.value.length)
const totalPaused = computed(() => pausedDownloads.value.length)
const totalFinished = computed(() => finishedList.value.length)
```

**当前 Store 方法分类：**

| 方法 | 归属 | 说明 |
|------|------|------|
| `generateId()` | 工具函数 | 可移至 utils |
| `addDownloadTask()` | Composable | 操作 Store 状态 |
| `addBatchDownloadTasks()` | Composable | 调用 addDownloadTask |
| `startDownload()` | **Service** | 业务逻辑 + IPC |
| `pauseDownload()` | Composable | 简单状态更新 |
| `resumeDownload()` | Composable | 简单状态更新 |
| `cancelDownload()` | Composable | 操作 Store 状态 |
| `updateProgress()` | Composable | 接收 IPC 回调 |
| `completeDownload()` | **Service** | 业务逻辑 + 存储 |
| `removeFinishedRecord()` | Composable | 操作 Store 状态 |
| `clearFinishedList()` | Composable | 操作 Store 状态 |
| `saveToStorage()` | **Repository** | 已由 downloadRepository 处理 |
| `loadFromStorage()` | **Repository** | 已由 downloadRepository 处理 |
| `isDownloading()` | Store Getter | 保留 |

#### WallpaperStore (src/stores/modules/wallpaper/)

**actions.ts 业务逻辑分析：**

| 方法 | 归属 | 说明 |
|------|------|------|
| `fetchWallpapers()` | **Service** | API 调用 + 缓存 |
| `loadMoreWallpapers()` | **Service** | API 调用 + 缓存 |
| `resetState()` | Composable | 简单状态重置 |
| `saveCustomParams()` | **Service** | 存储参数 |
| `getSavedParams()` | **Service** | 加载参数 |
| `updateSettings()` | **Service** | 存储设置 |
| `loadSettings()` | **Service** | 加载设置 |

**state.ts 保留状态：**
```typescript
const totalPageData = shallowRef<TotalPageData>({ totalPage: 0, currentPage: 0, sections: [] })
const loading = ref<boolean>(false)
const error = ref<boolean>(false)
const queryParams = ref<GetParams | null>(null)
const savedParams = ref<CustomParams | null>(null)
const settings = reactive<AppSettings>(createDefaultSettings())
```

### 1.3 现有 wallpaperApi.ts 分析

**当前职责：**
1. 创建 axios 实例
2. 内存缓存 (Map + TTL 5分钟 + 最大50条)
3. 取消请求机制 (CancelToken)
4. 环境检测 (开发/生产)
5. API Key 注入 (从 Store 获取)
6. `searchWallpapers()` - 搜索壁纸
7. `getWallpaperDetail()` - 获取详情

**问题：**
- 直接导入 `useWallpaperStore()` 造成循环依赖风险
- 混合了缓存逻辑、API 调用、业务逻辑
- 与 Phase 2 创建的 `apiClient` 功能重复

**重构策略：**
- 保留缓存逻辑（已验证有效）
- 移除直接 Store 依赖，改用 settingsRepository
- 整合到 WallpaperService

### 1.4 组件对 Store 的使用方式

**OnlineWallpaper.vue 使用模式：**
```typescript
// 直接使用 Store
const wallpaperStore = useWallpaperStore()
const downloadStore = useDownloadStore()

// 调用 Store 方法
wallpaperStore.fetchWallpapers(params)
wallpaperStore.loadMoreWallpapers()
wallpaperStore.updateSettings({ downloadPath })
downloadStore.addDownloadTask(task)
downloadStore.startDownload(id)
downloadStore.loadFromStorage()

// 访问 Store 状态
wallpaperStore.loading
wallpaperStore.error
wallpaperStore.totalPageData
wallpaperStore.settings.apiKey
downloadStore.isDownloading(id)
```

**组件迁移策略（阶段 5）：**
- 当前阶段保持组件直接使用 Store
- Store 内部调用 Service，组件无感知
- 阶段 5 再迁移组件使用 Composables

### 1.5 main.ts 中的进度监听

**当前实现：**
```typescript
// main.ts:88-118
window.electronAPI.onDownloadProgress((data) => {
  const { taskId, progress, offset, speed, state, filePath, error } = data
  
  if (error) {
    // 下载失败处理
  } else if (state === 'completed') {
    downloadStore.updateProgress(taskId, 100, offset, 0, filePath)
  } else {
    downloadStore.updateProgress(taskId, progress, offset, speed)
  }
})
```

**重构方案：**
- DownloadService 提供 `onProgress()` 订阅方法
- Composable 或 main.ts 订阅并更新 Store
- 进度监听注册移至 Service 构造函数

---

## 2. Service Layer Design

### 2.1 WallpaperService 设计

**文件路径：** `src/services/wallpaper.service.ts`

**职责：**
- 壁纸搜索 API 调用
- 查询参数持久化
- 缓存管理
- API Key 内部获取

**方法签名：**

```typescript
import type { IpcResponse } from '@/shared/types/ipc'
import type { GetParams, CustomParams, WallpaperItem, WallpaperMeta } from '@/types'

/**
 * 搜索结果类型
 */
export interface WallpaperSearchResult {
  data: WallpaperItem[]
  meta: WallpaperMeta
}

/**
 * WallpaperService 接口
 */
export interface IWallpaperService {
  /**
   * 搜索壁纸
   * @param params 搜索参数
   * @returns 搜索结果
   */
  search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>>
  
  /**
   * 获取壁纸详情
   * @param id 壁纸ID
   * @returns 壁纸详情
   */
  getDetail(id: string): Promise<IpcResponse<WallpaperItem>>
  
  /**
   * 保存查询参数
   * @param params 查询参数
   * @returns 操作结果
   */
  saveQueryParams(params: CustomParams): Promise<IpcResponse<void>>
  
  /**
   * 加载查询参数
   * @returns 查询参数
   */
  loadQueryParams(): Promise<IpcResponse<CustomParams | null>>
  
  /**
   * 清除缓存
   */
  clearCache(): void
}
```

**实现类：**

```typescript
// src/services/wallpaper.service.ts
import { apiClient } from '@/clients'
import { settingsRepository, wallpaperRepository } from '@/repositories'
import type { IpcResponse } from '@/shared/types/ipc'
import type { GetParams, CustomParams, WallpaperItem, WallpaperMeta } from '@/types'

export interface WallpaperSearchResult {
  data: WallpaperItem[]
  meta: WallpaperMeta
}

/**
 * 壁纸业务服务
 * 
 * 职责：
 * - 壁纸搜索 API 调用
 * - 响应缓存
 * - 查询参数持久化
 * - API Key 内部注入
 */
class WallpaperServiceImpl {
  // 缓存配置
  private cache = new Map<string, { data: unknown; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟
  private readonly MAX_CACHE_SIZE = 50

  /**
   * 生成缓存键
   */
  private generateCacheKey(url: string, params?: unknown): string {
    return `${url}:${JSON.stringify(params || {})}`
  }

  /**
   * 从缓存获取
   */
  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    return item.data as T
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: unknown): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * 获取 API Key（内部方法）
   */
  private async getApiKey(): Promise<string | undefined> {
    const result = await settingsRepository.get()
    return result.data?.apiKey || undefined
  }

  /**
   * 搜索壁纸
   */
  async search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>> {
    // 过滤空值参数
    const finalParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        ) as GetParams
      : null

    // 检查缓存
    const cacheKey = this.generateCacheKey('/search', finalParams)
    const cached = this.getFromCache<WallpaperSearchResult>(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

    // 获取 API Key
    const apiKey = await this.getApiKey()

    // 调用 API
    const result = await apiClient.get<WallpaperSearchResult>('/search', finalParams, apiKey)
    
    // 缓存成功结果
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data)
    }

    return result
  }

  /**
   * 获取壁纸详情
   */
  async getDetail(id: string): Promise<IpcResponse<WallpaperItem>> {
    const cacheKey = this.generateCacheKey(`/w/${id}`)
    const cached = this.getFromCache<WallpaperItem>(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

    const apiKey = await this.getApiKey()
    const result = await apiClient.get<WallpaperItem>(`/w/${id}`, undefined, apiKey)
    
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data)
    }

    return result
  }

  /**
   * 保存查询参数
   */
  async saveQueryParams(params: CustomParams): Promise<IpcResponse<void>> {
    // 确保 selector 为 0
    return wallpaperRepository.setQueryParams({ ...params, selector: 0 })
  }

  /**
   * 加载查询参数
   */
  async loadQueryParams(): Promise<IpcResponse<CustomParams | null>> {
    return wallpaperRepository.getQueryParams()
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }
}

export const wallpaperService = new WallpaperServiceImpl()
```

### 2.2 DownloadService 设计

**文件路径：** `src/services/download.service.ts`

**职责：**
- 启动下载任务
- 下载进度订阅
- 已完成记录管理
- 下载目录管理

**方法签名：**

```typescript
import type { IpcResponse } from '@/shared/types/ipc'
import type { DownloadItem, FinishedDownloadItem } from '@/types'

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
}

/**
 * 进度回调类型
 */
export type ProgressCallback = (data: DownloadProgressData) => void

/**
 * 下载任务创建参数
 */
export interface CreateDownloadTask {
  url: string
  filename: string
  saveDir?: string
}

/**
 * IDownloadService 接口
 */
export interface IDownloadService {
  /**
   * 启动下载任务
   * @param taskId 任务ID
   * @param url 下载URL
   * @param filename 保存文件名
   * @returns 下载文件路径
   */
  startDownload(taskId: string, url: string, filename: string): Promise<IpcResponse<string>>
  
  /**
   * 订阅下载进度
   * @param callback 进度回调
   * @returns 取消订阅函数
   */
  onProgress(callback: ProgressCallback): () => void
  
  /**
   * 获取下载目录
   * @returns 下载目录路径（可能需要用户选择）
   */
  getDownloadPath(): Promise<IpcResponse<string>>
  
  /**
   * 保存已完成记录
   * @param item 已完成项
   */
  saveFinishedRecord(item: FinishedDownloadItem): Promise<IpcResponse<void>>
  
  /**
   * 获取已完成记录列表
   */
  getFinishedRecords(): Promise<IpcResponse<FinishedDownloadItem[]>>
  
  /**
   * 删除已完成记录
   * @param id 记录ID
   */
  removeFinishedRecord(id: string): Promise<IpcResponse<void>>
  
  /**
   * 清空已完成记录
   */
  clearFinishedRecords(): Promise<IpcResponse<void>>
}
```

**实现类：**

```typescript
// src/services/download.service.ts
import { electronClient } from '@/clients'
import { settingsRepository, downloadRepository } from '@/repositories'
import type { IpcResponse } from '@/shared/types/ipc'
import type { FinishedDownloadItem } from '@/types'

export interface DownloadProgressData {
  taskId: string
  progress: number
  offset: number
  speed: number
  state: 'downloading' | 'paused' | 'waiting' | 'completed'
  filePath?: string
  error?: string
}

export type ProgressCallback = (data: DownloadProgressData) => void

/**
 * 下载业务服务
 * 
 * 职责：
 * - 下载任务管理
 * - 进度订阅
 * - 已完成记录持久化
 * - 下载目录管理
 */
class DownloadServiceImpl {
  private progressCallbacks = new Set<ProgressCallback>()
  private isListenerRegistered = false

  constructor() {
    // 在构造函数中注册 Electron 进度监听
    this.registerProgressListener()
  }

  /**
   * 注册 Electron 进度监听器
   */
  private registerProgressListener(): void {
    if (this.isListenerRegistered) return
    
    electronClient.onDownloadProgress((data) => {
      // 通知所有订阅者
      this.progressCallbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('[DownloadService] Progress callback error:', error)
        }
      })
    })
    
    this.isListenerRegistered = true
  }

  /**
   * 订阅下载进度
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback)
    
    // 返回取消订阅函数
    return () => {
      this.progressCallbacks.delete(callback)
    }
  }

  /**
   * 获取下载目录
   * 优先从设置获取，否则提示用户选择
   */
  async getDownloadPath(): Promise<IpcResponse<string>> {
    // 从设置获取
    const settingsResult = await settingsRepository.get()
    if (settingsResult.success && settingsResult.data?.downloadPath) {
      return { success: true, data: settingsResult.data.downloadPath }
    }

    // 提示用户选择
    const selectResult = await electronClient.selectFolder()
    if (!selectResult.success || !selectResult.data) {
      return {
        success: false,
        error: { code: 'NO_DOWNLOAD_PATH', message: '未选择下载目录' }
      }
    }

    // 保存到设置
    const newSettings = {
      ...(settingsResult.data || {}),
      downloadPath: selectResult.data
    }
    await settingsRepository.set(newSettings as any)

    return { success: true, data: selectResult.data }
  }

  /**
   * 启动下载任务
   */
  async startDownload(
    taskId: string,
    url: string,
    filename: string
  ): Promise<IpcResponse<string>> {
    // 获取下载目录
    const pathResult = await this.getDownloadPath()
    if (!pathResult.success || !pathResult.data) {
      return {
        success: false,
        error: pathResult.error || { code: 'NO_DOWNLOAD_PATH', message: '未设置下载目录' }
      }
    }

    // 启动下载
    return electronClient.startDownloadTask({
      taskId,
      url,
      filename,
      saveDir: pathResult.data
    })
  }

  /**
   * 保存已完成记录
   */
  async saveFinishedRecord(item: FinishedDownloadItem): Promise<IpcResponse<void>> {
    return downloadRepository.add(item)
  }

  /**
   * 获取已完成记录列表
   */
  async getFinishedRecords(): Promise<IpcResponse<FinishedDownloadItem[]>> {
    return downloadRepository.get()
  }

  /**
   * 删除已完成记录
   */
  async removeFinishedRecord(id: string): Promise<IpcResponse<void>> {
    return downloadRepository.remove(id)
  }

  /**
   * 清空已完成记录
   */
  async clearFinishedRecords(): Promise<IpcResponse<void>> {
    return downloadRepository.clear()
  }
}

export const downloadService = new DownloadServiceImpl()
```

### 2.3 SettingsService 设计

**文件路径：** `src/services/settings.service.ts`

**职责：**
- 应用设置管理
- 设置加载与保存
- 默认设置提供

**方法签名：**

```typescript
import type { IpcResponse } from '@/shared/types/ipc'
import type { AppSettings, WallpaperFit } from '@/types'

/**
 * ISettingsService 接口
 */
export interface ISettingsService {
  /**
   * 获取设置
   */
  get(): Promise<IpcResponse<AppSettings | null>>
  
  /**
   * 保存设置
   * @param settings 完整设置对象
   */
  set(settings: AppSettings): Promise<IpcResponse<void>>
  
  /**
   * 更新部分设置
   * @param partial 部分设置
   */
  update(partial: Partial<AppSettings>): Promise<IpcResponse<void>>
  
  /**
   * 获取默认设置
   */
  getDefaults(): AppSettings
  
  /**
   * 重置为默认设置
   */
  reset(): Promise<IpcResponse<void>>
}
```

**实现类：**

```typescript
// src/services/settings.service.ts
import { settingsRepository } from '@/repositories'
import type { IpcResponse } from '@/shared/types/ipc'
import type { AppSettings, WallpaperFit } from '@/types'

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  downloadPath: '',
  maxConcurrentDownloads: 3,
  apiKey: '',
  wallpaperFit: 'fill' as WallpaperFit,
}

/**
 * 设置业务服务
 * 
 * 职责：
 * - 应用设置管理
 * - 设置加载与保存
 * - 默认设置提供
 */
class SettingsServiceImpl {
  private cachedSettings: AppSettings | null = null

  /**
   * 获取设置
   */
  async get(): Promise<IpcResponse<AppSettings | null>> {
    // 优先返回缓存
    if (this.cachedSettings) {
      return { success: true, data: this.cachedSettings }
    }

    const result = await settingsRepository.get()
    if (result.success && result.data) {
      this.cachedSettings = result.data
    }
    
    return result
  }

  /**
   * 保存设置
   */
  async set(settings: AppSettings): Promise<IpcResponse<void>> {
    const result = await settingsRepository.set(settings)
    if (result.success) {
      this.cachedSettings = { ...settings }
    }
    return result
  }

  /**
   * 更新部分设置
   */
  async update(partial: Partial<AppSettings>): Promise<IpcResponse<void>> {
    // 获取当前设置
    const currentResult = await this.get()
    const current = currentResult.data || this.getDefaults()
    
    // 合并
    const merged: AppSettings = { ...current, ...partial }
    
    return this.set(merged)
  }

  /**
   * 获取默认设置
   */
  getDefaults(): AppSettings {
    return { ...DEFAULT_SETTINGS }
  }

  /**
   * 重置为默认设置
   */
  async reset(): Promise<IpcResponse<void>> {
    this.cachedSettings = null
    return this.set(this.getDefaults())
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedSettings = null
  }
}

export const settingsService = new SettingsServiceImpl()
```

### 2.4 Services 统一导出

**文件路径：** `src/services/index.ts`

```typescript
/**
 * Services 层统一导出
 */

// 壁纸服务
export { wallpaperService, type WallpaperSearchResult } from './wallpaper.service'

// 下载服务
export { downloadService, type DownloadProgressData, type ProgressCallback } from './download.service'

// 设置服务
export { settingsService } from './settings.service'
```

---

## 3. Composable Design

### 3.1 useWallpaperList 设计

**文件路径：** `src/composables/wallpaper/useWallpaperList.ts`

**职责：**
- 协调 WallpaperService 和 WallpaperStore
- 处理加载/错误状态
- 封装搜索和分页逻辑

**返回类型：**

```typescript
import type { Ref, ShallowRef, ComputedRef } from 'vue'
import type { TotalPageData, GetParams, CustomParams } from '@/types'

/**
 * useWallpaperList 返回值
 */
export interface UseWallpaperListReturn {
  // 状态
  /** 壁纸数据（分页） */
  wallpapers: ComputedRef<TotalPageData>
  /** 加载状态 */
  loading: ComputedRef<boolean>
  /** 错误状态 */
  error: ComputedRef<boolean>
  /** 当前查询参数 */
  queryParams: ComputedRef<GetParams | null>
  /** 已保存的自定义参数 */
  savedParams: ComputedRef<CustomParams | null>
  
  // 方法
  /** 搜索壁纸（替换数据） */
  fetch: (params: GetParams | null) => Promise<boolean>
  /** 加载更多（追加数据） */
  loadMore: () => Promise<boolean>
  /** 重置状态 */
  reset: () => void
  /** 保存自定义参数 */
  saveCustomParams: (params: CustomParams) => Promise<boolean>
  /** 加载保存的参数 */
  loadSavedParams: () => Promise<CustomParams | null>
}
```

**实现：**

```typescript
// src/composables/wallpaper/useWallpaperList.ts
import { computed, type ComputedRef } from 'vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import { wallpaperService } from '@/services'
import { useAlert } from '@/composables'
import type { TotalPageData, GetParams, CustomParams } from '@/types'

export interface UseWallpaperListReturn {
  wallpapers: ComputedRef<TotalPageData>
  loading: ComputedRef<boolean>
  error: ComputedRef<boolean>
  queryParams: ComputedRef<GetParams | null>
  savedParams: ComputedRef<CustomParams | null>
  
  fetch: (params: GetParams | null) => Promise<boolean>
  loadMore: () => Promise<boolean>
  reset: () => void
  saveCustomParams: (params: CustomParams) => Promise<boolean>
  loadSavedParams: () => Promise<CustomParams | null>
}

/**
 * 壁纸列表管理 Composable
 * 
 * 封装壁纸搜索、分页、参数保存等逻辑
 */
export function useWallpaperList(): UseWallpaperListReturn {
  const store = useWallpaperStore()
  const { showError } = useAlert()

  /**
   * 搜索壁纸
   */
  const fetch = async (params: GetParams | null): Promise<boolean> => {
    store.loading = true
    store.error = false

    const result = await wallpaperService.search(params)

    if (!result.success) {
      showError(result.error?.message || '获取壁纸失败')
      store.error = true
      store.loading = false
      return false
    }

    // 更新 Store
    store.queryParams = params
    store.totalPageData = {
      sections: [result.data],
      totalPage: result.data.meta.last_page,
      currentPage: result.data.meta.current_page,
    }
    store.loading = false
    
    return true
  }

  /**
   * 加载更多
   */
  const loadMore = async (): Promise<boolean> => {
    if (!store.queryParams || store.loading) {
      return false
    }

    // 检查是否已加载所有页面
    if (store.totalPageData.totalPage > 0 && 
        store.totalPageData.currentPage >= store.totalPageData.totalPage) {
      return false
    }

    store.loading = true

    const nextPage = store.totalPageData.currentPage + 1
    const params = { ...store.queryParams, page: nextPage }

    const result = await wallpaperService.search(params)

    if (!result.success) {
      showError(result.error?.message || '加载更多失败')
      store.loading = false
      return false
    }

    // 追加数据
    store.totalPageData = {
      ...store.totalPageData,
      sections: [...store.totalPageData.sections, result.data],
      currentPage: result.data.meta.current_page,
    }
    store.loading = false
    
    return true
  }

  /**
   * 重置状态
   */
  const reset = (): void => {
    store.totalPageData = { sections: [], totalPage: 0, currentPage: 0 }
    store.queryParams = null
    store.error = false
  }

  /**
   * 保存自定义参数
   */
  const saveCustomParams = async (params: CustomParams): Promise<boolean> => {
    const result = await wallpaperService.saveQueryParams(params)
    
    if (!result.success) {
      showError('保存参数失败')
      return false
    }

    store.savedParams = { ...params, selector: 0 }
    return true
  }

  /**
   * 加载保存的参数
   */
  const loadSavedParams = async (): Promise<CustomParams | null> => {
    if (store.savedParams) {
      return store.savedParams
    }

    const result = await wallpaperService.loadQueryParams()
    if (result.success && result.data) {
      store.savedParams = result.data
      return result.data
    }

    return null
  }

  return {
    // 状态（从 Store 计算）
    wallpapers: computed(() => store.totalPageData),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    queryParams: computed(() => store.queryParams),
    savedParams: computed(() => store.savedParams),
    
    // 方法
    fetch,
    loadMore,
    reset,
    saveCustomParams,
    loadSavedParams,
  }
}
```

### 3.2 useDownload 设计

**文件路径：** `src/composables/download/useDownload.ts`

**职责：**
- 协调 DownloadService 和 DownloadStore
- 管理下载任务生命周期
- 订阅并处理进度更新

**返回类型：**

```typescript
import type { Ref, ComputedRef } from 'vue'
import type { DownloadItem, FinishedDownloadItem } from '@/types'
import type { DownloadProgressData } from '@/services'

/**
 * useDownload 返回值
 */
export interface UseDownloadReturn {
  // 状态
  /** 下载中列表 */
  downloadingList: ComputedRef<DownloadItem[]>
  /** 已完成列表 */
  finishedList: ComputedRef<FinishedDownloadItem[]>
  /** 活跃下载数量 */
  totalActive: ComputedRef<number>
  /** 暂停下载数量 */
  totalPaused: ComputedRef<number>
  /** 已完成数量 */
  totalFinished: ComputedRef<number>
  
  // 方法
  /** 添加下载任务 */
  addTask: (task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>) => Promise<string>
  /** 开始下载 */
  startDownload: (id: string) => Promise<boolean>
  /** 暂停下载 */
  pauseDownload: (id: string) => Promise<void>
  /** 恢复下载 */
  resumeDownload: (id: string) => Promise<void>
  /** 取消下载 */
  cancelDownload: (id: string) => Promise<boolean>
  /** 删除已完成记录 */
  removeFinished: (id: string) => Promise<boolean>
  /** 清空已完成列表 */
  clearFinished: () => Promise<void>
  /** 检查是否在下载中 */
  isDownloading: (wallpaperId: string) => boolean
  /** 加载历史记录 */
  loadHistory: () => Promise<void>
}
```

**实现：**

```typescript
// src/composables/download/useDownload.ts
import { computed, onMounted, onUnmounted, type ComputedRef } from 'vue'
import { useDownloadStore } from '@/stores/modules/download'
import { downloadService, type DownloadProgressData } from '@/services'
import { useAlert } from '@/composables'
import type { DownloadItem, FinishedDownloadItem } from '@/types'

export interface UseDownloadReturn {
  downloadingList: ComputedRef<DownloadItem[]>
  finishedList: ComputedRef<FinishedDownloadItem[]>
  totalActive: ComputedRef<number>
  totalPaused: ComputedRef<number>
  totalFinished: ComputedRef<number>
  
  addTask: (task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>) => Promise<string>
  startDownload: (id: string) => Promise<boolean>
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<boolean>
  removeFinished: (id: string) => Promise<boolean>
  clearFinished: () => Promise<void>
  isDownloading: (wallpaperId: string) => boolean
  loadHistory: () => Promise<void>
}

/**
 * 下载管理 Composable
 * 
 * 封装下载任务的添加、启动、暂停、取消等逻辑
 * 自动订阅下载进度并更新 Store
 */
export function useDownload(): UseDownloadReturn {
  const store = useDownloadStore()
  const { showError, showSuccess } = useAlert()

  // 进度订阅取消函数
  let unsubscribe: (() => void) | null = null

  /**
   * 处理进度更新
   */
  const handleProgress = (data: DownloadProgressData): void => {
    const { taskId, progress, offset, speed, state, filePath, error } = data

    if (error) {
      // 下载失败
      const task = store.downloadingList.find(item => item.id === taskId)
      if (task) {
        task.state = 'waiting'
        task.progress = 0
      }
      showError(`下载失败: ${error}`)
      return
    }

    if (state === 'completed' && filePath) {
      // 下载完成
      store.completeDownload(taskId, filePath)
    } else {
      // 更新进度
      store.updateProgress(taskId, progress, offset, speed, filePath)
    }
  }

  // 组件挂载时订阅进度
  onMounted(() => {
    unsubscribe = downloadService.onProgress(handleProgress)
  })

  // 组件卸载时取消订阅
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })

  /**
   * 添加下载任务
   */
  const addTask = async (
    task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>
  ): Promise<string> => {
    return store.addDownloadTask(task)
  }

  /**
   * 开始下载
   */
  const startDownload = async (id: string): Promise<boolean> => {
    const task = store.downloadingList.find(item => item.id === id)
    if (!task) {
      showError('任务不存在')
      return false
    }

    task.state = 'downloading'
    task.time = new Date().toISOString()

    const result = await downloadService.startDownload(id, task.url, task.filename)

    if (!result.success) {
      task.state = 'waiting'
      showError(result.error?.message || '启动下载失败')
      return false
    }

    return true
  }

  /**
   * 暂停下载
   */
  const pauseDownload = async (id: string): Promise<void> => {
    await store.pauseDownload(id)
  }

  /**
   * 恢复下载
   */
  const resumeDownload = async (id: string): Promise<void> => {
    await store.resumeDownload(id)
  }

  /**
   * 取消下载
   */
  const cancelDownload = async (id: string): Promise<boolean> => {
    return store.cancelDownload(id)
  }

  /**
   * 删除已完成记录
   */
  const removeFinished = async (id: string): Promise<boolean> => {
    const result = await downloadService.removeFinishedRecord(id)
    if (result.success) {
      // 同步更新 Store
      const index = store.finishedList.findIndex(item => item.id === id)
      if (index !== -1) {
        store.finishedList.splice(index, 1)
      }
      return true
    }
    return false
  }

  /**
   * 清空已完成列表
   */
  const clearFinished = async (): Promise<void> => {
    await downloadService.clearFinishedRecords()
    store.finishedList = []
  }

  /**
   * 检查是否在下载中
   */
  const isDownloading = (wallpaperId: string): boolean => {
    return store.isDownloading(wallpaperId)
  }

  /**
   * 加载历史记录
   */
  const loadHistory = async (): Promise<void> => {
    const result = await downloadService.getFinishedRecords()
    if (result.success) {
      store.finishedList = result.data
    }
  }

  return {
    // 状态
    downloadingList: computed(() => store.downloadingList),
    finishedList: computed(() => store.finishedList),
    totalActive: computed(() => store.totalActive),
    totalPaused: computed(() => store.totalPaused),
    totalFinished: computed(() => store.totalFinished),
    
    // 方法
    addTask,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeFinished,
    clearFinished,
    isDownloading,
    loadHistory,
  }
}
```

### 3.3 useSettings 设计

**文件路径：** `src/composables/settings/useSettings.ts`

**职责：**
- 协调 SettingsService 和 WallpaperStore
- 管理设置加载、更新、重置

**返回类型：**

```typescript
import type { ComputedRef } from 'vue'
import type { AppSettings, WallpaperFit } from '@/types'

/**
 * useSettings 返回值
 */
export interface UseSettingsReturn {
  // 状态
  /** 当前设置 */
  settings: ComputedRef<AppSettings>
  
  // 方法
  /** 加载设置 */
  load: () => Promise<boolean>
  /** 更新设置 */
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  /** 重置为默认 */
  reset: () => Promise<boolean>
  /** 获取默认设置 */
  getDefaults: () => AppSettings
}
```

**实现：**

```typescript
// src/composables/settings/useSettings.ts
import { computed, type ComputedRef } from 'vue'
import { useWallpaperStore } from '@/stores/wallpaper'
import { settingsService } from '@/services'
import { useAlert } from '@/composables'
import type { AppSettings, WallpaperFit } from '@/types'

export interface UseSettingsReturn {
  settings: ComputedRef<AppSettings>
  
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}

/**
 * 设置管理 Composable
 * 
 * 封装设置的加载、更新、重置逻辑
 */
export function useSettings(): UseSettingsReturn {
  const store = useWallpaperStore()
  const { showError, showSuccess } = useAlert()

  /**
   * 加载设置
   */
  const load = async (): Promise<boolean> => {
    const result = await settingsService.get()
    
    if (result.success && result.data) {
      Object.assign(store.settings, result.data)
      return true
    }
    
    // 加载失败，使用默认值
    Object.assign(store.settings, settingsService.getDefaults())
    return false
  }

  /**
   * 更新设置
   */
  const update = async (partial: Partial<AppSettings>): Promise<boolean> => {
    // 先更新本地状态
    Object.assign(store.settings, partial)
    
    // 再持久化
    const result = await settingsService.update(partial)
    
    if (!result.success) {
      showError('保存设置失败')
      return false
    }
    
    return true
  }

  /**
   * 重置为默认设置
   */
  const reset = async (): Promise<boolean> => {
    const defaults = settingsService.getDefaults()
    Object.assign(store.settings, defaults)
    
    const result = await settingsService.reset()
    
    if (!result.success) {
      showError('重置设置失败')
      return false
    }
    
    showSuccess('已恢复默认设置')
    return true
  }

  /**
   * 获取默认设置
   */
  const getDefaults = (): AppSettings => {
    return settingsService.getDefaults()
  }

  return {
    settings: computed(() => store.settings),
    load,
    update,
    reset,
    getDefaults,
  }
}
```

### 3.4 Composables 统一导出更新

**文件路径：** `src/composables/index.ts` (更新)

```typescript
/**
 * Composables 统一导出
 */

// Core
export { useAlert, type AlertType, type AlertState, type UseAlertReturn } from './core/useAlert'

// Wallpaper
export { useWallpaperList, type UseWallpaperListReturn } from './wallpaper/useWallpaperList'

// Download
export { useDownload, type UseDownloadReturn } from './download/useDownload'

// Settings
export { useSettings, type UseSettingsReturn } from './settings/useSettings'
```

---

## 4. Store Refactoring Plan

### 4.1 精简后 Store 结构

#### WallpaperStore (精简后)

**src/stores/modules/wallpaper/index.ts:**
```typescript
import { defineStore } from 'pinia'
import { ref, reactive, shallowRef } from 'vue'
import type { TotalPageData, GetParams, CustomParams, AppSettings } from '@/types'

/**
 * 创建默认设置
 */
function createDefaultSettings(): AppSettings {
  return {
    downloadPath: '',
    maxConcurrentDownloads: 3,
    apiKey: '',
    wallpaperFit: 'fill',
  }
}

export const useWallpaperStore = defineStore('wallpaper', () => {
  // ==================== 状态 ====================
  
  /** 壁纸数据（使用 shallowRef 优化性能） */
  const totalPageData = shallowRef<TotalPageData>({
    totalPage: 0,
    currentPage: 0,
    sections: [],
  })
  
  /** 加载状态 */
  const loading = ref<boolean>(false)
  
  /** 错误状态 */
  const error = ref<boolean>(false)
  
  /** 当前查询参数 */
  const queryParams = ref<GetParams | null>(null)
  
  /** 已保存的自定义参数 */
  const savedParams = ref<CustomParams | null>(null)
  
  /** 应用设置 */
  const settings = reactive<AppSettings>(createDefaultSettings())

  // ==================== 方法（由 Composable 调用） ====================
  
  /**
   * 重置状态
   */
  function resetState(): void {
    totalPageData.value = { totalPage: 0, currentPage: 0, sections: [] }
    queryParams.value = null
    error.value = false
  }

  return {
    // 状态
    totalPageData,
    loading,
    error,
    queryParams,
    savedParams,
    settings,
    
    // 方法
    resetState,
  }
})
```

**删除文件：**
- `src/stores/modules/wallpaper/actions.ts` - 逻辑移至 Service + Composable
- `src/stores/modules/wallpaper/storage.ts` - 逻辑移至 WallpaperService
- `src/stores/modules/wallpaper/settings-storage.ts` - 逻辑移至 SettingsService
- `src/stores/modules/wallpaper/state.ts` - 合并到 index.ts

#### DownloadStore (精简后)

**src/stores/modules/download/index.ts:**
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DownloadItem, FinishedDownloadItem } from '@/types'

export const useDownloadStore = defineStore('download', () => {
  // ==================== 状态 ====================
  
  /** 下载中列表 */
  const downloadingList = ref<DownloadItem[]>([])
  
  /** 已完成列表 */
  const finishedList = ref<FinishedDownloadItem[]>([])
  
  // ==================== 计算属性 ====================
  
  const activeDownloads = computed(() => 
    downloadingList.value.filter(item => item.state === 'downloading')
  )
  
  const pausedDownloads = computed(() => 
    downloadingList.value.filter(item => item.state === 'paused')
  )
  
  const totalActive = computed(() => activeDownloads.value.length)
  const totalPaused = computed(() => pausedDownloads.value.length)
  const totalFinished = computed(() => finishedList.value.length)

  // ==================== 方法（由 Composable 调用） ====================

  /**
   * 生成唯一ID
   */
  function generateId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 添加下载任务
   */
  function addDownloadTask(
    task: Omit<DownloadItem, 'id' | 'offset' | 'progress' | 'speed' | 'state'>
  ): string {
    const id = generateId()
    
    const downloadItem: DownloadItem = {
      id,
      ...task,
      offset: 0,
      progress: 0,
      speed: 0,
      state: 'waiting'
    }
    
    downloadingList.value.push(downloadItem)
    console.log('[DownloadStore] 添加下载任务:', id)
    
    return id
  }

  /**
   * 更新下载进度
   */
  function updateProgress(
    id: string, 
    progress: number, 
    offset: number, 
    speed: number,
    filePath?: string
  ): void {
    const task = downloadingList.value.find(item => item.id === id)
    if (task) {
      task.progress = progress
      task.offset = offset
      task.speed = speed
      
      // 如果完成，移动到已完成列表
      if (progress >= 100 && filePath) {
        completeDownload(id, filePath)
      }
    }
  }

  /**
   * 完成下载
   */
  function completeDownload(id: string, filePath?: string): void {
    const index = downloadingList.value.findIndex(item => item.id === id)
    if (index === -1) return
    
    const task = downloadingList.value[index]
    
    // 转换为已完成项
    const finishedItem: FinishedDownloadItem = {
      id: task.id,
      url: task.url,
      filename: task.filename,
      small: task.small,
      resolution: task.resolution,
      size: task.size,
      offset: task.offset,
      progress: 100,
      speed: task.speed,
      state: 'completed',
      path: filePath || task.path || '',
      time: new Date().toISOString(),
      wallpaperId: task.wallpaperId
    }
    
    // 添加到已完成列表头部
    finishedList.value.unshift(finishedItem)
    
    // 从下载列表中移除
    downloadingList.value.splice(index, 1)
    
    console.log('[DownloadStore] 下载完成:', id)
  }

  /**
   * 暂停下载
   */
  function pauseDownload(id: string): void {
    const task = downloadingList.value.find(item => item.id === id)
    if (task && task.state === 'downloading') {
      task.state = 'paused'
    }
  }

  /**
   * 恢复下载
   */
  function resumeDownload(id: string): void {
    const task = downloadingList.value.find(item => item.id === id)
    if (task && task.state === 'paused') {
      task.state = 'downloading'
    }
  }

  /**
   * 取消下载
   */
  function cancelDownload(id: string): boolean {
    const index = downloadingList.value.findIndex(item => item.id === id)
    if (index !== -1) {
      downloadingList.value.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * 检查是否已在下载队列中
   */
  function isDownloading(wallpaperId: string): boolean {
    return downloadingList.value.some(item => item.wallpaperId === wallpaperId)
  }

  return {
    // 状态
    downloadingList,
    finishedList,
    
    // 计算属性
    activeDownloads,
    pausedDownloads,
    totalActive,
    totalPaused,
    totalFinished,
    
    // 方法
    addDownloadTask,
    updateProgress,
    completeDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    isDownloading,
  }
})
```

### 4.2 Store 变更对比

| Store | 变更前 | 变更后 | 变化 |
|-------|--------|--------|------|
| WallpaperStore | 6 文件 (index, state, actions, storage, settings-storage, README) | 1 文件 (index.ts) | 精简 5 文件 |
| DownloadStore | 1 文件 (~340 行) | 1 文件 (~120 行) | 精简 ~220 行 |

---

## 5. Migration Strategy

### 5.1 执行顺序

```
Phase 3 执行计划
================

Step 1: 创建 Service 层
├── 1.1 创建 src/services/wallpaper.service.ts
├── 1.2 创建 src/services/download.service.ts
├── 1.3 创建 src/services/settings.service.ts
└── 1.4 创建 src/services/index.ts (统一导出)

Step 2: 创建 Composable 层
├── 2.1 创建 src/composables/wallpaper/useWallpaperList.ts
├── 2.2 创建 src/composables/download/useDownload.ts
├── 2.3 创建 src/composables/settings/useSettings.ts
└── 2.4 更新 src/composables/index.ts (统一导出)

Step 3: 精简 Store 层
├── 3.1 重构 src/stores/modules/wallpaper/index.ts (合并 state)
├── 3.2 删除 src/stores/modules/wallpaper/actions.ts
├── 3.3 删除 src/stores/modules/wallpaper/storage.ts
├── 3.4 删除 src/stores/modules/wallpaper/settings-storage.ts
├── 3.5 删除 src/stores/modules/wallpaper/state.ts
└── 3.6 精简 src/stores/modules/download/index.ts

Step 4: 更新现有代码引用
├── 4.1 更新 main.ts 中的进度监听（使用 downloadService）
└── 4.2 保留 wallpaperApi.ts（阶段 5 清理）

Step 5: 验证
└── 5.1 运行应用，测试所有功能
```

### 5.2 向后兼容策略

**阶段 3 重点：**
- Service 和 Composable 可供新代码使用
- 现有组件继续直接使用 Store
- Store 内部可调用 Service（渐进迁移）

**阶段 5 完成迁移：**
- 组件迁移使用 Composables
- 删除冗余代码（wallpaperApi.ts）

### 5.3 main.ts 更新

**变更前：**
```typescript
// main.ts
window.electronAPI.onDownloadProgress((data) => {
  downloadStore.updateProgress(...)
})
```

**变更后：**
```typescript
// main.ts
import { downloadService } from '@/services'

// 在 initializeApp 中订阅进度
downloadService.onProgress((data) => {
  downloadStore.updateProgress(...)
})
```

---

## 6. Validation Architecture (Nyquist Validation)

### 6.1 功能验证清单

| 功能 | 验证方法 | 预期结果 |
|------|----------|----------|
| 壁纸搜索 | 搜索关键词，观察列表更新 | 正常显示壁纸 |
| 加载更多 | 滚动到底部，触发加载 | 追加新数据 |
| 参数保存 | 修改搜索参数，保存，重启应用 | 参数恢复 |
| 单个下载 | 点击下载按钮 | 添加到队列，开始下载 |
| 批量下载 | 选择多个壁纸，批量下载 | 全部添加到队列 |
| 下载进度 | 观察下载进度条 | 实时更新 |
| 下载完成 | 等待下载完成 | 移至已完成列表 |
| 暂停/恢复 | 点击暂停/恢复按钮 | 状态正确切换 |
| 取消下载 | 取消下载任务 | 从队列移除 |
| 设置保存 | 修改设置，保存，重启 | 设置恢复 |
| 下载目录选择 | 清空下载目录设置，下载壁纸 | 提示选择目录 |
| 缓存生效 | 相同搜索条件，第二次搜索 | 使用缓存，更快响应 |

### 6.2 边界条件测试

| 场景 | 测试方法 | 预期行为 |
|------|----------|----------|
| 网络错误 | 断网后搜索 | 显示错误提示 |
| API Key 无效 | 输入错误 API Key | 返回 401 错误 |
| 下载目录不可写 | 选择只读目录 | 显示错误提示 |
| 重复下载同一壁纸 | 尝试下载已在队列中的壁纸 | 提示已存在 |
| 存储数据损坏 | 手动修改 settings.json | 使用默认值 |

### 6.3 回归测试要点

**必须验证不变的行为：**
1. 用户操作流程完全一致
2. UI 布局和显示不变
3. 数据持久化行为不变
4. 下载进度回调机制正常
5. 设置保存和加载正常

### 6.4 验证命令

```bash
# 1. 启动应用
npm run dev

# 2. 测试壁纸搜索
#    - 打开应用，输入搜索关键词
#    - 观察壁纸列表更新

# 3. 测试下载功能
#    - 点击壁纸下载
#    - 进入下载中心查看进度
#    - 验证暂停/恢复/取消功能

# 4. 测试设置持久化
#    - 修改设置（下载目录、API Key）
#    - 重启应用
#    - 验证设置已保存

# 5. 测试参数保存
#    - 修改搜索参数
#    - 重启应用
#    - 验证参数已保存
```

---

## 7. Risk Assessment

### 7.1 已识别风险

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| Store 重构破坏响应式 | 高 | 保持状态定义不变，仅移除方法 |
| 进度回调丢失 | 中 | DownloadService 构造函数注册监听 |
| 循环依赖 | 中 | Service 不导入 Store，仅使用 Repository |
| 缓存一致性 | 低 | 保留现有缓存逻辑，仅迁移位置 |

### 7.2 回滚策略

- 每个 Step 完成后验证
- 发现问题立即回滚到上一步
- Git 分支保护：每个 Step 一个提交

---

## RESEARCH COMPLETE

**准备进入规划阶段：** 运行 `/gsd-plan-phase 3` 开始详细执行计划
