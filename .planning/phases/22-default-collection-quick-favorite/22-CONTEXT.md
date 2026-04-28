# Phase 22: Default Collection & Quick Favorite - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

为收藏系统添加「默认收藏夹」功能，并修改在线壁纸页面的收藏按钮交互行为：左键点击快速添加/移除默认收藏夹，右键点击显示收藏夹选择下拉菜单。

**核心交付物：**
1. 设置默认收藏夹功能 — 用户可将任意收藏夹设为默认
2. 默认收藏夹持久化 — 默认收藏夹设置需持久化保存
3. 左键快速收藏 — 左键点击直接添加到/移除默认收藏夹
4. 右键显示下拉菜单 — 右键点击显示收藏夹选择器

**需求覆盖：** DFC-01, DFC-02, DFC-03

**阶段边界：**
- 仅实现默认收藏夹设置和左键/右键行为变更
- 在收藏页侧边栏添加设置默认收藏夹入口
- 修改 OnlineWallpaper 的收藏按钮交互（WallpaperList 和 ImagePreview）
- 不修改收藏夹其他管理功能（创建、重命名、删除）
- 依赖 Phase 16-21 的全部成果

**当前状态：**
- ✅ Phase 16-21 完成 — 数据层、服务层、组合层、收藏夹管理 UI、收藏操作 UI、收藏浏览 UI 全部实现
- ✅ `getDefault()` 方法已存在于 `useCollections` composable
- ✅ `CollectionDropdown` 已有「快速添加到默认收藏夹」选项
- ✅ `CollectionItem` 已显示默认收藏夹的星形图标
- ✅ 收藏按钮点击行为：当前点击显示下拉菜单
- ❌ 无「设置默认收藏夹」功能入口
- ❌ 无左键/右键区分行为

</domain>

<decisions>
## Implementation Decisions

### 设置默认收藏夹的 UI 位置 (DFC-01)

- **D-01:** 设置默认收藏夹的入口位置
  - 在 CollectionSidebar 的收藏夹项上添加「设为默认」按钮，悬停时显示
  - 同时支持右键上下文菜单中添加「设为默认收藏夹」选项
  - 两种方式都可设置，用户可根据习惯选择
  - 理由：提供多种操作方式，满足不同用户习惯；悬停按钮直观，右键菜单简洁

- **D-02:** 默认收藏夹的视觉标识
  - 保持现有的星形图标（`fa-star`）
  - 在收藏夹名称旁添加小标签「默认」或角标徽章
  - 理由：双重标识更明确地告知用户哪个是默认收藏夹；角标徽章视觉上更突出

### 左键点击行为细节 (DFC-02)

- **D-03:** 左键点击收藏按钮的行为
  - 左键点击直接添加到默认收藏夹，显示简短成功提示（如「已添加到"收藏"」）
  - 无需确认，快速便捷
  - 理由：符合「快速收藏」语义；减少操作步骤

- **D-04:** 壁纸已在默认收藏夹中的左键行为
  - 如果壁纸已在默认收藏夹中，左键点击从默认收藏夹移除
  - 显示「已从"收藏"移除」提示
  - 理由：与添加行为对称；简单直观的切换操作

### 右键菜单和下拉菜单 (DFC-03)

- **D-05:** 右键点击收藏按钮的行为
  - 右键显示完整的收藏夹选择下拉菜单
  - 下拉菜单包含所有收藏夹列表（含勾选状态）
  - 与当前行为一致，只是触发方式改为右键
  - 理由：保持用户对下拉菜单的熟悉感；提供完整的收藏夹操作选项

- **D-06:** 下拉菜单中的「快速添加」选项处理
  - 移除「快速添加到默认收藏夹」选项
  - 左键已可直接快速添加，无需在下拉菜单中重复
  - 理由：简化菜单；避免功能重复；左键已提供快速收藏入口

### 默认收藏夹的删除逻辑

- **D-07:** 默认收藏夹的删除限制
  - 禁止删除默认收藏夹
  - 如果用户尝试删除默认收藏夹，显示提示「默认收藏夹不能删除，请先设置其他收藏夹为默认」
  - 理由：确保始终有默认收藏夹可用于快速收藏；避免用户删除后无默认收藏夹的混乱

- **D-08:** 默认收藏夹的唯一性
  - 只允许一个默认收藏夹
  - 设置新默认收藏夹时，自动取消旧默认收藏夹的默认状态
  - 理由：简单清晰；避免「左键添加到多个收藏夹」的复杂行为和用户困惑

### 数据持久化

- **D-09:** 默认收藏夹设置存储位置
  - 在 `FavoritesData` 结构中添加 `defaultCollectionId` 字段
  - 使用现有的 `electron-store` 持久化
  - 理由：与现有收藏数据存储方式一致；确保应用重启后默认收藏夹设置保留

### Claude's Discretion

- 「设为默认」按钮的具体样式和位置
- 「默认」角标徽章的精确样式（颜色、大小、位置）
- 添加/移除成功提示的具体文案和显示时长
- 右键菜单的定位逻辑
- 是否在 ImagePreview 中也应用相同的左键/右键行为

</decisions>

<specifics>
## Specific Ideas

- 默认收藏夹角标可使用金色背景 + 白色文字，与星形图标颜色呼应
- 左键点击的提示使用 Toast 风格，自动消失（约 1.5 秒）
- 右键菜单的定位与当前下拉菜单一致（在按钮附近显示）
- 如果用户没有设置默认收藏夹，左键点击可提示「请先设置默认收藏夹」

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目规划
- `.planning/PROJECT.md` — 项目核心价值、约束条件（UI不变原则）
- `.planning/REQUIREMENTS.md` — DFC-01~03 详细需求
- `.planning/ROADMAP.md` — Phase 22 定义和成功标准

