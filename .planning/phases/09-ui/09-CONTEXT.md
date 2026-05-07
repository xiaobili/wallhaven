# Phase 9: 前端分页 UI 集成 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

为 `LocalWallpaper.vue` 集成 `PaginationBar` 组件，实现页码导航和页面缓存。此阶段不改变现有壁纸网格/卡片布局，不改变本地壁纸浏览行为。

</domain>

<decisions>
## Implementation Decisions

### PaginationBar 渲染位置
- **D-01:** `PaginationBar` 渲染在 `LocalWallpaperMain.vue` 组件内部底部，作为该子组件的一部分
- **D-02:** `LocalWallpaperMain` 通过 props 接收 `currentPage`/`totalPages`/`totalCount`/`loading`，由父组件 (`LocalWallpaper.vue`) 传入
- **D-03:** `LocalWallpaperMain` 转发 `go-to-page` emit 到父组件

### 页面缓存策略
- **D-04:** 页面缓存放 `useLocalFiles` composable，使用 `Map<number, LocalWallpaper[]>` 管理
- **D-05:** `useLocalFiles` 需要新增 `goToPage(page)` 方法，内部处理缓存命中逻辑
- **D-06:** 刷新时清除所有缓存并重置到第 1 页
- **D-07:** 需要新增 `clearCache()` 方法供外部调用

### 预览导航范围
- **D-08:** 分页后 `ImagePreview` 的 prev/next 导航限制在当前页内，不跨页加载

### Claude's Discretion
- `goToPage` 的具体实现细节（缓存检查逻辑、加载状态管理等）
- 组件 props 接口的 TypeScript 类型定义细节
- 分页状态从 `useLocalFiles` 到 `LocalWallpaper.vue` 再到 `LocalWallpaperMain` 的透传方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 类型定义
- `src/types/ipc.ts` — `IpcResponse`、`PaginationMeta` 类型定义

### 数据链路
- `src/composables/local/useLocalFiles.ts` — 分页状态管理、缓存集成点
- `src/views/LocalWallpaper.vue` — 主页面，集成入口
- `src/components/LocalWallpaperMain.vue` — PaginationBar 放置位置
- `src/components/PaginationBar.vue` — 已有分页组件，props/emit 接口

### 需求文档
- `.planning/REQUIREMENTS.md` — PAG-03, PAG-04 需求定义
- `.planning/ROADMAP.md` — Phase 9 成功标准

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaginationBar.vue` — 已完整实现的分页组件，毛玻璃极简风格，接收 `currentPage`/`totalPages`/`totalCount`/`loading`，emit `go-to-page`
- `useLocalFiles` composable — 已管理 `currentPage`/`totalPages`/`pageSize`/`total` 状态，`readDirectory` 已支持分页参数

### Established Patterns
- 分层架构: Views → Composables → Services → Repositories → Clients
- Views 禁止直接导入 stores，必须通过 composables 访问
- 组件 Props 使用 TypeScript `interface` + `withDefaults` 定义

### Integration Points
- `LocalWallpaper.vue` 已解构 `readDirectory` 从 `useLocalFiles()`，需要添加 `currentPage`/`totalPages`/`total`/`goToPage` 解构
- `LocalWallpaper.vue` 当前 `refreshList` 调用 `readDirectory` 无分页参数 → 改为传入分页参数

### Known Constraints
- 不改变现有网格/卡片布局
- 不改变现有本地壁纸浏览行为
- 分页控件在大数据量下需正常显示（测试 500+ 文件）

</code_context>

<specifics>
## Specific Ideas

- PaginationBar 直接使用现有组件，无需新建
- goToPage 配合缓存策略：目标页有缓存 → 直接返回；无缓存 → 调用 readDirectory
- 当前页 data 变化后，预览导航自动限在当前页范围

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 9-前端分页 UI 集成*
*Context gathered: 2026-05-07*
