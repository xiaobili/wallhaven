# Phase 11: OnlineWallpaper Migration - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

迁移 OnlineWallpaper.vue 中的所有直接 store 访问到 composables。本阶段处理该 View 文件的完整迁移，涉及模板和 script 两部分的 store 引用替换。

**核心交付物：**
1. OnlineWallpaper.vue — 移除 `useWallpaperStore` 直接导入，改用 `useWallpaperList()` 和 `useSettings()`
2. 保持所有现有功能行为不变（壁纸加载、分页、下载、预览、设置访问）

**需求覆盖：** SMIG-03, CMIG-01

**阶段边界：**
- 仅修改 OnlineWallpaper.vue 的导入语句和变量引用
- 不改变任何功能行为
- 不修改 composables 或 stores
- 不添加新代码

</domain>

<decisions>
## Implementation Decisions

### 模板变量替换策略 (SMIG-03)

- **D-01:** 模板 `wallpaperStore` 引用替换
  - 当前模板使用 `wallpaperStore.error`, `wallpaperStore.totalPageData`, `wallpaperStore.loading`
  - `useWallpaperList()` 返回 `wallpapers`, `loading`, `error`（均为 ComputedRef）
  - **决策:** 在 script 顶部解构 composable 并创建匹配模板的局部变量
    ```typescript
    const {
      wallpapers,      // 对应 totalPageData
      loading,         // 对应 loading
      error,           // 对应 error
      queryParams,     // 对应 queryParams
    } = useWallpaperList()
    ```
  - 模板中 `wallpaperStore.totalPageData` → `wallpapers`（或保持别名 `totalPageData`）
  - 模板中 `wallpaperStore.loading` → `loading`
  - 模板中 `wallpaperStore.error` → `error`

- **D-02:** 变量命名选择
  - 选项 A: 使用 composable 返回的原名 (`wallpapers`, `loading`, `error`)
  - 选项 B: 使用别名匹配原有模板变量 (`wallpapers as totalPageData`)
  - **决策:** 使用选项 A（原名），模板相应更新为 `wallpapers`, `loading`, `error`
  - 理由: 更清晰、更符合 composable 设计意图，减少中间层

### Settings 访问迁移 (CMIG-01)

- **D-03:** `apiKey` 访问迁移
  - 当前: `const apiKey = computed(() => wallpaperStore.settings.apiKey)`
  - `useSettings()` 返回 `settings: ComputedRef<AppSettings>`
  - **决策:** 替换为:
    ```typescript
    const { settings } = useSettings()
    const apiKey = computed(() => settings.value.apiKey)
    ```

- **D-04:** `downloadPath` 访问迁移
  - 当前: `const downloadPath = wallpaperStore.settings.downloadPath`
  - **决策:** 替换为 `settings.value.downloadPath`

### Script 内部引用迁移

- **D-05:** 分页数据访问
  - 当前: `wallpaperStore.totalPageData.sections` (line 174)
  - **决策:** 替换为 `wallpapers.value.sections`

- **D-06:** 查询参数访问
  - 当前: `wallpaperStore.queryParams` (line 319)
  - **决策:** 使用 `queryParams` 从 `useWallpaperList()` 解构

- **D-07:** 加载状态检查
  - 当前: `wallpaperStore.loading` (lines 329, 332)
  - **决策:** 使用 `loading` 从 `useWallpaperList()` 解构

- **D-08:** 分页信息访问
  - 当前: `wallpaperStore.totalPageData.currentPage`, `wallpaperStore.totalPageData.totalPage`
  - **决策:** 替换为 `wallpapers.value.currentPage`, `wallpapers.value.totalPage`

### 导入清理

- **D-09:** 移除的导入
  - `import { useWallpaperStore } from '@/stores/wallpaper'` — 移除

- **D-10:** 保留的导入
  - `import { useWallpaperList, useDownload, useSettings, useAlert } from '@/composables'` — 已存在，扩展使用

### Claude's Discretion

- 验证迁移后所有功能正常（壁纸加载、分页、搜索、下载、设置访问）
- 确保 computed 响应式正确工作
- 检查是否有遗漏的 store 引用

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（纯架构迁移，功能行为不变）
- `.planning/REQUIREMENTS.md` — SMIG-03, CMIG-01 详细需求
- `.planning/ROADMAP.md` — Phase 11 定义和成功标准

### 前置阶段上下文
- `.planning/phases/10-simple-substitutions/10-CONTEXT.md` — Phase 10 上下文（迁移模式和决策参考）

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构、数据流
- `.planning/codebase/CONVENTIONS.md` — TypeScript/Vue 代码规范

### 关键代码文件（需要修改）

#### View 文件
- `src/views/OnlineWallpaper.vue` — 完整迁移，移除所有 store 直接引用

#### 现有 Composables（无需修改，参考接口）
- `src/composables/wallpaper/useWallpaperList.ts` — 返回 `wallpapers`, `loading`, `error`, `queryParams`
- `src/composables/settings/useSettings.ts` — 返回 `settings: ComputedRef<AppSettings>`

