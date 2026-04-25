# Phase 2: 数据层抽象 - Research

**Research Date:** 2025-04-25
**Target:** DATA-01 ~ DATA-06 requirements

---

## 一、执行摘要

本阶段目标是创建数据访问抽象层，解耦 Store 与 Electron API 的直接依赖。核心决策已在 CONTEXT.md 中锁定，本文档研究具体实现方案。

### 关键发现

1. **阶段 1 已提供 `IpcResponse<T>` 类型**：可直接复用作为 `Result<T>`
2. **`window.electronAPI` 接口完整定义**：25+ 个方法，已类型化
3. **现有 `src/utils/store.ts` 模式可借鉴**：简洁封装 + 错误处理
4. **存储键已固定**：`appSettings`、`downloadFinishedList`、`wallpaperQueryParams`

### 推荐方案

- **ElectronClient**: 大接口模式，封装所有 `window.electronAPI` 方法
- **ApiClient**: 轻量封装 axios，统一错误处理
- **StoreClient**: 合并到 ElectronClient（通过 `storeGet/storeSet` 等方法）
- **Repositories**: 按 domain 划分（Settings、Download、Wallpaper）

---

## 二、需求逐项研究

### DATA-01: 创建 ElectronClient

#### 现状分析

**源文件**: `electron/preload/index.ts:7-84`

现有 `ElectronAPI` 接口定义了 25+ 个方法：

| 分类 | 方法 |
|------|------|
| 文件操作 | `selectFolder`, `readDirectory`, `openFolder`, `deleteFile` |
| 下载管理 | `downloadWallpaper`, `startDownloadTask`, `onDownloadProgress`, `removeDownloadProgressListener` |
| 壁纸设置 | `setWallpaper` |
| 设置管理 | `saveSettings`, `loadSettings` |
| API 代理 | `wallhavenApiRequest` |
| 窗口控制 | `minimizeWindow`, `maximizeWindow`, `closeWindow`, `isMaximized` |
| Store 操作 | `storeGet`, `storeSet`, `storeDelete`, `storeClear` |
| 缓存管理 | `clearAppCache`, `getCacheInfo` |

#### 技术方案

**文件位置**: `src/clients/electron.client.ts`

**设计要点**:

1. **大接口模式**：封装所有方法，不拆分多个 Client
2. **返回类型统一**：所有方法返回 `Promise<IpcResponse<T>>`
3. **错误转换**：捕获 IPC 错误，转换为 `IpcResponse.error`
4. **单例导出**：`export const electronClient = new ElectronClientImpl()`

**实现模式**（参考现有 `store.ts`）:

```typescript
// src/clients/electron.client.ts
import type { IpcResponse } from '@/shared/types/ipc'

class ElectronClientImpl {
  // Store 操作
  async storeGet<T>(key: string): Promise<IpcResponse<T | null>> {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: { code: 'ELECTRON_UNAVAILABLE', message: 'Electron API not available' } }
      }
      
      const result = await window.electronAPI.storeGet(key)
      if (result.success) {
        return { success: true, data: result.value as T }
      }
      return { success: false, error: { code: 'STORE_GET_ERROR', message: result.error || 'Unknown error' } }
    } catch (error) {
      return { success: false, error: { code: 'STORE_GET_EXCEPTION', message: String(error) } }
    }
  }

  // 文件操作
  async selectFolder(): Promise<IpcResponse<string | null>> {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: { code: 'ELECTRON_UNAVAILABLE', message: 'Electron API not available' } }
      }
      const path = await window.electronAPI.selectFolder()
      return { success: true, data: path }
    } catch (error) {
      return { success: false, error: { code: 'SELECT_FOLDER_ERROR', message: String(error) } }
    }
  }

  // ... 其他方法类似

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI
  }
}

export const electronClient = new ElectronClientImpl()
```

**存储键常量提取**:

```typescript
// src/clients/constants.ts
export const STORAGE_KEYS = {
  APP_SETTINGS: 'appSettings',
  DOWNLOAD_FINISHED_LIST: 'downloadFinishedList',
  WALLPAPER_QUERY_PARAMS: 'wallpaperQueryParams',
} as const
```

#### 风险点

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 方法数量多，漏封装 | 中 | 从 `ElectronAPI` 接口逐项实现，IDE 提示完整 |
| 返回类型定义复杂 | 低 | 复用 `src/shared/types/ipc.ts` 中的类型 |
| 进度监听器管理 | 中 | 提供 `onDownloadProgress`/`removeDownloadProgressListener` 封装 |

---

