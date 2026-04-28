# Phase 20: Favorites Operations UI - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Mode:** --auto (autonomous)

<domain>
## Phase Boundary

Implement UI for adding, removing, and moving wallpapers between collections. This is the interaction layer that exposes the favorites operations built in Phases 16-18.

**核心交付物：**
1. Favorite Button on Wallpaper Cards (`src/components/WallpaperList.vue`) — 添加收藏按钮
2. Favorite Button in Image Preview (`src/components/ImagePreview.vue`) — 预览中添加收藏
3. Add To Collection Modal (`src/components/favorites/AddToCollectionModal.vue`) — 收藏夹选择器
4. Move To Collection Modal (`src/components/favorites/MoveToCollectionModal.vue`) — 移动收藏
5. Favorite Indicator (`src/components/WallpaperList.vue`) — 收藏状态指示器
6. Wire Up Favorites Logic in OnlineWallpaper (`src/views/OnlineWallpaper.vue`) — 集成收藏逻辑

**需求覆盖：** FAV-01, FAV-02, FAV-03, FAV-04

**阶段边界：**
- 仅实现收藏操作 UI（添加、移除、移动）
- 在壁纸卡片和预览中添加收藏按钮
- 创建收藏夹选择模态框
- 不实现收藏浏览（查看收藏的壁纸）— Phase 21
- 依赖 Phase 16-19 的数据层、服务层、组合层、收藏夹管理 UI

**当前状态：**
- ✅ Phase 16 完成 — favoritesRepository 已实现
- ✅ Phase 17 完成 — collectionsService 和 favoritesService 已实现
- ✅ Phase 18 完成 — useCollections 和 useFavorites composables 已实现
- ✅ Phase 19 完成 — 收藏夹管理 UI、导航、路由已实现
- ✅ 类型定义完成 — Collection, FavoriteItem
- ❌ WallpaperList 无收藏按钮和指示器
- ❌ ImagePreview 无收藏按钮
- ❌ 无收藏夹选择模态框

</domain>

<decisions>
## Implementation Decisions

### Favorite Button on Wallpaper Cards (FAV-01)

- **D-01:** 收藏按钮位置在卡片右上角
  - 与现有"设为壁纸"按钮（`thumb-btn-fav`）对称，放在左上角
  - 使用心形图标 `fa-heart`（空心未收藏，实心已收藏）
  - 理由：与现有 UI 布局一致；收藏是高频操作，应易于访问

- **D-02:** 收藏按钮交互行为
  - 点击显示收藏夹选择下拉菜单（而非直接添加到默认收藏夹）
  - 下拉菜单显示所有收藏夹，已选中的显示勾选标记
  - 支持多选（一个壁纸可在多个收藏夹中）
  - 理由：FAV-06 支持壁纸在多个收藏夹；下拉菜单比模态框更轻量

- **D-03:** 收藏按钮可见性
  - 默认隐藏，悬停时显示（与现有选择框行为一致）
  - 已收藏的壁纸始终显示实心图标
  - 理由：不干扰浏览；已收藏状态需要可见反馈

### Favorite Button in Image Preview (FAV-02)

- **D-04:** 在 ImagePreview 侧边栏添加收藏按钮
  - 位置：在"设为壁纸"和"下载"按钮之间
  - 图标：`fa-heart`（与卡片一致）
  - 点击行为：显示收藏夹选择下拉菜单
  - 理由：预览是查看大图的场景，收藏操作应可访问

- **D-05:** 收藏按钮状态同步
  - 使用 `useFavorites().isFavorite(wallpaperId)` 判断状态
  - 已收藏显示实心图标，未收藏显示空心图标
  - 理由：与卡片状态一致；实时反映收藏状态

### Collection Selector UI (FAV-01, FAV-02)

- **D-06:** 使用下拉菜单（Dropdown）而非模态框
  - 点击收藏按钮后，在按钮附近显示下拉菜单
  - 下拉菜单内容：收藏夹列表（带勾选状态）
  - 支持快速添加到默认收藏夹（第一项）
  - 理由：下拉菜单更轻量，适合快速操作；模态框会打断用户流程

