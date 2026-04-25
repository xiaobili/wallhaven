# Phase 2: 数据层抽象 - Context

**Gathered:** 2025-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

解耦 Store 与 Electron API 的直接依赖，建立 Repository 模式。包括：
- 创建 `ElectronClient`、`ApiClient`、`StoreClient` 三个客户端
- 创建 `SettingsRepository`、`DownloadRepository`、`WallpaperRepository` 三个仓储
- 删除现有 `src/utils/store.ts`，统一使用新抽象层
- 重构 `wallpaperApi.ts`，移除业务逻辑，作为纯 HTTP 客户端

**核心约束**：
- IPC 通道名称和消息格式保持向后兼容
- 存储键名不变（`appSettings`、`downloadFinishedList`、`wallpaperQueryParams`）
- 所有现有功能行为保持不变

**阶段边界**：
- 本阶段仅新建抽象层，不迁移现有 Store 代码
- Store 迁移使用新 Repository 层留在阶段 3
- 业务逻辑（验证、默认值填充）留在阶段 3 Service 层

</domain>

<decisions>
## Implementation Decisions

### Clients 层设计

- **D-01:** ElectronClient 采用大接口模式
  - 封装所有 `window.electronAPI` 方法（25+ 个）
  - 包括：文件操作、下载、设置、窗口控制、Store、缓存管理
  - 导出单一实例 `electronClient`

- **D-02:** 所有 Clients 统一返回 `Result<T>` 类型
  - 格式：`{ success: boolean, data?: T, error?: { code: string, message: string } }`
  - 调用方无需 try-catch，通过检查 `success` 处理结果
  - 与阶段 1 IPC 响应格式保持一致

- **D-03:** Clients 采用单例模式
  - `electronClient`、`apiClient`、`storeClient` 导出单一实例
  - 符合 Electron API 单例特性
  - 简化使用，无需管理多个实例

### Repository 层设计

- **D-04:** Repository 方法返回 `Promise<Result<T>>`
  - 与 Clients 层返回类型一致
  - 错误通过 `Result.error` 返回，不抛出异常
  - 调用方通过检查 `success` 处理成功/失败

- **D-05:** Repository 方法命名采用 `get/set/delete` 风格
  - 例如：`getSettings()`、`setSettings(settings)`、`deleteSettings()`
  - 与现有 `storage.ts` 命名风格一致
  - 迁移成本低

- **D-06:** Repository 不缓存数据
  - Repository 只做纯数据访问
  - 缓存由上层 Service 或 Store 负责
  - 保持职责单一

### 迁移策略

- **D-07:** 阶段 2 仅新建抽象层，不迁移现有代码
  - 创建 Clients 和 Repositories
  - 现有 Store 代码保持不变
  - 迁移 Store 使用新 Repository 层留在阶段 3

- **D-08:** 删除 `src/utils/store.ts`
  - Repository 直接调用 `ElectronClient.storeGet/storeSet` 等方法
  - 不保留中间封装层
  - 简化依赖链

- **D-09:** 重构 `wallpaperApi.ts`
  - 移除业务逻辑（API Key 从 Store 获取）
  - 移除缓存逻辑（由 Service 层负责）
  - 作为纯 HTTP 客户端，通过 `ApiClient` 封装

### 与阶段 3 边界

- **D-10:** Repository 只做 CRUD
  - 不包含验证逻辑
  - 不包含默认值填充
  - 业务规则由阶段 3 Service 层处理

- **D-11:** DownloadRepository 只存储下载记录
  - 下载执行（IPC 调用 `startDownloadTask`）由 DownloadService 处理
  - Repository 提供 `getDownloads()`、`addDownload()`、`updateDownload()`、`removeDownload()`

- **D-12:** API Key 由 Service 层处理
  - WallpaperRepository 不处理 API Key
  - WallpaperService 从设置获取 API Key 并注入到 API 调用
  - 保持 Repository 职责单一

### Claude's Discretion

- Clients 和 Repositories 的具体文件结构
- `Result<T>` 类型的具体定义（复用阶段 1 IPC 类型或新建）
- `ApiClient` 与现有 `axios` 实例的整合方式
- 各 Repository 的具体方法签名

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件、需求范围
- `.planning/REQUIREMENTS.md` — 详细需求列表（DATA-01 ~ DATA-06）
- `.planning/ROADMAP.md` — 阶段划分和依赖关系
- `.planning/STATE.md` — 当前项目状态