### DATA-02: 创建 ApiClient

#### 现状分析

**源文件**: `src/services/wallpaperApi.ts`

现有实现特点：
- 使用 axios 实例，baseURL `/api`
- 包含缓存逻辑（Map + TTL）
- 包含业务逻辑（从 Store 获取 API Key）
- 包含环境判断（`isProduction()`）

**问题**：
- 职责混杂（HTTP + 缓存 + 业务逻辑）
- API Key 从 Store 获取（违反分层原则）

#### 技术方案

**文件位置**: `src/clients/api.client.ts`

**设计要点**:

1. **纯 HTTP 封装**：不包含缓存、业务逻辑
2. **统一错误处理**：返回 `IpcResponse<T>` 格式
3. **两种模式**：
   - 开发环境：直接 axios 请求（Vite 代理）
   - 生产环境：通过 Electron IPC 代理

**实现模式**:

```typescript
// src/clients/api.client.ts
import axios, { type AxiosRequestConfig } from 'axios'
import type { IpcResponse } from '@/shared/types/ipc'

class ApiClientImpl {
  private axiosInstance = axios.create({
    baseURL: '/api',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  })

  async get<T>(url: string, params?: Record<string, unknown>, apiKey?: string): Promise<IpcResponse<T>> {
    try {
      if (this.isProduction() && window.electronAPI) {
        // 生产环境：通过 Electron IPC 代理
        const result = await window.electronAPI.wallhavenApiRequest({
          endpoint: url,
          params,
        })
        
        if (result.success) {
          return { success: true, data: result.data as T }
        }
        return { success: false, error: { code: 'API_ERROR', message: result.error || 'Unknown error' } }
      }

      // 开发环境：直接 axios 请求
      const config: AxiosRequestConfig = { params }
      if (apiKey) {
        config.headers = { 'X-API-Key': apiKey }
      }
      
      const response = await this.axiosInstance.get<T>(url, config)
      return { success: true, data: response.data }
    } catch (error: any) {
      return { 
        success: false, 
        error: { 
          code: this.getErrorCode(error),
          message: error.message || 'Network error' 
        } 
      }
    }
  }

  private isProduction(): boolean {
    return typeof window !== 'undefined' && 
           !!window.electronAPI && 
           import.meta.env.PROD
  }

  private getErrorCode(error: any): string {
    if (error.code === 'ECONNABORTED') return 'TIMEOUT'
    if (error.response?.status === 401) return 'UNAUTHORIZED'
    if (error.response?.status === 403) return 'FORBIDDEN'
    if (error.response?.status === 404) return 'NOT_FOUND'
    if (error.response?.status >= 500) return 'SERVER_ERROR'
    return 'NETWORK_ERROR'
  }
}

export const apiClient = new ApiClientImpl()
```

#### 与现有 wallpaperApi.ts 的关系

**阶段 2 策略**:
- 保留 `wallpaperApi.ts`，但标记为 deprecated
- 新建 `api.client.ts`
- 迁移在阶段 3 进行

**阶段 3 迁移计划**:
- 移除 `wallpaperApi.ts` 中的缓存逻辑（由 Service 层负责）
- 移除 API Key 获取逻辑（由 Service 层注入）
- 保留 `searchWallpapers`、`getWallpaperDetail` 作为高阶方法

---

### DATA-03: 创建 StoreClient

#### 现状分析

**源文件**: `src/utils/store.ts`

现有实现：
- `storeGet<T>(key)` → `Promise<T | null>`
- `storeSet(key, value)` → `Promise<boolean>`
- `storeDelete(key)` → `Promise<boolean>`
- `storeClear()` → `Promise<boolean>`

特点：
- 返回值不一致（`T | null` vs `boolean`）
- 错误通过 `console.error` 记录，返回 `null`/`false`
- 已有 JSON 序列化处理（解决 Vue proxy 问题）

#### 技术方案

**决策**: 合并到 ElectronClient，不单独创建 StoreClient

**理由**:
1. Store 操作本质是 IPC 调用，属于 ElectronClient 职责
2. 减少文件数量，简化依赖链
3. 现有 `store.ts` 只是 `window.electronAPI.storeXxx` 的简单封装

**ElectronClient 中 Store 方法签名**:

```typescript
// ElectronClient 内的 Store 方法
async storeGet<T>(key: string): Promise<IpcResponse<T | null>>
async storeSet(key: string, value: unknown): Promise<IpcResponse<void>>
async storeDelete(key: string): Promise<IpcResponse<void>>
async storeClear(): Promise<IpcResponse<void>>
```

