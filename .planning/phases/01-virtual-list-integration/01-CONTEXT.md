# Phase 1: 虚拟列表基础集成 - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

将在线壁纸页面和收藏页面从传统分页改造为虚拟列表 + 无限滚动,使用 vue-virtual-scroller 库实现流畅渲染。本阶段专注于基础集成,包括组件创建、滚动机制、数据加载和状态管理,不涉及多选/hover/搜索筛选等功能的兼容(留待 Phase 2 和 Phase 3)。

</domain>

<decisions>
## Implementation Decisions

### 虚拟列表组件设计
- **D-01:** 创建新的 `WallpaperVirtualList.vue` 组件,而不是改造现有 `WallpaperList.vue`
  - **Rationale:** 降低风险、可并行测试、渐进迁移、不影响现有功能
  - **Implementation:** 新组件将使用 vue-virtual-scroller 的 RecycleScroller 组件

### 无限滚动触发机制
- **D-02:** 使用 vue-virtual-scroller 内置的滚动检测机制
  - **Rationale:** 开箱即用、与组件深度集成、性能优化更好、无额外依赖
  - **Implementation:** 利用 RecycleScroller 的滚动事件和监听器

### 数据加载策略
- **D-03:** 扩展现有 `useWallpaperList.ts` composable 的 `loadMore` 方法
  - **Rationale:** 代码集中、易维护、复用现有逻辑、避免创建新文件
  - **Implementation:** 在现有 loadMore 方法中增加虚拟列表数据追加逻辑

### Store 状态管理
- **D-04:** 扩展现有 wallpaper store,增加虚拟列表相关状态字段
  - **Rationale:** 状态集中管理、易维护、无需创建新 store、与现有逻辑协调
  - **Implementation:**
    - 增加 `allWallpapers: WallpaperItem[]` 存储所有已加载的壁纸
    - 增加 `hasMore: boolean` 标记是否还有更多数据
    - 保留现有 `pageCache`、`currentPageData`、`totalPageData` 用于分页导航

### Claude's Discretion
无 — 所有决策均由用户明确选择

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目核心文档
- `.planning/PROJECT.md` — 项目架构、技术栈、当前里程碑目标
- `.planning/REQUIREMENTS.md` — 所有需求的详细定义和追踪
- `.planning/ROADMAP.md` — 三阶段路线图和依赖关系

### 技术决策文档
- `.planning/STATE.md` — 当前状态和技术决策记录(vue-virtual-scroller 选择、无限滚动、不保持滚动位置)

### 现有代码参考
- `src/components/WallpaperList.vue` — 现有壁纸列表组件(传统分页实现)
- `src/views/OnlineWallpaper.vue` — 在线壁纸页面(集成点之一)
- `src/views/FavoritesPage.vue` — 收藏页面(集成点之二)
- `src/composables/wallpaper/useWallpaperList.ts` — 现有壁纸列表 composable(需扩展)
- `src/stores/modules/wallpaper` — 现有壁纸 store(需扩展)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **WallpaperList.vue 组件:** 包含壁纸卡片渲染逻辑、选中状态管理、收藏功能、hover 交互 — 可作为新组件的参考
- **useWallpaperList composable:** 已实现 `loadMore` 方法、分页状态管理、错误处理 — 可扩展支持虚拟列表
- **wallpaper store:** 使用 `pageCache` Map 管理分页数据,有 `currentPageData` 和 `totalPageData` — 可扩展添加 `allWallpapers` 字段
- **现有事件系统:** `emit('select-wallpaper')`、`emit('toggle-favorite')` 等 — 新组件应保持相同的事件接口

### Established Patterns
- **分页导航模式:** 用户可通过键盘左右箭头切换页面 — 虚拟列表时代码需调整或移除
- **页面缓存策略:** store 使用 Map 缓存已加载页面 — 虚拟列表可能不需要(数据累积在 allWallpapers)
- **错误处理:** 统一通过 `useAlert` composable 显示错误提示 — 新组件应遵循相同模式
- **状态管理:** 使用 Pinia store + computed properties — 虚拟列表状态应遵循相同模式

### Integration Points
- **OnlineWallpaper.vue:** 需要将 `<WallpaperList>` 替换为 `<WallpaperVirtualList>`,保持相同的事件处理
- **FavoritesPage.vue:** 同样需要替换列表组件,需考虑收藏夹切换时的列表重置
- **useWallpaperList composable:** 需扩展 `loadMore` 方法支持数据追加到 `allWallpapers`
- **wallpaper store:** 需增加虚拟列表状态字段,可能需要新 action 如 `appendWallpapers()`

</code_context>

<specifics>
## Specific Ideas

无特定参考 — 按照标准 vue-virtual-scroller 使用方式实现即可

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-虚拟列表基础集成*
*Context gathered: 2026-05-06*
