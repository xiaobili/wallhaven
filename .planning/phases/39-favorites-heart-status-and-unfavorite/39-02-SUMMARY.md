# Plan 39-02 Summary: FavoritesPage unfavorite handlers

**Phase:** 39-favorites-heart-status-and-unfavorite
**Plan:** 02
**Wave:** 1

## Changes Made

### Modified: `src/views/FavoritesPage.vue`

1. **Destructured `remove` from `useFavorites()`** (line 93) — Added to composable destructuring
2. **Added `unfavoriteWallpaper` shared helper** (lines 138-153) — Handles both specific-collection and "all favorites" removal with snapshot pattern
3. **Added `handleCardUnfavorite` handler** (lines 165-167) — Delegates to `unfavoriteWallpaper`
4. **Added `handleToggleFavorite` handler** (lines 169-172) — Unfavorite-only (no toggle), delegates to `unfavoriteWallpaper`
5. **Wired `@unfavorite` in template** (line 65) — Added to `<FavoriteWallpaperCard>`
6. **Replaced empty `@toggle-favorite` stub** (line 16) — `() => {}` replaced with `handleToggleFavorite`

## Verification

- ✅ `remove` destructured from `useFavorites()`
- ✅ `unfavoriteWallpaper` function exists
- ✅ `handleCardUnfavorite` function exists
- ✅ `@unfavorite="handleCardUnfavorite"` in template
- ✅ Snapshot pattern for "all favorites" removal
- ✅ `handleToggleFavorite` function exists
- ✅ `@toggle-favorite="handleToggleFavorite"` on ImagePreview
- ✅ Empty `() => {}` stub removed
- ✅ TypeScript type check: pass (no errors)

## Decision Coverage

| Decision | Implementation |
|----------|---------------|
| D-03: Badge click unfavorites | `@unfavorite="handleCardUnfavorite"` |
| D-04: Specific collection removal | `remove(wallpaperId, selectedCollectionId.value)` |
| D-05: "All favorites" removal | Snapshot-then-iterate pattern on `favorites.value` |
| D-06: ImagePreview unfavorite-only | `void unfavoriteWallpaper(item.id)` — no add |
| D-07: "All favorites" image preview removal | Same `unfavoriteWallpaper` helper |

## Threat Model Coverage

- T-39-03 (Spoofing): Accepted — unfavorite always permitted for current context
- T-39-04 (DoS): Accepted — 2-3 sequential `remove()` calls, negligible impact
- T-39-05 (Tampering): Mitigated — snapshot collection IDs before iteration