**删除 store.ts 时机**: 阶段 3 Store 迁移完成后

---

### DATA-04: 创建 SettingsRepository

#### 现状分析

**相关文件**:
- `src/stores/modules/wallpaper/settings-storage.ts`
- 存储键: `appSettings`
- 数据类型: `AppSettings`

**现有实现**:

```typescript
// settings-storage.ts
export async function saveSettingsToStorage(settings: AppSettings): Promise<void>
export async function getSettingsFromStorage(): Promise<AppSettings | null>
```

**问题**:
- 错误处理不完善（catch 后只 console.error）
- 无返回值确认操作结果

#### 技术方案

**文件位置**: `src/repositories/settings.repository.ts`

**设计要点**:
1. 返回 `Promise<IpcResponse<T>>`
2. 方法命名: `get`/`set`
3. 不缓存数据
4. 不处理默认值（由 Service 层负责）

**实现模式**:

```typescript
// src/repositories/settings.repository.ts
import type { IpcResponse } from '@/shared/types/ipc'
import type { AppSettings } from '@/types'
import { electronClient } from '@/clients/electron.client'
import { STORAGE_KEYS } from '@/clients/constants'

export const settingsRepository = {
  /**
   * 获取应用设置
   * 返回 null 表示未设置
   */
  async get(): Promise<IpcResponse<AppSettings | null>> {
    return electronClient.storeGet<AppSettings>(STORAGE_KEYS.APP_SETTINGS)
  },

  /**
   * 保存应用设置
   */
  async set(settings: AppSettings): Promise<IpcResponse<void>> {
    return electronClient.storeSet(STORAGE_KEYS.APP_SETTINGS, settings)
  },

  /**
   * 删除应用设置
   */
  async delete(): Promise<IpcResponse<void>> {
    return electronClient.storeDelete(STORAGE_KEYS.APP_SETTINGS)
  },
}
```

---

### DATA-05: 创建 DownloadRepository

#### 现状分析

**相关文件**:
- `src/stores/modules/download/index.ts`
- 存储键: `downloadFinishedList`
- 数据类型: `FinishedDownloadItem[]`

**现有 Store 直接使用**:
```typescript
// download/index.ts:284-287
await storeSet('downloadFinishedList', finishedList.value)

// download/index.ts:294-300
const saved = await storeGet<FinishedDownloadItem[]>('downloadFinishedList')
```

**问题**:
- Store 直接操作持久化
- 无独立的数据访问层

#### 技术方案

**文件位置**: `src/repositories/download.repository.ts`

**设计要点**:
1. 只管理下载记录（finishedList），不处理下载执行
2. 下载执行（`startDownloadTask` IPC）由阶段 3 DownloadService 处理
3. 方法: `get`/`set`/`add`/`remove`/`clear`

**实现模式**:

```typescript
// src/repositories/download.repository.ts
import type { IpcResponse } from '@/shared/types/ipc'
import type { FinishedDownloadItem } from '@/types'
import { electronClient } from '@/clients/electron.client'
import { STORAGE_KEYS } from '@/clients/constants'

const MAX_FINISHED_ITEMS = 50

export const downloadRepository = {
  /**
   * 获取已完成的下载列表
   */
  async get(): Promise<IpcResponse<FinishedDownloadItem[]>> {
    const result = await electronClient.storeGet<FinishedDownloadItem[]>(STORAGE_KEYS.DOWNLOAD_FINISHED_LIST)
    if (result.success) {
      return { success: true, data: result.data || [] }
    }
    return result as IpcResponse<FinishedDownloadItem[]>
  },

  /**
   * 保存已完成下载列表
   */
  async set(items: FinishedDownloadItem[]): Promise<IpcResponse<void>> {
    // 限制列表长度
    const limitedItems = items.slice(0, MAX_FINISHED_ITEMS)
    return electronClient.storeSet(STORAGE_KEYS.DOWNLOAD_FINISHED_LIST, limitedItems)
  },

  /**
   * 添加已完成下载项（添加到列表头部）
   */
  async add(item: FinishedDownloadItem): Promise<IpcResponse<void>> {
    const result = await this.get()
    if (!result.success) return result as IpcResponse<void>
    
    const items = [item, ...result.data].slice(0, MAX_FINISHED_ITEMS)
    return this.set(items)
  },

  /**
   * 移除指定下载项
   */
  async remove(id: string): Promise<IpcResponse<void>> {
    const result = await this.get()
    if (!result.success) return result as IpcResponse<void>
    
    const items = result.data.filter(item => item.id !== id)
    return this.set(items)
  },

  /**
   * 清空已完成下载列表
   */
  async clear(): Promise<IpcResponse<void>> {
    return electronClient.storeDelete(STORAGE_KEYS.DOWNLOAD_FINISHED_LIST)
  },
}
```

