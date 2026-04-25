# Phase 3: 业务层与组合层 - Context

**Gathered:** 2025-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

实现业务逻辑抽象，简化 Store，建立清晰的分层架构。包括：
- 创建 `WallpaperService`、`DownloadService`、`SettingsService` 三个服务层
- 创建 `useWallpaperList`、`useDownload`、`useSettings` 三个 composables
- 重构 Store，移除业务逻辑，仅保留响应式状态

**核心约束**：
- 所有用户操作逻辑保持不变
- 界面布局和 DOM 结构不变
- 功能行为完全一致
- 存储键名不变（`appSettings`、`downloadFinishedList`、`wallpaperQueryParams`）

**阶段边界**：
- 本阶段创建 Service 层和 Composable 层，迁移 Store 中的业务逻辑
- Store 仅保留响应式状态和简单 getter
- 组件暂时保持不变，阶段 5 再迁移组件使用新 Composables

</domain>

<decisions>
## Implementation Decisions

### Service 层职责划分

- **D-01:** 采用重 Service 模式
  - Service 包含业务逻辑 + 缓存协调 + API Key 注入
  - Composable 仅协调 Service 和 Store
  - Service 是业务逻辑的主要承载者

- **D-02:** API Key 由 Service 内部获取
  - WallpaperService 内部直接调用 settingsRepository 获取 API Key
  - 调用方无需传入 API Key
  - 保持调用简洁

- **D-03:** API 响应缓存保留在现有 ApiClient
  - 缓存逻辑保留在 wallpaperApi.ts（已实现）
  - Service 调用 apiClient，自动享受缓存
  - 不重复实现缓存

### Composable 接口设计

- **D-04:** 返回类型化对象
  - 每个 Composable 返回特定类型的状态对象和方法
  - 例如：`{ wallpapers, loading, fetch, loadMore }`
  - 与现有 `useAlert` 模式一致

- **D-05:** Composable 处理错误
  - Composable 捕获 Service 错误
  - 自动调用 useAlert 显示错误提示
  - 返回 boolean 表示操作成功/失败

- **D-06:** Composable + Store 并存
  - Composable 和组件都可以直接使用 Store
  - Composable 主要封装复杂操作流程
  - 组件可灵活选择使用方式

### Store 精简策略

- **D-07:** 激进精简 Store
  - 大幅移除 Store 逻辑，由 Composable 管理
  - Store 仅保留必须持久化的状态和简单 getter
  - 业务逻辑完全移除

- **D-08:** 业务逻辑完全移除到 Service
  - 所有业务逻辑方法移到 Service
  - Store 仅保留纯状态和简单 getter
  - Store 不再直接调用 API/IPC

- **D-09:** Store 保留响应式状态
  - Store 继续使用 reactive/ref
  - Composable 从 Store 获取响应式状态
  - 响应式系统保持不变

### 下载进度处理

- **D-10:** DownloadService 提供进度订阅方法
  - Service 封装 Electron 进度回调
  - 提供 `onProgress(callback)` 订阅方法
  - Composable 订阅进度并更新 Store

### Claude's Discretion

- Service 方法的具体命名和参数签名
- Composable 返回类型的具体定义
- Store 精简后的最终结构
- 进度订阅的具体实现方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表（BIZ-01 ~ BIZ-07）
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 前置阶段
- `.planning/phases/01-infrastructure-typesafety/01-CONTEXT.md` — 阶段 1 上下文
- `.planning/phases/02-data-layer-abstraction/02-CONTEXT.md` — 阶段 2 上下文

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、数据流、关键模式
- `.planning/codebase/CONCERNS.md` — 技术债务清单

### 关键代码文件

#### 已创建的基础设施（阶段 1-2）
- `src/clients/electron.client.ts` — Electron IPC 封装
- `src/clients/api.client.ts` — HTTP 客户端封装
- `src/clients/constants.ts` — 存储键常量
- `src/repositories/settings.repository.ts` — 设置仓储
- `src/repositories/download.repository.ts` — 下载仓储
- `src/repositories/wallpaper.repository.ts` — 壁纸仓储
- `src/composables/core/useAlert.ts` — Alert composable（参考模式）