#### Store 文件（无需修改，了解数据结构）
- `src/stores/modules/wallpaper/index.ts` — Store 定义，了解状态结构

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### useWallpaperList composable
```typescript
// src/composables/wallpaper/useWallpaperList.ts
export interface UseWallpaperListReturn {
  // 状态（ComputedRef）
  wallpapers: ComputedRef<TotalPageData>     // ← 对应 store.totalPageData
  loading: ComputedRef<boolean>              // ← 对应 store.loading
  error: ComputedRef<boolean>                // ← 对应 store.error
  queryParams: ComputedRef<GetParams | null> // ← 对应 store.queryParams
  savedParams: ComputedRef<CustomParams | null>

  // 方法
  fetch: (params: GetParams | null) => Promise<boolean>
  loadMore: () => Promise<boolean>
  reset: () => void
  saveCustomParams: (params: CustomParams) => Promise<boolean>
  loadSavedParams: () => Promise<CustomParams | null>
}
```

#### useSettings composable
```typescript
// src/composables/settings/useSettings.ts
export interface UseSettingsReturn {
  settings: ComputedRef<AppSettings>  // ← 对应 store.settings
  load: () => Promise<boolean>
  update: (partial: Partial<AppSettings>) => Promise<boolean>
  reset: () => Promise<boolean>
  getDefaults: () => AppSettings
}
```

### Current Code (Before Migration)

#### OnlineWallpaper.vue - 模板引用 (lines 38-59)
```vue
<!-- 错误状态 -->
<div v-if="wallpaperStore.error" class="error-container">
  ...
</div>

<!-- 壁纸列表 -->
<WallpaperList
  v-else
  :page-data="wallpaperStore.totalPageData"
  :loading="wallpaperStore.loading"
  :error="wallpaperStore.error"
  ...
/>
```

#### OnlineWallpaper.vue - Script 引用
```typescript
// Line 77: 导入 store
import { useWallpaperStore } from '@/stores/wallpaper'

// Line 83: 创建 store 实例
const wallpaperStore = useWallpaperStore()

// Line 86: 已使用 composable（部分）
const { fetch: fetchWallpapers, loadMore: loadMoreWallpapers, saveCustomParams } = useWallpaperList()

// Line 102: apiKey computed
const apiKey = computed(() => wallpaperStore.settings.apiKey)

// Line 174: 批量下载时访问 sections
const allSections = wallpaperStore.totalPageData.sections

// Line 272: downloadPath 访问
const downloadPath = wallpaperStore.settings.downloadPath

// Line 319: 重试时使用 queryParams
fetchWallpapers(wallpaperStore.queryParams)

// Line 329, 332: 滚动加载检查
if (wallpaperStore.loading) return
const { currentPage, totalPage } = wallpaperStore.totalPageData
```

### Target Code (After Migration)

#### OnlineWallpaper.vue - 导入
```typescript
// 移除 store 导入
// import { useWallpaperStore } from '@/stores/wallpaper'  // ← 移除

// 扩展 composable 使用
import { useWallpaperList, useDownload, useSettings, useAlert } from '@/composables'
```

#### OnlineWallpaper.vue - Script setup
```typescript
// Composables - 完整解构
const {
  wallpapers,    // 对应 totalPageData
  loading,
  error,
  queryParams,
  fetch: fetchWallpapers,
  loadMore: loadMoreWallpapers,
  saveCustomParams
} = useWallpaperList()

const { settings, update: updateSettings } = useSettings()
const { addTask, startDownload, loadHistory, isDownloading } = useDownload()
const { alert, showSuccess, showError, showWarning, hideAlert } = useAlert()

// apiKey computed - 使用 settings
const apiKey = computed(() => settings.value.apiKey)

// 其他引用迁移示例：
// wallpaperStore.totalPageData.sections → wallpapers.value.sections
// wallpaperStore.settings.downloadPath → settings.value.downloadPath
// wallpaperStore.queryParams → queryParams.value
// wallpaperStore.loading → loading.value
```

#### OnlineWallpaper.vue - 模板
```vue
<!-- 错误状态 -->
<div v-if="error" class="error-container">
  ...
</div>

<!-- 壁纸列表 -->
<WallpaperList
  v-else
  :page-data="wallpapers"
  :loading="loading"
  :error="error"
  ...
/>
```

### Established Patterns

- Composables 返回 ComputedRef，script 中需要 `.value` 访问，模板中自动解包
- 解构时使用原名更清晰，模板更新为 composable 定义的变量名
- Phase 10 确立了别名策略用于匹配模板变量名（本项目选择原名）

### Integration Points

- **模板:** `WallpaperList` 组件接收 `page-data`, `loading`, `error` props
- **Scroll event:** `scrollEvent` 函数检查 `loading` 状态和分页信息
- **Download:** 批量下载时需要从 `wallpapers.value.sections` 收集壁纸数据
- **Settings:** `downloadPath` 和 `apiKey` 从 `settings.value` 获取

</code_context>

<specifics>
## Specific Ideas

- 保持模板变更最小化，但接受更清晰的变量命名
- 所有 store 引用一次性迁移完成
- 遵循 Phase 10 的迁移模式

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为架构迁移，无新功能需求。

### 后续阶段

- Phase 12: SettingPage.vue 迁移 + useSettings 扩展
- Phase 13: 验证与 ESLint 强制规则

</deferred>

---

*Phase: 11-onlinewallpaper-migration*
*Context gathered: 2026-04-27*
