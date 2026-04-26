# Phase 10: Simple Substitutions - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

迁移简单直接的 store 访问到现有 composables。本阶段处理两个 View 文件的直接 store 引用替换，composables 已存在且暴露所需的接口。

**核心交付物：**
1. LocalWallpaper.vue — 移除 `useWallpaperStore` 导入，改用 `useSettings()` 获取 `downloadPath`
2. DownloadWallpaper.vue — 移除 `useDownloadStore` 导入，改用 `useDownload()` 获取列表状态

**需求覆盖：** SMIG-01, SMIG-02

**阶段边界：**
- 仅修改导入语句和变量引用
- 不改变任何功能行为
- 不修改 composables 或 stores
- 不添加新代码

</domain>

<decisions>
## Implementation Decisions

### LocalWallpaper.vue Migration (SMIG-01)

- **D-01:** 导入变更
  - 移除: `import { useWallpaperStore } from '@/stores/wallpaper'`
  - 添加: `import { useSettings, useAlert } from '@/composables'`（useAlert 已存在）

- **D-02:** 变量替换
  - 移除: `const wallpaperStore = useWallpaperStore()`
  - 添加: `const { settings } = useSettings()`
  - 替换: `wallpaperStore.settings.downloadPath` → `settings.value.downloadPath`

- **D-03:** 响应式处理
  - `useSettings()` 返回 `settings: ComputedRef<AppSettings>`
  - 需要使用 `.value` 访问（在 computed 内部或直接使用）
  - 当前代码: `const downloadPath = computed(() => wallpaperStore.settings.downloadPath)`
  - 替换为: `const downloadPath = computed(() => settings.value.downloadPath)`

### DownloadWallpaper.vue Migration (SMIG-02)

- **D-04:** 导入变更
  - 移除: `import { useDownloadStore } from '@/stores/modules/download'`
  - 保持: `import { useDownload, useAlert } from '@/composables'`（已存在）

- **D-05:** 变量替换
  - 移除: `const downloadStore = useDownloadStore()`
  - `useDownload()` 已返回 `downloadingList` 和 `finishedList` computed refs
  - 当前代码: `const downloadList = computed(() => downloadStore.downloadingList)`
  - 替换为: 直接使用 `downloadingList` 从 `useDownload()` 解构

- **D-06:** 简化 computed
  - 当前使用 computed 包装 store 属性是多余的
  - `useDownload()` 已返回 computed refs，可直接使用
  - 替换: `const downloadList = computed(() => downloadStore.downloadingList)`
  - 为: `const { downloadingList, finishedList, ... } = useDownload()`
  - 模板中 `downloadList` → `downloadingList`（或保持别名）

### Template Variable Naming

- **D-07:** 变量命名策略
  - DownloadWallpaper.vue 模板使用 `downloadList` 和 `downloadFinishedList`
  - 选项 A: 重命名 composable 解构变量匹配模板
    ```typescript
    const { downloadingList: downloadList, finishedList: downloadFinishedList } = useDownload()
    ```
  - 选项 B: 修改模板变量名
  - **决策:** 使用选项 A（重命名解构变量），最小化模板变更

### Claude's Discretion

- 验证迁移后功能完整性（手动测试或代码审查）
- 确保 computed 响应式正确工作
- 检查是否有遗漏的 store 引用

</decisions>

<specifics>
## Specific Ideas

- 保持模板代码不变，仅修改 script 部分的导入和变量定义
- 迁移是 1:1 直接替换，无逻辑变更
- 两个文件都已经在使用 composables 的部分方法（useAlert, useDownload），扩展使用范围

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（纯架构迁移，功能行为不变）
- `.planning/REQUIREMENTS.md` — SMIG-01, SMIG-02 详细需求
- `.planning/ROADMAP.md` — Phase 10 定义和成功标准

### 前置阶段上下文
- `.planning/phases/09-error-handling-edge-cases/09-CONTEXT.md` — Phase 9 上下文（了解项目演进）

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构
- `.planning/codebase/CONVENTIONS.md` — TypeScript/Vue 代码规范

### 关键代码文件（需要修改）

#### View 文件
- `src/views/LocalWallpaper.vue` — 移除 store 导入，使用 useSettings()
- `src/views/DownloadWallpaper.vue` — 移除 store 导入，使用 useDownload()

#### 现有 Composables（无需修改，参考接口）
- `src/composables/settings/useSettings.ts` — 返回 `settings: ComputedRef<AppSettings>`
- `src/composables/download/useDownload.ts` — 返回 `downloadingList`, `finishedList` computed refs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### useSettings composable
```typescript
// src/composables/settings/useSettings.ts
export interface UseSettingsReturn {
  settings: ComputedRef<AppSettings>  // 直接可用
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}
```

#### useDownload composable
```typescript
// src/composables/download/useDownload.ts
export interface UseDownloadReturn {
  downloadingList: ComputedRef<DownloadItem[]>     // 直接可用
  finishedList: ComputedRef<FinishedDownloadItem[]>  // 直接可用
  totalActive: ComputedRef<number>
  totalPaused: ComputedRef<number>
  totalFinished: ComputedRef<number>
  // ... 方法省略
}
```

### Current Code (Before Migration)

#### LocalWallpaper.vue (lines 121-139)
```typescript
import { useWallpaperStore } from '@/stores/wallpaper'
// ...
const wallpaperStore = useWallpaperStore()
// ...
const downloadPath = computed(() => wallpaperStore.settings.downloadPath)
```

#### DownloadWallpaper.vue (lines 99-121)
```typescript
import { useDownloadStore } from '@/stores/modules/download'
import { useDownload, useAlert } from '@/composables'
// ...
const downloadStore = useDownloadStore()
const {
  loadHistory,
  removeFinished,
  pauseDownload,
  cancelDownload,
  resumeDownload
} = useDownload()
// ...
const downloadList = computed(() => downloadStore.downloadingList)
const downloadFinishedList = computed(() => downloadStore.finishedList)
```

### Target Code (After Migration)

#### LocalWallpaper.vue
```typescript
import { useSettings, useAlert } from '@/composables'
// ...
const { settings } = useSettings()
// ...
const downloadPath = computed(() => settings.value.downloadPath)
```

#### DownloadWallpaper.vue
```typescript
import { useDownload, useAlert } from '@/composables'
// ...
const {
  downloadingList: downloadList,      // 别名匹配模板
  finishedList: downloadFinishedList, // 别名匹配模板
  loadHistory,
  removeFinished,
  pauseDownload,
  cancelDownload,
  resumeDownload
} = useDownload()
```

### Integration Points

- **LocalWallpaper.vue**: `downloadPath` 用于显示文件夹路径和读取本地壁纸
- **DownloadWallpaper.vue**: `downloadList`/`downloadFinishedList` 用于渲染下载任务列表

### Established Patterns

- Composables 返回 ComputedRef，需要 `.value` 在 script 中访问
- 模板中自动解包，无需 `.value`
- 解构时使用别名 `as` 或 `{ prop: alias }` 语法匹配模板变量名

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为简单替换，无新功能需求。

### 后续阶段

- Phase 11: OnlineWallpaper.vue 完整迁移
- Phase 12: SettingPage.vue 迁移 + useSettings 扩展
- Phase 13: 验证与 ESLint 强制规则

</deferred>

---

*Phase: 10-simple-substitutions*
*Context gathered: 2026-04-27*
