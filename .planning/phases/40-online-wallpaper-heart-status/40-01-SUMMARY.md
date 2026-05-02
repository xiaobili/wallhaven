---
plan: 40-01
phase: 40-online-wallpaper-heart-status
status: complete
commits:
  - c5fa3d6
key-files:
  created:
    - src/utils/heart.ts
  modified:
    - src/views/OnlineWallpaper.vue
---

# Plan 40-01 Summary: Heart state utility and OnlineWallpaper data flow

## Objective
Create the shared heart state utility and wire the data flow through OnlineWallpaper to child components.

## Changes
- **src/utils/heart.ts** (new): `HeartState` type ('default' | 'non-default' | 'none') and `getHeartState()` pure function for multi-collection heart color determination.
- **src/views/OnlineWallpaper.vue** (modified):
  - Added `favorites` to `useFavorites()` destructure
  - Added `wallpaperCollectionMap` computed: groups `FavoriteItem[]` by `wallpaperId` into `Map<string, string[]>`
  - Added `defaultCollectionId` computed: returns `getDefault()?.id ?? null`
  - Passed `:wallpaper-collection-map` and `:default-collection-id` to both `<WallpaperList>` and `<ImagePreview>`
  - Retained existing `:favorite-ids` prop for backward compatibility

## Verification
- `HeartState` type and `getHeartState()` exported from `src/utils/heart.ts`
- `wallpaperCollectionMap` and `defaultCollectionId` computeds present in OnlineWallpaper
- Both props passed to WallpaperList and ImagePreview in template
- `@set-bg` event preserved on ImagePreview

## Self-Check: PASSED
