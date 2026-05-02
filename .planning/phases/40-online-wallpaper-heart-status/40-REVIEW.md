---
phase: 40-online-wallpaper-heart-status
reviewed: 2026-05-02T22:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/utils/heart.ts
  - src/views/OnlineWallpaper.vue
  - src/components/WallpaperList.vue
  - src/components/ImagePreview.vue
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 40: Online Wallpaper Heart Multi-Collection Status — Code Review Report

**Reviewed:** 2026-05-02T22:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed 4 files (1 new, 3 modified) implementing three-state heart indicators for online wallpapers. The core business logic in `src/utils/heart.ts` is clean and correct. The reactive data flow through OnlineWallpaper to child components is sound. No critical bugs or security vulnerabilities were found.

The main issues are code quality: WallpaperList.vue retains commented-out dead code referencing a function (`isFavorite`) that no longer exists, which will cause a runtime error if uncommented. Additionally, there is orphaned CSS and an unused prop that should be cleaned up.

## Warnings

### WR-01: Commented-out dead code references deleted function `isFavorite()`

**File:** `src/components/WallpaperList.vue:71-77`
**Issue:** The template contains a commented-out `favorite-indicator` div block that calls `isFavorite(liItem.id)`. The `isFavorite()` method was replaced by `heartState()` in this phase. If this code is ever uncommented, it will throw a runtime `ReferenceError` (or `TypeError`) because `isFavorite` no longer exists on the component.

```html
<!-- 收藏状态指示器 -->
<!-- <div
  v-if="isFavorite(liItem.id)"
  class="favorite-indicator"
  title="已收藏"
>
  <i class="fas fa-heart" />
</div> -->
```

**Fix:** Remove the commented-out block entirely. If the visual indicator pattern is needed in the future, it should be rewritten to use `heartState(liItem.id) !== 'none'` instead. Since neither the template nor the component API exposes `isFavorite` anymore, this code has decayed from a simple comment into a maintenance hazard.

## Info

### IN-01: Dead CSS `.favorite-indicator` rules

**File:** `src/components/WallpaperList.vue:516-526`
**Issue:** The `.favorite-indicator` CSS class block (positioning the small red dot indicator) styles an element that was commented out in the template (see WR-01). These style rules have no rendered target and are orphaned dead code.

```css
/* 收藏指示器样式 */
.favorite-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 8px;
  height: 8px;
  background: #ff6b6b;
  border-radius: 50%;
  z-index: 160;
  pointer-events: none;
}
```

**Fix:** Remove the `.favorite-indicator` CSS block along with the commented-out template element. This keeps the component clean and prevents confusion for future maintainers.

### IN-02: Unused `favoriteIds` prop in WallpaperList

**File:** `src/components/WallpaperList.vue:180`
**Issue:** The `favoriteIds?: Set<string>` prop is declared (line 180) and receives a default from an earlier `withDefaults()` call, but is never read anywhere in the component. Heart state is now determined exclusively via `wallpaperCollectionMap` and `defaultCollectionId`. OnlineWallpaper still passes `:favorite-ids="favoriteIds"` to WallpaperList, but the child never accesses it.

```typescript
const props = defineProps<{
  // ...
  selectedIds?: string[]
  favoriteIds?: Set<string> // UNUSED — never read
  wallpaperCollectionMap: Map<string, string[]>
  defaultCollectionId: string | null
}>()
```

The prop was intentionally retained for backward compatibility per Phase 40 discussion, but since WallpaperList is only consumed by OnlineWallpaper (confirmed by grep), there is no backward compatibility concern — no other parent component passes this prop.

**Fix:** Either (a) remove `favoriteIds` from the WallpaperList props interface and stop passing it from OnlineWallpaper, or (b) if keeping it for defensive/documentation purposes, add a comment explaining why it is present but unused. Option (a) is preferred to reduce dead code surface.

---

## Summary of Strengths

The following areas were verified and are correct:

- **`getHeartState()` pure function** — Logic is correct. Priority order matches D-04 (default takes precedence over non-default), null/empty map handling is correct, and the `defaultCollectionId` falsy guard works for the no-default-set edge case.
- **Reactive data flow** — `wallpaperCollectionMap` computed in OnlineWallpaper creates a fresh `Map` each evaluation, ensuring Vue prop reactivity. `defaultCollectionId` computed correctly wraps `getDefault()?.id ?? null` inside a `computed()` to maintain Pinia reactivity (per RESEARCH.md Pitfall 4).
- **CSS specificity** — Both `.thumb-favorite-btn.is-favorite-in-other:hover` (WallpaperList) and `.favorite-btn.is-favorite-in-other:hover` (ImagePreview) have specificity (0,2,1), correctly overriding the default (0,1,1) hover rules (per RESEARCH.md Pitfall 3).
- **ImagePreview fallback path** — New props are optional with a correct fallback to `favoriteIds?.has()` when `wallpaperCollectionMap` is undefined. FavoritesPage and LocalWallpaper continue to work without the new props.
- **Type consistency** — All prop types match across parent-child boundaries. `defaultCollectionId ?? null` correctly converts optional `undefined` to `null` for `getHeartState`'s signature.
- **Event handlers unchanged** — `handleToggleFavorite`, `handleFavoriteLeftClick`, `handleFavoriteRightClick` all preserve D-08/D-09 behavior.

---

_Reviewed: 2026-05-02T22:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
