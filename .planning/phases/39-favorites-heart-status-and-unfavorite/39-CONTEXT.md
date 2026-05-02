# Phase 39: 收藏状态小红心逻辑与取消收藏功能 - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

完善收藏状态的视觉反馈，并在收藏页（FavoritesPage）添加取消收藏功能。

**范围内：**
- 实现收藏状态的视觉反馈（已收藏壁纸的心形按钮始终可见、填色）
- 在 FavoritesPage 中取消收藏的交互（心形徽章点击取消）
- FavoritesPage 的 ImagePreview 预览中取消收藏功能
- 已收藏壁纸的心形按钮作为唯一的状态指示器（不额外添加小红点）

**范围外：**
- 不改变 OnlineWallpaper 现有的收藏切换行为
- 不改变 WallpaperList 的现有交互逻辑
- 不改变收藏夹管理（创建、重命名、删除）
- 不改变默认收藏夹逻辑
- 不涉及收藏数据存储结构的变更
- 不添加新的 IPC 通道

</domain>

<decisions>
## Implementation Decisions

### 小红心指示器
- **D-01:** 不恢复注释掉的 `favorite-indicator`（红色圆点）。使用心形按钮本身（`thumb-favorite-btn`）作为收藏状态指示器。

### 收藏按钮可见性
- **D-02:** 保持现有行为不变：已收藏壁纸的心形按钮始终可见且填色（`.is-favorite`），未收藏壁纸仅悬停时显示轮廓心。不需要额外改动。

### 取消收藏入口（FavoritesPage）
- **D-03:** `FavoriteWallpaperCard` 左上角的收藏徽章（`favorite-badge`）变为可点击。左键点击触发取消收藏。hover 时显示提示文字「点击取消收藏」。
- **D-04:** 多收藏夹处理：点击徽章时从当前选中的收藏夹中移除该壁纸。如果壁纸只属于该收藏夹，则同时从全部收藏列表中移除。
- **D-05:** 「全部收藏」视图（未选择特定收藏夹）下，点击徽章从所有收藏夹中移除该壁纸。

### ImagePreview 集成（FavoritesPage）
- **D-06:** 实现 `handleToggleFavorite` 逻辑：在 FavoritesPage 的预览中，点击心形仅执行取消收藏（从当前收藏夹移除），不执行添加。
- **D-07:** 「全部收藏」视图下，预览点击心形从所有收藏夹移除。

### Claude's Discretion
- Hover 提示文字的具体措辞
- 点击后的过渡动画细节
- CSS 微调细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 被修改文件
- `src/views/FavoritesPage.vue` — 实现 ImagePreview 的 `toggle-favorite` handler，处理取消收藏
- `src/components/favorites/FavoriteWallpaperCard.vue` — 心形徽章变为可点击，emit 取消收藏事件
- `src/components/ImagePreview.vue` — 确认现有 `toggle-favorite` / `isFavorite` 机制足够

### 参考文件（无需修改，理解行为）
- `src/components/WallpaperList.vue` — `thumb-favorite-btn` 的现有收藏按钮行为（参考模式）
- `src/composables/favorites/useFavorites.ts` — 现有 `remove()` 方法
- `src/views/OnlineWallpaper.vue` — `handleToggleFavorite` 参考实现

### 项目约束
- `.planning/PROJECT.md` — 硬约束：已有功能的外观行为不变
- `.planning/codebase/ARCHITECTURE.md` — 分层架构

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useFavorites.remove(wallpaperId, collectionId)` — 已有完整的取消收藏方法，可直接调用
- `useFavorites.isFavorite(wallpaperId)` — O(1) 收藏状态查询
- `favoriteIds` — 已从 composable 传到各组件
- `FavoriteWallpaperCard` 的 `favorite-badge` — 现有 UI 元素，只需添加交互
- `ImagePreview` 的 `toggle-favorite` emit + `isFavorite` computed — 已有完整机制

### Established Patterns
- 左键收藏切换：OnlineWallpaper + WallpaperList 的 heart icon 左键 toggle
- FavoritesPage 使用 `selectedCollectionId` 跟踪当前选中的收藏夹
- 取消收藏后调用 `favoritesService.remove()` + `load()` 刷新数据

### Integration Points
- `FavoritesPage.vue:16` — `@toggle-favorite="() => {}"` 空函数需实现
- `FavoritesPage.vue` — 需要获取 `removeFavorite` 和 `getDefault` 方法
- `FavoriteWallpaperCard.vue` — `favorite-badge` 的 `@click` 处理器需添加
- `FavoriteWallpaperCard` — 需要 emit `unfavorite` 事件
- `FavoritesPage.vue` — 需要接收 `FavoriteWallpaperCard` 的 `unfavorite` emit

</code_context>

<specifics>
## Specific Ideas

1. `FavoriteWallpaperCard` 的徽章点击交互：hover 时心形颜色微变或显示提示，点击后卡片伴随淡出或移除动画。
2. 取消收藏后自动刷新列表：调用 `loadFavorites()` 后，`filteredFavorites` 自动更新。
3. ImagePreview 的心形状态使用 `isFavorite` computed（已存在），在 FavoritesPage 中取消收藏后需确保状态即时更新。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 39-favorites-heart-status-and-unfavorite*
*Context gathered: 2026-05-02*