### 前置阶段
- `.planning/phases/01-infrastructure-typesafety/01-CONTEXT.md` — 阶段 1 上下文
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、数据流、关键模式
- `.planning/codebase/CONCERNS.md` — 技术债务清单

### 关键代码文件
- `electron/preload/index.ts` — ElectronAPI 接口定义（需封装）
- `src/utils/store.ts` — 现有 store 封装（将删除）
- `src/services/wallpaperApi.ts` — 现有 API 服务（将重构）
- `src/stores/modules/wallpaper/settings-storage.ts` — 设置存储
- `src/stores/modules/wallpaper/storage.ts` — 参数存储
- `src/stores/modules/download/index.ts` — 下载存储

### 研究报告
- `.planning/research/SUMMARY.md` — 重构策略综合建议
- `.planning/research/PITFALLS.md` — 重构陷阱警告

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `electron/preload/index.ts:7-84` — 完整的 `ElectronAPI` 接口定义，可直接复用类型
- `src/types/index.ts` — 现有领域类型（`AppSettings`、`DownloadItem`、`CustomParams`）
- 阶段 1 创建的 `src/shared/types/ipc.ts` — IPC 类型定义，可复用 `Result<T>` 格式

### Established Patterns
- 现有 `storeGet<T>()` / `storeSet()` 已是简单封装模式
- `settings-storage.ts` 使用独立存储键 `appSettings`
- `download/index.ts` 使用存储键 `downloadFinishedList`
- `storage.ts` 使用存储键 `wallpaperQueryParams`

### Integration Points
- `src/stores/modules/download/index.ts:102-147` — 直接调用 `window.electronAPI`，阶段 3 需迁移
- `src/views/*.vue` — 多处直接调用 `window.electronAPI`，阶段 3/5 需迁移
- `src/services/wallpaperApi.ts:81-119` — 包含 `isProduction()` 判断和 IPC 调用

### 需要删除的文件
- `src/utils/store.ts` — 阶段 2 完成后删除

### 需要重构的文件
- `src/services/wallpaperApi.ts` — 移除业务逻辑和缓存

</code_context>

<specifics>
## Specific Ideas

### 目录结构建议

```
src/
├── clients/                    # 新建 Clients 层
│   ├── index.ts               # 统一导出
│   ├── electron.client.ts     # ElectronClient
│   ├── api.client.ts          # ApiClient
│   └── store.client.ts        # StoreClient（可选，或合并到 ElectronClient）
│
├── repositories/              # 新建 Repositories 层
│   ├── index.ts               # 统一导出
│   ├── settings.repository.ts
│   ├── download.repository.ts
│   └── wallpaper.repository.ts
```

### Result<T> 类型定义

```typescript
// 复用阶段 1 IPC 类型
interface Result<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
```

### ElectronClient 示例

```typescript
// src/clients/electron.client.ts
import type { ElectronAPI } from '@/shared/types/electron'

class ElectronClientImpl {
  async selectFolder(): Promise<Result<string | null>> {
    try {
      const result = await window.electronAPI.selectFolder()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: { code: 'SELECT_FOLDER_ERROR', message: String(error) } }
    }
  }

  // ... 其他方法
}

export const electronClient = new ElectronClientImpl()
```

### SettingsRepository 示例

```typescript
// src/repositories/settings.repository.ts
import type { AppSettings } from '@/types'
import { electronClient } from '@/clients/electron.client'

export const settingsRepository = {
  async get(): Promise<Result<AppSettings | null>> {
    return electronClient.storeGet<AppSettings>('appSettings')
  },

  async set(settings: AppSettings): Promise<Result<void>> {
    return electronClient.storeSet('appSettings', settings)
  }
}
```

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在阶段 2 范围内。

### 留给阶段 3 的工作
- Store 迁移使用新 Repository 层
- 创建 Service 层（WallpaperService、DownloadService、SettingsService）
- 业务逻辑迁移（验证、默认值填充）
- API Key 注入逻辑

### 留给阶段 5 的工作
- 组件中的 `window.electronAPI` 直接调用迁移
- 死代码清理

</deferred>

---

*Phase: 02-data-layer-abstraction*
*Context gathered: 2025-04-25*