### 前置阶段上下文
- `.planning/phases/19-collections-management-ui/19-CONTEXT.md` — 收藏夹管理 UI 设计
- `.planning/phases/20-favorites-operations-ui/20-CONTEXT.md` — 收藏操作 UI 设计（收藏按钮、下拉菜单）
- `.planning/phases/21-favorites-browsing-ui/21-CONTEXT.md` — 收藏浏览 UI 设计

### 代码库分析
- `.planning/codebase/ARCHITECTURE.md` — 现有架构、分层结构

### 关键代码文件（需修改/参考）

#### 收藏夹侧边栏（添加设置默认收藏夹功能）
- `src/components/favorites/CollectionSidebar.vue` — 收藏夹侧边栏主组件
- `src/components/favorites/CollectionItem.vue` — 收藏夹项组件，添加「设为默认」按钮

#### 收藏按钮交互（修改左键/右键行为）
- `src/components/WallpaperList.vue` — 壁纸列表，收藏按钮交互
- `src/components/ImagePreview.vue` — 图片预览，收藏按钮交互
- `src/views/OnlineWallpaper.vue` — 在线壁纸页面，收藏按钮事件处理

#### 下拉菜单（移除快速添加选项）
- `src/components/favorites/CollectionDropdown.vue` — 收藏夹选择下拉菜单

#### Composables 和服务层（默认收藏夹持久化）
- `src/composables/favorites/useCollections.ts` — 添加 `setDefault(id)` 方法
- `src/services/collections.service.ts` — 添加 `setDefault(id)` 方法
- `src/repositories/favorites.repository.ts` — 添加 `setDefaultCollection(id)` 方法

#### 类型定义
- `src/types/favorite.ts` — 添加 `defaultCollectionId` 到 `FavoritesData`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

#### CollectionItem.vue 现有结构
```vue
<div class="collection-item" :class="{ 'is-default': collection.isDefault }">
  <div class="collection-icon">
    <i v-if="collection.isDefault" class="fas fa-star" title="默认收藏夹" />
  </div>
  <div class="collection-info">...</div>
  <div v-show="showActions" class="collection-actions">
    <button class="action-btn" title="重命名" @click.stop="handleRename">
      <i class="fas fa-pen" />
    </button>
    <button v-if="!collection.isDefault" class="action-btn delete-btn" title="删除">
      <i class="fas fa-trash" />
    </button>
  </div>
</div>
```
- 可在 `collection-actions` 中添加「设为默认」按钮

#### WallpaperList.vue 收藏按钮
```vue
<div
  class="thumb-favorite-btn"
  :class="{ 'is-favorite': isFavorite(liItem.id) }"
  @click.stop="emit('toggle-favorite', liItem, $event)"
>
  <i :class="isFavorite(liItem.id) ? 'fas fa-heart' : 'far fa-heart'" />
</div>
```
- 需修改为支持左键/右键区分：`@click` (左键) 和 `@contextmenu.prevent` (右键)

#### OnlineWallpaper.vue 收藏事件处理
```typescript
const handleToggleFavorite = (item: WallpaperItem, event: MouseEvent): void => {
  dropdownWallpaper.value = item
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  dropdownPosition.value = {
    x: rect.left,
    y: rect.bottom + 4
  }
  showFavoriteDropdown.value = true
}
```
- 需修改为：左键 → 快速添加/移除默认收藏夹；右键 → 显示下拉菜单

#### CollectionDropdown.vue 快速添加选项
```vue
<div v-if="defaultCollection" class="dropdown-item quick-add" @click="quickAdd">
  <i class="fas fa-star" />
  <span>快速添加到"{{ defaultCollection.name }}"</span>
</div>
```
- 需移除此选项（D-06）

#### useCollections Composable
```typescript
interface UseCollectionsReturn {
  collections: ComputedRef<Collection[]>
  // ...existing methods
  getDefault: () => Collection | undefined
}
```
- 需添加 `setDefault(id: string): Promise<boolean>` 方法

### Established Patterns

- **按钮样式**：使用 Font Awesome 图标，hover 效果使用 CSS transition
- **Toast 提示**：使用 `useAlert` composable 的 `showSuccess`/`showWarning` 方法
- **右键菜单**：使用 `@contextmenu.prevent` 阻止默认上下文菜单
- **状态更新**：通过 composable 方法调用后，状态自动响应式更新

### Integration Points

- `src/components/favorites/CollectionItem.vue` — 添加「设为默认」按钮
- `src/components/favorites/CollectionSidebar.vue` — 添加右键菜单处理
- `src/components/WallpaperList.vue` — 修改收藏按钮事件（左键/右键）
- `src/components/ImagePreview.vue` — 修改收藏按钮事件（左键/右键）
- `src/components/favorites/CollectionDropdown.vue` — 移除快速添加选项
- `src/views/OnlineWallpaper.vue` — 修改 `handleToggleFavorite` 方法
- `src/composables/favorites/useCollections.ts` — 添加 `setDefault` 方法
- `src/services/collections.service.ts` — 添加 `setDefault` 方法
- `src/repositories/favorites.repository.ts` — 添加持久化逻辑
- `src/types/favorite.ts` — 扩展 `FavoritesData` 接口

</code_context>

<deferred>
## Deferred Ideas

None — 本阶段为默认收藏夹和快速收藏功能，功能明确。

### 后续阶段

- v2.5 里程碑完成后：收藏夹搜索、排序、批量操作等（见 REQUIREMENTS.md Future Requirements）

</deferred>

---

*Phase: 22-default-collection-quick-favorite*
*Context gathered: 2026-04-28*
