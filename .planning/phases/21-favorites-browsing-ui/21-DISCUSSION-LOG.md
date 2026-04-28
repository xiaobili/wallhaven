# Phase 21: Favorites Browsing UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 21-favorites-browsing-ui
**Areas discussed:** Favorites Grid, Collection Filtering, Collection Badge, Download, Empty States, Component Organization

---

## Favorites Grid

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse WallpaperList component | Import and reuse WallpaperList.vue with props | |
| Custom grid with card style reuse | Create new FavoriteWallpaperCard.vue, reuse thumb CSS classes | ✓ |

**Auto-selected:** Custom grid with card style reuse (WallpaperList is tightly coupled to online search logic)
**Notes:** WallpaperList has pagination, search, selection, and API-specific logic that doesn't apply to favorites browsing

---

## Collection Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar selection only | Use existing sidebar click-to-filter (Phase 19) | ✓ |
| Dropdown filter bar | Add filter bar above grid with collection dropdown | |

**Auto-selected:** Sidebar selection only (already implemented in Phase 19, add "全部收藏" option)
**Notes:** Added "全部收藏" option for aggregated view; default sort by addedAt descending

---

## Collection Badge

| Option | Description | Selected |
|--------|-------------|----------|
| Heart icon + count badge | Left corner heart icon with number badge, hover tooltip for names | ✓ |
| Tag list below card | Show collection names as tags below each card | |

**Auto-selected:** Heart icon + count badge (consistent with Phase 20's favorite-indicator pattern)
**Notes:** Use getCollectionsForWallpaper() for tooltip content

---

## Download

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse useDownload flow | Call useDownload().addTask() with wallpaperData | ✓ |
| New download implementation | Build separate download logic for favorites | |

**Auto-selected:** Reuse useDownload flow (existing download system handles everything)
**Notes:** Download button on card bottom info bar, same as online wallpaper cards

---

## Empty States

| Option | Description | Selected |
|--------|-------------|----------|
| Enhance existing empty states | Polish Phase 19's empty-content and empty-collection styles | ✓ |
| Redesign empty states | New design for all empty states | |

**Auto-selected:** Enhance existing empty states (Phase 19 already has basic empty states)
**Notes:** Add "全部收藏为空" scenario with link to online wallpaper page

---

## Component Organization

| Option | Description | Selected |
|--------|-------------|----------|
| FavoriteWallpaperCard.vue | New dedicated component for favorite wallpaper cards | ✓ |
| Inline in FavoritesPage | Put all card logic directly in FavoritesPage | |

**Auto-selected:** FavoriteWallpaperCard.vue (separation of concerns, reusable)
**Notes:** Add FavoritesPage to KeepAlive in Main.vue

---

## Claude's Discretion

- 收藏壁纸卡片的具体样式细节
- 空状态的具体文案和图标
- 收藏夹徽章的精确位置和样式
- "全部收藏"选项在侧边栏的位置
- ImagePreview 集成方式
- 收藏页的壁纸删除/移除操作
- 卡片悬停效果和动画

## Deferred Ideas

None — discussion stayed within phase scope.