**边界说明**:
- 下载执行（`startDownloadTask`）不在 Repository 中
- 下载进度监听（`onDownloadProgress`）不在 Repository 中
- 这些由阶段 3 DownloadService 通过 ElectronClient 处理

---

### DATA-06: 创建 WallpaperRepository

#### 现状分析

**相关文件**:
- `src/stores/modules/wallpaper/storage.ts`
- 存储键: `wallpaperQueryParams`
- 数据类型: `CustomParams`

**现有实现**:
```typescript
export async function saveCustomParamsToStorage(params: CustomParams): Promise<void>
export async function getSavedParamsFromStorage(): Promise<CustomParams | null>
```

#### 技术方案

**文件位置**: `src/repositories/wallpaper.repository.ts`

**设计要点**:
1. 管理查询参数持久化
2. 不处理 API 调用（由 Service 层通过 ApiClient 处理）
3. API Key 由 SettingsRepository 获取，Service 层注入

**实现模式**:

```typescript
// src/repositories/wallpaper.repository.ts
import type { IpcResponse } from '@/shared/types/ipc'
import type { CustomParams } from '@/types'
import { electronClient } from '@/clients/electron.client'
import { STORAGE_KEYS } from '@/clients/constants'

export const wallpaperRepository = {
  /**
   * 获取保存的查询参数
   */
  async getQueryParams(): Promise<IpcResponse<CustomParams | null>> {
    return electronClient.storeGet<CustomParams>(STORAGE_KEYS.WALLPAPER_QUERY_PARAMS)
  },

  /**
   * 保存查询参数
   */
  async setQueryParams(params: CustomParams): Promise<IpcResponse<void>> {
    return electronClient.storeSet(STORAGE_KEYS.WALLPAPER_QUERY_PARAMS, params)
  },

  /**
   * 删除查询参数
   */
  async deleteQueryParams(): Promise<IpcResponse<void>> {
    return electronClient.storeDelete(STORAGE_KEYS.WALLPAPER_QUERY_PARAMS)
  },
}
```

**注意**:
- 壁纸搜索 API 调用由 Service 层处理
- 本 Repository 仅处理持久化参数

---

## 三、依赖关系

### 创建顺序

```
1. src/clients/constants.ts        (存储键常量)
           ↓
2. src/clients/electron.client.ts  (ElectronClient)
           ↓
3. src/clients/api.client.ts       (ApiClient，无依赖)
           ↓
4. src/clients/index.ts            (统一导出)
           ↓
5. src/repositories/settings.repository.ts
           ↓
6. src/repositories/download.repository.ts
           ↓
7. src/repositories/wallpaper.repository.ts
           ↓
8. src/repositories/index.ts       (统一导出)
```

### 文件结构

```
src/
├── clients/
│   ├── index.ts                   # 统一导出
│   ├── constants.ts               # 存储键常量
│   ├── electron.client.ts         # ElectronClient
│   └── api.client.ts              # ApiClient
│
├── repositories/
│   ├── index.ts                   # 统一导出
│   ├── settings.repository.ts     # SettingsRepository
│   ├── download.repository.ts     # DownloadRepository
│   └── wallpaper.repository.ts    # WallpaperRepository
│
├── utils/
│   └── store.ts                   # [阶段 3 删除]
│
├── services/
│   └── wallpaperApi.ts            # [阶段 3 重构]
```

---

## 四、类型复用分析

### 阶段 1 已创建类型

**文件**: `src/shared/types/ipc.ts`

可复用类型：
- `IpcResponse<T>` → 作为 `Result<T>` 使用
- `IpcErrorInfo` → 错误信息结构
- `IPC_CHANNELS` → IPC 通道名称常量

**文件**: `src/errors/`

可复用类型：
- `AppError` → 错误类基类
- `ErrorCodes` → 错误码常量
- `StoreError`, `NetworkError` → 特定错误类

### 类型映射

| 新类型 | 来源 | 说明 |
|--------|------|------|
| `Result<T>` | `IpcResponse<T>` | 别名或直接使用 |
| `ElectronClient` 方法返回 | `Promise<IpcResponse<T>>` | 统一格式 |
| `Repository` 方法返回 | `Promise<IpcResponse<T>>` | 与 Client 层一致 |

---

## 五、风险评估

