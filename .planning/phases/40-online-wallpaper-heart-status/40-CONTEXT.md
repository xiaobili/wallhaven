# Phase 40: 在线壁纸页面小红心多收藏夹状态区分 - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

完善 OnlineWallpaper 页面（WallpaperList + ImagePreview）的心形按钮视觉反馈，根据壁纸在默认收藏夹和非默认收藏夹中的归属情况显示不同颜色。仅涉及视觉状态变化，不改变现有交互逻辑。

**范围内：**
- WallpaperList 心形按钮三态颜色（红/蓝/透明）
- ImagePreview 心形按钮三态颜色（红/蓝/透明）
- OnlineWallpaper 计算并向子组件传递收藏状态数据
- 使用 `#5b8def` 作为非默认收藏夹的蓝色

**范围外：**
- 不改变左键/右键收藏交互行为
- 不改变 FavoritesPage 相关逻辑
- 不添加新的 IPC 通道或服务层方法
- 不改变收藏数据存储结构
- 不涉及 Phase 39 的取消收藏功能

</domain>

<decisions>
## Implementation Decisions

### 数据传递方式
- **D-01:** OnlineWallpaper 向 WallpaperList 和 ImagePreview 传递两个新 prop:
  - `defaultCollectionId: string | null` — 当前默认收藏夹 ID
  - `wallpaperCollectionMap: Map<string, string[]>` — 每个壁纸所属的收藏夹 ID 列表
- **D-02:** OnlineWallpaper 通过 `useFavorites().favorites` 计算 `wallpaperCollectionMap`（按 wallpaperId 分组 collectionId）
- **D-03:** 子组件（WallpaperList/ImagePreview）根据 `defaultCollectionId` 和 `wallpaperCollectionMap` 自行计算心形三态

### 视觉颜色
- **D-04:** 壁纸在默认收藏夹（不论是否也在其他收藏夹）→ 红色（现有 `.is-favorite` 样式，`#ff6b6b`）
- **D-05:** 壁纸不在默认收藏夹，但在其他非默认收藏夹 → 蓝色 `#5b8def`
- **D-06:** 壁纸不在任何收藏夹 → 透明（轮廓心，悬停显示，保持现有行为）
- **D-07:** 蓝色 `#5b8def` 与红色 `#ff6b6b` 保持相同的亮度和饱和度

### 交互行为
- **D-08:** 左键点击行为保持不变 — 切换默认收藏夹。蓝心点击后添加到默认收藏夹（变红心），红心点击从默认收藏夹移除（变蓝心或透明）
- **D-09:** 右键行为保持不变 — 显示收藏夹下拉菜单

### ImagePreview 覆盖
- **D-10:** ImagePreview 的心形按钮（`.favorite-btn`）应用与 WallpaperList 完全相同的心形三态逻辑，仅 CSS 类名和样式不同

### Claude's Discretion
- 具体 CSS 实现细节（transition 动画、hover 效果微调）
- `wallpaperCollectionMap` 的响应式更新时机（跟随 `favoriteIds` 变化）
- 空默认收藏夹边界处理（无默认收藏夹时，蓝心判定退化为"是否在任何收藏夹"）

</decisions>

<canonical_refs>
## Canonical References

### 被修改文件
- `src/components/WallpaperList.vue` — 新增 Props（defaultCollectionId, wallpaperCollectionMap），修改 isFavorite/heartState 逻辑，添加蓝色 CSS 样式
- `src/components/ImagePreview.vue` — 新增 Props，修改 isFavorite computed 逻辑，添加蓝色 CSS 样式
- `src/views/OnlineWallpaper.vue` — 计算 wallpaperCollectionMap 并传递给子组件

### 参考文件（无需修改，理解行为）
- `src/composables/favorites/useFavorites.ts` — 暴露 favorites 数据和 isInCollection 方法
- `src/composables/favorites/useCollections.ts` — getDefault() 获取默认收藏夹 ID
- `src/stores/modules/favorites/index.ts` — favoriteIds computed 从 favorites 派生

### 项目约束
- `.planning/PROJECT.md` — 硬约束：已有功能的外观行为不变
- `.planning/codebase/CONVENTIONS.md` — CSS 命名约定、组件结构约定
- `.planning/codebase/ARCHITECTURE.md` — View → Composable → Store 分层架构

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useFavorites().favorites` — 完整的 FavoriteItem[] 数据，包含 wallpaperId + collectionId 映射
- `useCollections().getDefault()` — 获取默认收藏夹的 ID
- `useFavorites().isInCollection(wallpaperId, collectionId)` — O(n) 查询壁纸是否在指定收藏夹
- WallpaperList 现有 `isFavorite(id)` 方法 — 可扩展为三态计算
- ImagePreview 现有 `isFavorite` computed — 可扩展为三态计算

### Established Patterns
- Props 向下传递：OnlineWallpaper 通过 prop 传递 favoriteIds Set 给子组件
- Vue computed 属性计算派生状态
- Scoped CSS + BEM 命名约定
- `.is-favorite` CSS class 控制心形视觉状态

### Integration Points
- WallpaperList `<script setup>` — `defineProps` 添加新 prop，`isFavorite()` 扩展为三态计算
- ImagePreview `<script setup>` — 类似扩展
- OnlineWallpaper `<template>` — 传递新 props 给 WallpaperList 和 ImagePreview
- `src/static/css/list.css` — 检查是否需要在全局样式添加蓝色心形样式

</code_context>

<specifics>
## Specific Ideas

- 蓝心使用 `.is-favorite-in-other` class（或类似命名），区别于 `.is-favorite`（红色）
- 蓝心的 hover 效果保持与红心一致（缩放、背景变化）
- 三态逻辑封装为纯函数，便于测试：`getHeartState(wallpaperId, defaultCollectionId, collectionMap) => 'default' | 'non-default' | 'none'`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 40-online-wallpaper-heart-status*
*Context gathered: 2026-05-02*
