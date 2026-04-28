# Plan 21-02: Favorites Browsing UI - All Favorites Filter & Caching

**Status:** ✅ Complete
**Wave:** 2
**Requirements:** BROW-01, BROW-03, BROW-05
**Executed:** 2026-04-28

---

## Summary

Added "All Favorites" filter mode to sidebar, upgraded FavoritesPage with deduplication and sorting logic, polished empty states, and added KeepAlive caching for state preservation.

### Commits

1. `a1d9fc8` - feat(favorites): add "All Favorites" filter mode with deduplication
2. `581bd26` - feat(favorites): add KeepAlive caching for FavoritesPage

---

## Tasks Completed

### Task 1: Add "All Favorites" Option to CollectionSidebar and Upgrade Filtering

**Files:**
- `src/components/favorites/CollectionSidebar.vue`
- `src/views/FavoritesPage.vue`

**CollectionSidebar.vue changes:**

1. **Emit type updated** — Changed from `string` to `string | null` to support "all favorites" mode
2. **Added `uniqueWallpaperCount` computed** — Counts distinct wallpapers across all collections (per RESEARCH Pitfall 5)
3. **Added "All Favorites" option** — Inserted at top of collection list with:
   - Heart icon (red #ff6b6b color)
   - Unique wallpaper count
   - Active state styling matching CollectionItem pattern
4. **Added `handleSelectAll` handler** — Emits `null` for all-favorites mode

**FavoritesPage.vue changes:**

1. **Upgraded `filteredFavorites` computed:**
   - `null` (all mode): Deduplicates by `wallpaperId`, sorts by `addedAt` descending
   - Specific collection: Filters by `collectionId`, sorts by `addedAt` descending
2. **Updated `selectedCollection` computed** — Returns `null` when no collection selected
3. **Simplified template** — Removed separate `empty-content` block; `null` now means "all favorites"
4. **Contextual empty states** — Different messages for all-empty vs empty-collection
5. **Updated header** — Shows "全部收藏" when viewing all favorites

---

### Task 2: Add FavoritesPage to KeepAlive

**Files:**
- `src/views/FavoritesPage.vue`
- `src/Main.vue`

**Changes:**

1. **Added `defineOptions({ name: 'FavoritesPage' })`** — Required for KeepAlive to work with `<script setup>` components (per RESEARCH Pitfall 2)
2. **Added 'FavoritesPage' to KeepAlive include** — State preserved when navigating away and back

---

## Verification

### Automated Checks

```bash
# Task 1 verification
grep -c "全部收藏" src/components/favorites/CollectionSidebar.vue  # 1
grep -c "uniqueWallpaperCount" src/components/favorites/CollectionSidebar.vue  # 2
grep -c "handleSelectAll" src/components/favorites/CollectionSidebar.vue  # 2
grep -c "seen.has" src/views/FavoritesPage.vue  # 1
grep -c "addedAt" src/views/FavoritesPage.vue  # 2

# Task 2 verification
grep -c "defineOptions" src/views/FavoritesPage.vue  # 1
grep "FavoritesPage" src/Main.vue | grep -c "KeepAlive"  # 1
grep -c "/favorites" src/router/index.ts  # 1
grep -c "我的收藏" src/Main.vue  # 1
```

### Must-Haves Verified

- ✅ User can select 'All Favorites' in sidebar to see wallpapers from all collections
- ✅ No duplicate wallpapers appear in 'All Favorites' view (deduplicated by wallpaperId)
- ✅ Favorites are sorted by added time descending (newest first)
- ✅ When all favorites are empty, a helpful empty state message is shown
- ✅ Navigating away from favorites and back preserves state (KeepAlive caching)
- ✅ FavoritesPage route and navigation item work correctly

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/favorites/CollectionSidebar.vue` | Added "All Favorites" option, uniqueWallpaperCount, handleSelectAll |
| `src/views/FavoritesPage.vue` | Upgraded filtering with deduplication/sorting, added defineOptions |
| `src/Main.vue` | Added 'FavoritesPage' to KeepAlive include |

---

## Implementation Notes

### Design Decisions

1. **Deduplication via Set** — Used `Set<string>` to track seen `wallpaperId` values during filtering for O(n) deduplication

2. **Null means "all"** — Changed the semantics: `selectedCollectionId === null` now means "show all favorites" instead of "no selection"

3. **Removed empty-content block** — Since null means "all favorites" now, the old "no selection" empty state is no longer needed

4. **defineOptions for KeepAlive** — Vue 3 `<script setup>` components don't auto-infer names; `defineOptions` is the standard solution (Vue 3.3+)

### Patterns Followed

- Active indicator styling matches CollectionItem.vue (gradient bar on left)
- Empty state pattern follows existing favorites page conventions
- Sorting by `addedAt` descending matches user expectation (newest first)

---

## Requirements Delivered

| ID | Description | Status |
|----|-------------|--------|
| BROW-01 | User can access favorites page from main navigation | ✅ Complete (Phase 19 route + KeepAlive) |
| BROW-03 | User can filter wallpapers by collection | ✅ Complete (all-favorites + per-collection) |
| BROW-05 | User can download favorited wallpapers | ✅ Complete (download from card, Plan 01) |

---

*Plan: 21-02*
*Phase: 21-favorites-browsing-ui*
*Completed: 2026-04-28*