#### 需要重构的文件
- `src/stores/modules/download/index.ts` — 下载 Store（约 340 行）
- `src/stores/modules/wallpaper/index.ts` — 壁纸 Store 入口
- `src/stores/modules/wallpaper/actions.ts` — 壁纸 Actions（业务逻辑）
- `src/stores/modules/wallpaper/storage.ts` — 参数存储
- `src/stores/modules/wallpaper/settings-storage.ts` — 设置存储
- `src/services/wallpaperApi.ts` — 现有 API 服务（混合逻辑）

#### 研究报告
- `.planning/research/SUMMARY.md` — 重构策略综合建议
- `.planning/research/PITFALLS.md` — 重构陷阱警告

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### 已创建的 Clients 和 Repositories
- `electronClient` — 封装所有 IPC 方法，返回 `IpcResponse<T>`
- `apiClient` — 封装 HTTP 请求，支持开发/生产模式
- `settingsRepository` — get/set/delete 设置
- `downloadRepository` — get/set/add/remove/clear 下载记录
- `wallpaperRepository` — getQueryParams/setQueryParams 查询参数
- `STORAGE_KEYS` — 统一存储键常量

#### 已创建的 Composable
- `useAlert` — Alert 状态管理，返回 `{ alert, showAlert, hideAlert, showSuccess, showError, showWarning, showInfo }`
- 可作为其他 Composable 的参考模式

### Established Patterns

#### 现有 Store 模式
- Pinia Setup Store 模式（defineStore + 函数式）
- `shallowRef` 用于大数据（wallpaper list）
- `reactive` 用于设置对象
- 分离文件：index.ts / state.ts / actions.ts / storage.ts

#### 现有 API 模式
- `wallpaperApi.ts` 混合了 HTTP 客户端、缓存、API Key 注入
- 缓存：Map + TTL（5分钟）+ 最大条目限制（50）
- 取消机制：CancelToken

### Integration Points

#### Store 到 Service 的迁移点
- `downloadStore.startDownload()` — 选择目录、启动下载 → DownloadService
- `downloadStore.updateProgress()` — 进度更新 → 由 Composable 订阅
- `downloadStore.completeDownload()` — 完成处理 → DownloadService
- `wallpaperStore.actions.fetchWallpapers()` — API 调用 → WallpaperService
- `wallpaperStore.actions.saveCustomParams()` — 存储 → WallpaperService

#### 现有存储文件可删除
- `src/stores/modules/wallpaper/storage.ts` — 迁移到 WallpaperService
- `src/stores/modules/wallpaper/settings-storage.ts` — 迁移到 SettingsService

### 需要新建的文件
- `src/services/wallpaper.service.ts` — 壁纸业务逻辑
- `src/services/download.service.ts` — 下载业务逻辑
- `src/services/settings.service.ts` — 设置业务逻辑
- `src/composables/wallpaper/useWallpaperList.ts` — 壁纸列表 composable
- `src/composables/download/useDownload.ts` — 下载管理 composable
- `src/composables/settings/useSettings.ts` — 设置管理 composable

</code_context>

<specifics>
## Specific Ideas

### 目录结构建议

```
src/
├── services/                    # 新建 Service 层
│   ├── index.ts                # 统一导出
│   ├── wallpaper.service.ts    # 壁纸业务逻辑
│   ├── download.service.ts     # 下载业务逻辑
│   └── settings.service.ts     # 设置业务逻辑
│
├── composables/                 # 扩展 Composables
│   ├── index.ts                # 统一导出（更新）
│   ├── core/
│   │   └── useAlert.ts         # 已有
│   ├── wallpaper/
│   │   └── useWallpaperList.ts # 新建
│   ├── download/
│   │   └── useDownload.ts      # 新建
│   └── settings/
│       └── useSettings.ts      # 新建
│
├── stores/                      # 精简后的 Stores
│   ├── wallpaper.ts            # 精简后
│   └── modules/
│       ├── download/
│       │   └── index.ts        # 精简后
│       └── wallpaper/
│           ├── index.ts        # 精简后
│           └── state.ts        # 仅状态
```

### WallpaperService 示例

