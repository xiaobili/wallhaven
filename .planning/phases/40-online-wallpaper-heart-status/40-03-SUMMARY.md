---
plan: 40-03
phase: 40-online-wallpaper-heart-status
status: complete
commits:
  - 89cec1d
key-files:
  modified:
    - src/components/ImagePreview.vue
---

# Plan 40-03 Summary: Three-state heart in ImagePreview

## Objective
Modify ImagePreview.vue heart button from binary to three-state with backward-compatible fallback.

## Changes
- **src/components/ImagePreview.vue**:
  - Added `getHeartState` and `HeartState` imports from `@/utils/heart`
  - Added optional props `wallpaperCollectionMap?: Map<string, string[]>` and `defaultCollectionId?: string | null`
  - Replaced `isFavorite` computed with `heartState` computed returning `HeartState`
  - Three-state path: uses `getHeartState()` when `wallpaperCollectionMap` is present
  - Fallback path: uses `favoriteIds?.has()` when three-state props absent (FavoritesPage, LocalWallpaper)
  - Template `.is-favorite` applies when heartState === 'default' (red)
  - Template `.is-favorite-in-other` applies when heartState === 'non-default' (blue)
  - Added CSS for `.favorite-btn.is-favorite-in-other`, icon-wrap, and hover (all blue #5b8def)
  - Event handlers unchanged (D-08, D-09)

## Verification
- `getHeartState` imported and used
- `heartState` computed with three-state + fallback paths
- `is-favorite-in-other` class present in template and CSS
- Blue #5b8def colors for non-default state
- Blue hover overrides default red hover

## Self-Check: PASSED
