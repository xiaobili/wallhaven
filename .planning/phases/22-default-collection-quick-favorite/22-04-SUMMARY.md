---
plan: 22-04
phase: 22
wave: 4
status: complete
completed_at: "2026-04-28"
---

# 22-04: UI Layer - Left/Right Click Favorite Behavior

## Summary

Implemented the new favorite button click behavior: left-click for quick add/remove to default collection, right-click to show collection dropdown menu.

## Changes Made

### useFavorites.ts (`src/composables/favorites/useFavorites.ts`)
- Added `isInCollection(wallpaperId, collectionId)` method to interface and implementation

### WallpaperList.vue (`src/components/WallpaperList.vue`)
- Added `show-favorite-dropdown` emit type
- Added `handleFavoriteLeftClick` and `handleFavoriteRightClick` methods
- Updated favorite button template with `@click` and `@contextmenu.prevent` handlers
- Updated tooltip to show "右键选择收藏夹" hint

### ImagePreview.vue (`src/components/ImagePreview.vue`)
- Added `show-favorite-dropdown` emit type
- Added `handleFavoriteRightClick` method
- Updated favorite button template with both click handlers
- Updated tooltip

### OnlineWallpaper.vue (`src/views/OnlineWallpaper.vue`)
- Imported `useCollections` for `getDefault` and `isInCollection`
- Replaced `handleToggleFavorite` with quick add/remove logic:
  - Checks for default collection existence
  - Shows warning if no default collection set
  - Adds to default collection if not already in it
  - Removes from default collection if already in it
  - Shows success toast with collection name
- Added `handleShowFavoriteDropdown` for right-click behavior
- Wired both events from WallpaperList and ImagePreview

## Acceptance Criteria Met

- [x] Left-click adds to default collection with toast
- [x] Left-click removes from default collection if already in it
- [x] Right-click shows collection dropdown
- [x] Warning shown if no default collection
- [x] Works in both WallpaperList and ImagePreview
- [x] Tooltips show right-click hint

## Files Modified

- `src/composables/favorites/useFavorites.ts`
- `src/components/WallpaperList.vue`
- `src/components/ImagePreview.vue`
- `src/views/OnlineWallpaper.vue`