```typescript
// src/services/wallpaper.service.ts
import { apiClient } from '@/clients'
import { settingsRepository } from '@/repositories'
import type { GetParams, CustomParams } from '@/types'

class WallpaperServiceImpl {
  /**
   * 搜索壁纸
   */
  async search(params: GetParams | null): Promise<IpcResponse<any>> {
    // 内部获取 API Key
    const settingsResult = await settingsRepository.get()
    const apiKey = settingsResult.data?.apiKey

    return apiClient.get('/search', params, apiKey || undefined)
  }

  /**
   * 加载更多
   */
  async loadMore(params: GetParams, page: number): Promise<IpcResponse<any>> {
    return this.search({ ...params, page })
  }

  /**
   * 保存查询参数
   */
  async saveQueryParams(params: CustomParams): Promise<IpcResponse<void>> {
    return wallpaperRepository.setQueryParams(params)
  }

  /**
   * 加载查询参数
   */
  async loadQueryParams(): Promise<IpcResponse<CustomParams | null>> {
    return wallpaperRepository.getQueryParams()
  }
}

export const wallpaperService = new WallpaperServiceImpl()
```

### DownloadService 示例

```typescript
// src/services/download.service.ts
import { electronClient, settingsRepository } from '@/clients'
import type { DownloadItem, FinishedDownloadItem } from '@/types'

type ProgressCallback = (data: { id: string, progress: number, offset: number, speed: number }) => void

class DownloadServiceImpl {
  private progressCallbacks: Set<ProgressCallback> = new Set()

  constructor() {
    // 初始化时注册 Electron 进度监听
    electronClient.onDownloadProgress((data) => {
      this.progressCallbacks.forEach(cb => cb(data))
    })
  }

  /**
   * 订阅下载进度
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback)
    return () => this.progressCallbacks.delete(callback)
  }

  /**
   * 启动下载
   */
  async startDownload(task: DownloadItem): Promise<IpcResponse<string>> {
    // 获取下载目录
    const settingsResult = await settingsRepository.get()
    let downloadPath = settingsResult.data?.downloadPath

    if (!downloadPath) {
      const folderResult = await electronClient.selectFolder()
      if (!folderResult.success || !folderResult.data) {
        return { success: false, error: { code: 'NO_DOWNLOAD_PATH', message: '未选择下载目录' } }
      }
      downloadPath = folderResult.data
      // 保存设置
      await settingsRepository.set({ ...settingsResult.data, downloadPath } as any)
    }

    return electronClient.startDownloadTask({
      taskId: task.id,
      url: task.url,
      filename: task.filename,
      saveDir: downloadPath,
    })
  }

  /**
   * 保存已完成记录
   */
  async saveFinishedRecord(item: FinishedDownloadItem): Promise<IpcResponse<void>> {
    return downloadRepository.add(item)
  }
}

export const downloadService = new DownloadServiceImpl()
```

### useWallpaperList 示例

```typescript
// src/composables/wallpaper/useWallpaperList.ts
import { useWallpaperStore } from '@/stores/wallpaper'
import { wallpaperService } from '@/services'
import { useAlert } from '@/composables'

export interface UseWallpaperListReturn {
  // 状态
  wallpapers: ShallowRef<TotalPageData>
  loading: Ref<boolean>
  error: Ref<boolean>

  // 方法
  fetch: (params: GetParams | null) => Promise<boolean>
  loadMore: () => Promise<boolean>
  reset: () => void
}

export function useWallpaperList(): UseWallpaperListReturn {
  const store = useWallpaperStore()
  const { showError } = useAlert()

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

    store.totalPageData = {
      sections: [result.data],
      totalPage: result.data.meta.last_page,
      currentPage: result.data.meta.current_page,
    }
    store.loading = false
    return true
  }

  // ... loadMore, reset 等

  return {
    wallpapers: computed(() => store.totalPageData),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    fetch,
    loadMore,
    reset,
  }
}
```

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 3 范围内。

### 留给阶段 5 的工作
- 组件迁移使用新 Composables
- 死代码清理
- 移除 `src/services/wallpaperApi.ts` 中的冗余代码

</deferred>

---

*Phase: 03-business-composable-layer*
*Context gathered: 2025-04-25*