- **D-07:** 下拉菜单结构
  ```
  ┌─────────────────────────┐
  │ ★ 快速添加到"收藏"      │  ← 默认收藏夹，快速操作
  ├─────────────────────────┤
  │ ☑ 动漫                  │  ← 已在收藏夹中
  │ ☐ 风景                  │
  │ ☐ 人物                  │
  └─────────────────────────┘
  ```
  - 理由：快速添加到默认收藏夹是高频操作；勾选状态清晰

### Remove from Collection (FAV-03)

- **D-08:** 移除收藏操作位置
  - 在下拉菜单中，已选中的收藏夹显示"×"移除按钮
  - 点击"×"直接移除（无需确认）
  - 理由：移除是轻量操作，无需确认；用户可重新添加

- **D-09:** 移除后的状态更新
  - 调用 `useFavorites().remove(wallpaperId, collectionId)`
  - 自动刷新收藏状态
  - 如果壁纸不在任何收藏夹中，图标变为空心
  - 理由：实时反馈；状态一致性

### Move Between Collections (FAV-04)

- **D-10:** 移动操作 UI
  - 在下拉菜单中，右键点击收藏夹显示"移动到此"选项
  - 或使用独立的"移动"菜单项
  - 理由：移动是低频操作，不需要显眼入口

- **D-11:** 移动操作实现
  - 调用 `useFavorites().move(wallpaperId, fromCollectionId, toCollectionId)`
  - 移动后更新勾选状态
  - 理由：使用 composable 提供的 move 方法

### Favorite Indicator (FAV-05)

- **D-12:** 收藏状态指示器样式
  - 已收藏：卡片左上角显示小圆点或角标
  - 颜色：使用主题色 `#667eea` 或红色 `#ff6b6b`
  - 理由：视觉区分已收藏壁纸；不遮挡内容

- **D-13:** 多收藏夹指示
  - 如果壁纸在多个收藏夹中，显示数量角标（如 `2`）
  - 悬停显示收藏夹名称列表
  - 理由：FAV-06 支持多收藏夹；用户需要知道壁纸在哪些收藏夹中

### Component Organization

- **D-14:** 组件文件结构
  ```
  src/
  ├── components/
  │   ├── WallpaperList.vue        # 修改：添加收藏按钮和指示器
  │   ├── ImagePreview.vue         # 修改：添加收藏按钮
  │   └── favorites/
  │       ├── CollectionDropdown.vue    # 收藏夹选择下拉菜单
  │       └── FavoriteButton.vue        # 收藏按钮组件（可复用）
  ```

- **D-15:** 状态管理集成
  - 在 OnlineWallpaper.vue 中导入 `useFavorites`
  - 在组件挂载时调用 `load()` 加载收藏数据
  - 理由：确保收藏状态可用

### Claude's Discretion

- 下拉菜单的具体样式和动画效果
- 收藏按钮的精确位置和大小
- 角标的具体样式
- 键盘快捷键支持（如 `F` 键快速收藏）
- 是否在 LocalWallpaper 中也添加收藏功能

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（UI不变原则）
- `.planning/REQUIREMENTS.md` — FAV-01~04, FAV-05, FAV-06 详细需求
- `.planning/ROADMAP.md` — Phase 20 定义和成功标准

### 前置阶段上下文
- `.planning/phases/16-data-layer-foundation/16-CONTEXT.md` — Repository 层设计
- `.planning/phases/17-business-layer-service/17-CONTEXT.md` — Service 层设计
- `.planning/phases/18-composable-layer/18-CONTEXT.md` — Composable 层设计
- `.planning/phases/19-collections-management-ui/19-CONTEXT.md` — 收藏夹管理 UI 设计

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构

### 关键代码文件（现有模式参考）

#### 壁纸列表和预览组件（需修改）
- `src/components/WallpaperList.vue` — 壁纸卡片组件，添加收藏按钮和指示器
- `src/components/ImagePreview.vue` — 图片预览组件，添加收藏按钮

#### 页面组件（需集成）
- `src/views/OnlineWallpaper.vue` — 在线壁纸页面，集成收藏逻辑

#### 现有 UI 组件模式
- `src/components/Alert.vue` — 提示框组件
- `src/components/LoadingOverlay.vue` — 加载遮罩层

