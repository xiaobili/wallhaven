# Phase 14: ElectronAPI Layer Refactor - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

将 LocalWallpaper.vue 和 OnlineWallpaper.vue 中的 window.electronAPI 直接调用重构为符合 service → repository → client → electronAPI 的分层架构。

**核心交付物：**
1. LocalWallpaper.vue — 无直接 `window.electronAPI` 调用
2. OnlineWallpaper.vue — 无直接 `window.electronAPI` 调用
3. 完整分层架构：View → Composable → Service → Repository → Client → ElectronAPI

**需求覆盖：** EAPI-01, EAPI-02

**阶段边界：**
- 仅修改 Views 中的 electronAPI 调用方式
- 扩展现有 Repository 和 Service 层
- 创建 2 个新 Composable
- 不改变任何功能行为

**当前状态：**
- ✅ 已有 `electronClient` 封装所有 electronAPI 方法
- ✅ 已有部分 Repository 和 Service 层
- ❌ Views 中仍有直接 `window.electronAPI` 调用

**直接调用分析：**

LocalWallpaper.vue (4 处):
- `window.electronAPI.readDirectory(downloadPath.value)` — 读取本地目录
- `window.electronAPI.openFolder(downloadPath.value)` — 打开文件夹
- `window.electronAPI.setWallpaper(imagePath)` — 设置壁纸
- `window.electronAPI.deleteFile(wallpaper.path)` — 删除文件

OnlineWallpaper.vue (3 处):
- `window.electronAPI.selectFolder()` — 选择文件夹
- `window.electronAPI.downloadWallpaper({...})` — 下载壁纸
- `window.electronAPI.setWallpaper(downloadResult.filePath)` — 设置壁纸

</domain>

<decisions>
## Implementation Decisions

### Composable 创建策略 (D-01 ~ D-02)

- **D-01:** Composable 创建方式 — 扩展现有 Composable + 新建功能型 Composable
  - 理由: 减少文件数量，利用现有架构，保持职责清晰

- **D-02:** 新建 Composable 数量 — 2 个新 Composable
  - `useWallpaperSetter` — 封装 setWallpaper 操作
  - `useLocalFiles` — 封装 readDirectory、deleteFile、openFolder 操作
  - 现有 useSettings 扩展 selectFolder
  - 现有 useDownload 已包含 downloadWallpaper 相关

### 分层深度选择 (D-03 ~ D-04)

- **D-03:** 分层架构 — 完整 5 层
  - View → Composable → Service → Repository → Client → ElectronAPI
  - 理由: 与现有架构保持一致，便于未来扩展和维护

- **D-04:** Repository/Service 层处理 — 扩展现有 Repository
  - 不新建 Repository 文件，在现有文件中添加方法
  - 扩展 wallpaper.repository.ts 添加 setWallpaper 相关
  - 扩展 settings.repository.ts 添加 selectFolder、openFolder
  - 创建对应的 Service 层方法

### Composable 职责划分 (D-05 ~ D-08)

- **D-05:** useWallpaperSetter (新建)
  - 职责: 封装 setWallpaper 操作
  - 调用路径: View → useWallpaperSetter → wallpaperService.setWallpaper → wallpaperRepository.setWallpaper → electronClient.setWallpaper

- **D-06:** useLocalFiles (新建)
  - 职责: 封装本地文件操作（readDirectory、deleteFile、openFolder）
  - 调用路径: View → useLocalFiles → settingsService → settingsRepository → electronClient

- **D-07:** useSettings (扩展)
  - 扩展: 添加 selectFolder 方法
  - 调用路径: View → useSettings.selectFolder → settingsService.selectFolder → settingsRepository.selectFolder → electronClient.selectFolder

- **D-08:** useDownload (已包含)
  - 已有: downloadWallpaper 相关方法
  - 无需修改

### Claude's Discretion

- Service 层方法的具体命名和实现细节
- Repository 方法的参数和返回值格式
- 是否需要添加错误处理中间层
- Composable 的详细接口设计

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（纯架构迁移，功能行为不变）
- `.planning/REQUIREMENTS.md` — EAPI-01, EAPI-02 详细需求
- `.planning/ROADMAP.md` — Phase 14 定义和成功标准

### 前置阶段上下文
- `.planning/phases/11-onlinewallpaper-migration/11-CONTEXT.md` — Phase 11 上下文（Store 迁移模式）
- `.planning/phases/13-verification-enforcement/13-CONTEXT.md` — Phase 13 上下文（验证和强制规则）

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构、数据流

### 关键代码文件

#### 目标 Views（需要修改）
- `src/views/LocalWallpaper.vue` — 移除 4 处直接 electronAPI 调用
- `src/views/OnlineWallpaper.vue` — 移除 3 处直接 electronAPI 调用

#### 现有 Client 层（无需修改，参考接口）
- `src/clients/electron.client.ts` — 已封装所有 electronAPI 方法

#### 现有 Repository 层（需要扩展）
- `src/repositories/wallpaper.repository.ts` — 扩展 setWallpaper 相关
- `src/repositories/settings.repository.ts` — 扩展 selectFolder、openFolder
- `src/repositories/download.repository.ts` — 参考 downloadWallpaper 相关

#### 现有 Service 层（需要扩展）
- `src/services/wallpaper.service.ts` — 扩展 setWallpaper 相关
- `src/services/settings.service.ts` — 扩展 selectFolder、openFolder
- `src/services/download.service.ts` — 参考 downloadWallpaper 相关

#### 现有 Composables（需要扩展）
- `src/composables/settings/useSettings.ts` — 扩展 selectFolder
- `src/composables/download/useDownload.ts` — 已包含 downloadWallpaper，无需修改