### 高风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 方法签名遗漏 | 编译错误 | 对照 `ElectronAPI` 接口逐项实现 |
| 返回类型不一致 | 调用方需适配 | 统一使用 `IpcResponse<T>` |

### 中风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `store.ts` 被提前删除 | 现有 Store 崩溃 | 阶段 2 不删除，阶段 3 迁移后再删 |
| ApiClient 与 wallpaperApi 冲突 | 导入混乱 | 阶段 2 只新建，不修改现有文件 |

### 低风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 类型定义不完整 | `any` 类型泄露 | 从 `src/types/index.ts` 导入 |
| 存储键拼写错误 | 数据丢失 | 使用常量 `STORAGE_KEYS` |

---

## 六、验收清单

### 功能验收

- [ ] ElectronClient 封装所有 `window.electronAPI` 方法
- [ ] ElectronClient 所有方法返回 `Promise<IpcResponse<T>>`
- [ ] ApiClient 支持 dev/prod 两种模式
- [ ] ApiClient 返回 `Promise<IpcResponse<T>>`
- [ ] SettingsRepository 提供 `get/set/delete` 方法
- [ ] DownloadRepository 提供 `get/set/add/remove/clear` 方法
- [ ] WallpaperRepository 提供 `getQueryParams/setQueryParams/deleteQueryParams` 方法

### 类型验收

- [ ] 所有方法有明确返回类型
- [ ] 无 `any` 类型（允许 `unknown`）
- [ ] 复用阶段 1 `IpcResponse<T>` 类型

### 兼容性验收

- [ ] 现有功能正常运行（Store 未迁移）
- [ ] `src/utils/store.ts` 保留未删除
- [ ] `src/services/wallpaperApi.ts` 保留未修改

---

## 七、阶段 3 预留接口

### Store 迁移接口

阶段 3 Store 迁移时，将替换：
```typescript
// 现有
import { storeGet, storeSet } from '@/utils/store'

// 替换为
import { settingsRepository } from '@/repositories'
const result = await settingsRepository.get()
```

### Service 层接口

阶段 3 Service 将使用：
```typescript
// WallpaperService 示例
class WallpaperServiceImpl {
  constructor(
    private apiClient: ApiClient,
    private wallpaperRepo: WallpaperRepository,
    private settingsRepo: SettingsRepository,
  ) {}

  async search(params: GetParams) {
    const { data: settings } = await this.settingsRepo.get()
    const apiKey = settings?.apiKey
    return this.apiClient.get('/search', params, apiKey)
  }
}
```

---

## 八、参考资料

### 现有代码

| 文件 | 用途 |
|------|------|
| `electron/preload/index.ts` | ElectronAPI 接口定义 |
| `src/shared/types/ipc.ts` | IPC 类型和响应格式 |
| `src/utils/store.ts` | 现有 store 封装模式 |
| `src/stores/modules/wallpaper/settings-storage.ts` | 设置存储模式 |
| `src/stores/modules/download/index.ts` | 下载存储模式 |

### 设计决策

| 决策 ID | 内容 |
|---------|------|
| D-01 | ElectronClient 大接口模式 |
| D-02 | Clients 返回 `Result<T>`（`IpcResponse<T>`） |
| D-03 | Clients 单例模式 |
| D-04 | Repository 返回 `Promise<Result<T>>` |
| D-05 | Repository 方法命名 `get/set/delete` |
| D-06 | Repository 不缓存数据 |
| D-07 | 阶段 2 仅新建，不迁移 |
| D-08 | 删除 `store.ts`（阶段 3） |
| D-09 | 重构 `wallpaperApi.ts`（阶段 3） |
| D-10 | Repository 只做 CRUD |
| D-11 | DownloadRepository 只存储记录 |
| D-12 | API Key 由 Service 层处理 |

---

## 九、结论

### 可行性评估：✅ 高

1. **类型基础完备**：阶段 1 已提供 `IpcResponse<T>` 和错误类
2. **接口定义清晰**：`ElectronAPI` 接口完整，可直接实现
3. **现有模式可借鉴**：`store.ts` 已展示简单封装模式
4. **风险可控**：阶段 2 不修改现有代码，只新增文件

### 关键建议

1. **优先实现 ElectronClient**：它是 Repository 层的依赖
2. **统一返回格式**：所有方法返回 `IpcResponse<T>`
3. **保留现有文件**：`store.ts` 和 `wallpaperApi.ts` 阶段 3 再处理
4. **增量验证**：每完成一个 Client/Repository，运行现有功能确保无破坏

---

*Research Complete*