#### Composables（Phase 18 交付物）
- `src/composables/favorites/useFavorites.ts` — 收藏项状态管理
- `src/composables/favorites/useCollections.ts` — 收藏夹状态管理

#### 类型定义
- `src/types/favorite.ts` — Collection, FavoriteItem 接口

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### WallpaperList.vue 卡片结构
```vue
<figure class="thumb" ...>
  <!-- 选择框（左上角） -->
  <div class="thumb-checkbox" @click.stop.prevent="toggleSelect(liItem.id)">
    <i v-if="isSelected(liItem.id)" class="fas fa-check check-icon" />
  </div>
  
  <!-- 设为壁纸按钮（右上角） -->
  <a class="thumb-btn thumb-btn-fav" title="设为壁纸" @click.stop="emit('set-bg', liItem)">
    <i class="fas fa-fw fa-repeat-alt" />
  </a>
  
  <!-- 图片、预览链接、信息栏 -->
  ...
</figure>
```
- 收藏按钮可参照 `thumb-checkbox` 或 `thumb-btn-fav` 的样式

#### ImagePreview.vue 侧边栏结构
```vue
<div class="sidebar-fixed-wrapper">
  <div class="details-sidebar-fixed-box hi-de">
    <div class="sidebar-fixed_box" title="设为壁纸" @click="setBg(imgInfo)">
      <div class="icon-wrap"><i class="fas fa-repeat-alt" /></div>
    </div>
    <div class="sidebar-fixed_box" title="下载" @click="downloadImg(imgInfo)">
      <div class="icon-wrap"><i class="fas fa-download" /></div>
    </div>
  </div>
</div>
```
- 收藏按钮可添加到 `details-sidebar-fixed-box` 中

#### useFavorites Composable（Phase 18 已实现）
```typescript
interface UseFavoritesReturn {
  favorites: ComputedRef<FavoriteItem[]>
  favoriteIds: ComputedRef<Set<string>>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  load: () => Promise<void>
  add: (wallpaperId: string, collectionId: string, wallpaperData: WallpaperItem) => Promise<boolean>
  remove: (wallpaperId: string, collectionId: string) => Promise<boolean>
  move: (wallpaperId: string, fromCollectionId: string, toCollectionId: string) => Promise<boolean>
  isFavorite: (wallpaperId: string) => boolean  // O(1)
  getCollectionsForWallpaper: (wallpaperId: string) => string[]
  getByCollection: (collectionId: string) => FavoriteItem[]
}
```

### Established Patterns

- **按钮样式**：使用 Font Awesome 图标，hover 效果使用 CSS transition
- **下拉菜单**：使用 fixed 定位 + z-index 999
- **状态指示器**：使用角标或小圆点，颜色区分状态
- **事件处理**：使用 `@click.stop` 阻止事件冒泡
- **组件通信**：使用 emit 发送事件，props 接收数据

### Integration Points

- `src/components/WallpaperList.vue` — 添加收藏按钮、指示器、下拉菜单
- `src/components/ImagePreview.vue` — 添加收藏按钮、下拉菜单
- `src/views/OnlineWallpaper.vue` — 导入 useFavorites，传递收藏状态给子组件
- `src/components/favorites/CollectionDropdown.vue` — 新建下拉菜单组件
- `src/components/favorites/FavoriteButton.vue` — 新建收藏按钮组件（可选）

</code_context>

<specifics>
## Specific Ideas

- 收藏图标使用 `fa-heart`（心形），更符合"收藏"语义
- 下拉菜单宽度约 180px，与侧边栏宽度一致
- 角标使用红色 `#ff6b6b` 或主题色 `#667eea`
- 快速添加到默认收藏夹是第一项，带星标图标
- 悬停收藏按钮时显示提示"添加到收藏"

</specifics>

<deferred>
## Deferred Ideas

None — 本阶段为收藏操作 UI，功能明确。

### 后续阶段

- Phase 21: Favorites Browsing UI — 收藏浏览、过滤、下载

</deferred>

---

*Phase: 20-favorites-operations-ui*
*Context gathered: 2026-04-28 (auto mode)*