#### 新建 Composables（需要创建）
- `src/composables/wallpaper/useWallpaperSetter.ts` — 新建，封装 setWallpaper
- `src/composables/local/useLocalFiles.ts` — 新建，封装本地文件操作

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### electronClient (已完整封装)
```typescript
// src/clients/electron.client.ts
class ElectronClientImpl {
  // 文件操作
  async selectFolder(): Promise<IpcResponse<string | null>>
  async readDirectory(dirPath: string): Promise<IpcResponse<LocalFile[]>>
  async openFolder(folderPath: string): Promise<IpcResponse<void>>
  async deleteFile(filePath: string): Promise<IpcResponse<void>>

  // 壁纸设置
  async setWallpaper(imagePath: string): Promise<IpcResponse<void>>

  // 下载管理
  async downloadWallpaper(params: {...}): Promise<IpcResponse<string>>
  async startDownloadTask(params: {...}): Promise<IpcResponse<string>>
  // ... 其他方法
}
```

#### 现有 Repository 模式
```typescript
// src/repositories/wallpaper.repository.ts
export const wallpaperRepository = {
  async getQueryParams(): Promise<IpcResponse<CustomParams | null>> { ... },
  async setQueryParams(params: CustomParams): Promise<IpcResponse<void>> { ... },
  async deleteQueryParams(): Promise<IpcResponse<void>> { ... },
}
```

#### 现有 Service 模式
```typescript
// src/services/wallpaper.service.ts
class WallpaperServiceImpl {
  async search(params: GetParams | null): Promise<IpcResponse<WallpaperSearchResult>> { ... }
  async getDetail(id: string): Promise<IpcResponse<WallpaperItem>> { ... }
  async saveQueryParams(params: CustomParams): Promise<IpcResponse<void>> { ... }
  async loadQueryParams(): Promise<IpcResponse<CustomParams | null>> { ... }
}
```

#### 现有 Composable 模式
```typescript
// src/composables/settings/useSettings.ts
export interface UseSettingsReturn {
  settings: ComputedRef<AppSettings>
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}
```

### Current Code (Before Refactor)

#### LocalWallpaper.vue - 直接调用示例
```typescript
// Line 68: 读取目录
const result = await window.electronAPI.readDirectory(downloadPath.value)

// Line 100: 打开文件夹
const result = await window.electronAPI.openFolder(downloadPath.value)

// Line 146: 设置壁纸
const result = await window.electronAPI.setWallpaper(imagePath)

// Line 166: 删除文件
const result = await window.electronAPI.deleteFile(wallpaper.path)
```

#### OnlineWallpaper.vue - 直接调用示例
```typescript
// Line 251: 设置壁纸
const setResult = await window.electronAPI.setWallpaper(downloadResult.filePath)

// Line 288: 选择文件夹
const selectedDir = await window.electronAPI.selectFolder()

// Line 314: 下载壁纸
return await window.electronAPI.downloadWallpaper({
  url: imgItem.path,
  filename,
  saveDir
})
```

### Target Code (After Refactor)

#### LocalWallpaper.vue - 使用 Composable
```typescript
import { useSettings, useAlert, useLocalFiles, useWallpaperSetter } from '@/composables'

const { settings } = useSettings()
const { alert, showSuccess, showError, hideAlert } = useAlert()
const { readDirectory, openFolder, deleteFile } = useLocalFiles()
const { setWallpaper } = useWallpaperSetter()

// 使用示例
const result = await readDirectory(downloadPath.value)
const result = await openFolder(downloadPath.value)
const result = await setWallpaper(imagePath)
const result = await deleteFile(wallpaper.path)
```

#### OnlineWallpaper.vue - 使用 Composable
```typescript
import { useWallpaperList, useDownload, useSettings, useAlert, useWallpaperSetter } from '@/composables'

const { settings, selectFolder, update: updateSettings } = useSettings()
const { downloadWallpaper } = useDownload()
const { setWallpaper } = useWallpaperSetter()

// 使用示例
const selectedDir = await selectFolder()
const result = await downloadWallpaper({ url, filename, saveDir })
const result = await setWallpaper(filePath)
```

### Established Patterns

- Client 层统一返回 `IpcResponse<T>` 格式：`{ success: boolean; data?: T; error?: { code: string; message: string } }`
- Repository 层直接调用 Client，处理 IPC 响应
- Service 层处理业务逻辑、缓存、数据转换
- Composable 层提供响应式状态和方法，供 Views 使用

### Integration Points

- **Views 导入:** 从 `@/composables` 统一导入
- **Composables 索引:** `src/composables/index.ts` 需要导出新建的 Composables
- **Repository 索引:** `src/repositories/index.ts` 需要导出扩展的方法
- **Service 索引:** `src/services/index.ts` 需要导出扩展的方法

</code_context>

<specifics>
## Specific Ideas

- 保持与现有架构的一致性
- 新 Composable 命名遵循 `use[功能域]` 模式
- 所有方法返回统一的响应格式
- 扩展现有文件而非新建，减少架构复杂度

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为架构重构，无新功能需求。

### 后续阶段

Phase 14 完成后，v2.3 ElectronAPI 分层重构里程碑完成。

### Future Enhancements (Out of Scope)

- 为新建的 Composables 添加单元测试
- 为扩展的 Repository/Service 添加单元测试
- 考虑将 useWallpaperSetter 和 useLocalFiles 合并到更合适的位置

</deferred>

---

*Phase: 14-electronapi-layer-refactor*
*Context gathered: 2026-04-27*
