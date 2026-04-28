# Plan 21-01: Favorites Browsing UI - Card Grid & Preview

**Status:** ✅ Complete
**Wave:** 1
**Requirements:** BROW-02, BROW-04
**Executed:** 2026-04-28

---

## Summary

Created FavoriteWallpaperCard component and upgraded FavoritesPage to render a full wallpaper grid with collection badges and ImagePreview integration.

### Commits

1. `dbe8472` - feat(favorites): create FavoriteWallpaperCard component
2. `4aa7906` - feat(favorites): upgrade FavoritesPage with card grid and preview

---

## Tasks Completed

### Task 1: Create FavoriteWallpaperCard Component

**File:** `src/components/favorites/FavoriteWallpaperCard.vue`

Created new card component for favorites page grid:

- **Collection badge** - Top-left position with heart icon + count badge
- **Badge tooltip** - `:title` shows collection names on hover
- **Thumbnail** - Lazy-loaded image with fallback to `wallpaperData.path`
- **Bottom info bar** - Resolution text (italic), set-bg button, download button
- **Scoped styles** - Replicates list.css `.thumb` / `.thumb-info` patterns

**Props:**
```typescript
interface Props {
  favorite: FavoriteItem
  collectionNames: string[]  // pre-computed from parent
}
```

**Emits:** `preview`, `download`, `set-bg`

---

### Task 2: Upgrade FavoritesPage

**File:** `src/views/FavoritesPage.vue`

Replaced simple `favorite-item` divs with full card grid:

1. **Added imports:**
   - `FavoriteWallpaperCard` from `@/components/favorites/`
   - `ImagePreview` from `@/components/`
   - `useDownload`, `useWallpaperSetter` from composables

2. **ImagePreview integration:**
   - `imgInfo` (shallowRef) and `imgShow` state
   - `favoriteWallpaperList` computed for navigation
   - `previewIndex` computed for current position
   - Navigation handlers (`handleNavigate`)

3. **Download flow:**
   - Check if already downloading via `isDownloading()`
   - Generate filename with extension extraction
   - Call `addTask()` + `startDownload()`

4. **Set-wallpaper flow:**
   - Direct call to `setWallpaper(wallpaperData.path)`

5. **Removed:** Old `.favorite-item` CSS class

---

## Verification

### Automated Checks

```bash
# Task 1 verification
test -f src/components/favorites/FavoriteWallpaperCard.vue  # ✅
grep -c "favorite-badge" src/components/favorites/FavoriteWallpaperCard.vue  # 3
grep -c "thumb-info" src/components/favorites/FavoriteWallpaperCard.vue  # 9

# Task 2 verification
grep -c "FavoriteWallpaperCard" src/views/FavoritesPage.vue  # 2 (import + usage)
grep -c "ImagePreview" src/views/FavoritesPage.vue  # 3
grep -c "handleDownload" src/views/FavoritesPage.vue  # 3
! grep -c "favorite-item" src/views/FavoritesPage.vue  # 0 (removed)
```

### Must-Haves Verified

- ✅ User can see wallpaper thumbnails in a grid when a collection is selected
- ✅ Each wallpaper card shows which collection(s) it belongs to via a badge
- ✅ Hovering the badge shows collection names as a tooltip
- ✅ Cards display resolution info in a bottom info bar
- ✅ Clicking a card opens ImagePreview for that wallpaper

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/favorites/FavoriteWallpaperCard.vue` | **Created** - 201 lines |
| `src/views/FavoritesPage.vue` | **Modified** - Added card grid, ImagePreview, download/set-bg |

---

## Implementation Notes

### Design Decisions

1. **Scoped styles vs. importing list.css** - Used scoped styles to avoid coupling with online search pagination/sections logic (per D-01).

2. **Badge data pre-computed** - `getCollectionNamesForWallpaper()` called once per card render, not on hover (per RESEARCH anti-pattern advice).

3. **shallowRef for imgInfo** - Used `shallowRef` for `WallpaperItem` object to optimize reactivity for large objects.

4. **toggle-favorite no-op** - ImagePreview emits `toggle-favorite` but favorites page uses badge for collection info; no dropdown needed in preview mode.

### Patterns Followed

- Download flow mirrors `OnlineWallpaper.vue` `addToDownloadQueue()` pattern
- ImagePreview integration mirrors `OnlineWallpaper.vue` preview handling
- Card structure follows `.thumb` / `.thumb-info` CSS patterns from `list.css`

---

## Next Steps

Plan 21-02 will add:
- "All Favorites" filter mode (BROW-03)
- KeepAlive caching for FavoritesPage (D-11)
- Empty state polish for all-favorites-empty (D-09)

---

*Plan: 21-01*
*Phase: 21-favorites-browsing-ui*
*Completed: 2026-04-28*
