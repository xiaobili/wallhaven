---
wave: 4
depends_on:
  - PLAN-03
  - PLAN-04
files_modified:
  - src/views/OnlineWallpaper.vue
requirements:
  - FAV-01
  - FAV-02
  - FAV-03
  - FAV-04
autonomous: true
---

# Plan 5: Wire Up Favorites in OnlineWallpaper

## Objective

Integrate the favorites functionality into OnlineWallpaper.vue by loading favorites data, passing it to child components, and handling favorite change events.

## Tasks

### Task 1: Integrate useFavorites Composable

<read_first>
- `src/views/OnlineWallpaper.vue` — Current implementation (full file)
- `src/composables/favorites/useFavorites.ts` — useFavorites composable API with load, isFavorite, getCollectionsForWallpaper
- `src/composables/index.ts` — Export patterns for composables
</read_first>

<action>
Modify `src/views/OnlineWallpaper.vue`:

1. **Add import for useFavorites**:
   ```typescript
   import { useWallpaperList, useDownload, useSettings, useAlert, useWallpaperSetter, useFavorites } from '@/composables'
   ```

2. **Initialize useFavorites composable** (after other composable initializations, around line 94-107):
   ```typescript
   const {
     favorites,
     favoriteIds,
     load: loadFavorites,
     isFavorite,
     getCollectionsForWallpaper
   } = useFavorites()
   ```

3. **Load favorites on mount** (modify onMounted hook around line 138-141):
   ```typescript
   onMounted(() => {
     // 加载下载历史记录
     loadHistory()
     // 加载收藏数据
     loadFavorites()
   })
   ```

4. **Add computed properties for WallpaperList props**:
   ```typescript
   // 收藏ID列表 (用于 WallpaperList favoriteIds prop)
   const favoritedIds = computed(() => {
     return Array.from(favoriteIds.value)
   })

   // 收藏计数映射 (wallpaperId -> count)
   const collectionCounts = computed(() => {
     const counts: Record<string, number> = {}
     favorites.value.forEach(f => {
       counts[f.wallpaperId] = (counts[f.wallpaperId] || 0) + 1
     })
     return counts
   })

   // 收藏夹名称映射 (wallpaperId -> collection names)
   const collectionNamesMap = computed(() => {
     const map: Record<string, string[]> = {}
     favorites.value.forEach(f => {
       if (!map[f.wallpaperId]) {
         map[f.wallpaperId] = []
       }
       // Get collection name from cached collections
       const names = getCollectionsForWallpaper(f.wallpaperId)
       map[f.wallpaperId] = names
     })
     return map
   })
   ```

5. **Add favorite change handler**:
   ```typescript
   /**
    * 处理收藏变化事件
    */
   const handleFavoriteChanged = async (): Promise<void> => {
     await loadFavorites()
   }
   ```

6. **Update WallpaperList component props** (around line 68-79):
   ```vue
   <WallpaperList
     v-else
     :page-data="wallpapers"
     :loading="loading"
     :error="error"
     :selected-ids="selectedWallpapers"
     :favorite-ids="favoritedIds"
     :collection-counts="collectionCounts"
     :collection-names-map="collectionNamesMap"
     @set-bg="setBg"
     @preview="preview"
     @download-img="downloadImg"
     @select-wallpaper="toggleSelection"
     @close-search-modal="closeSearchModal"
     @favorite-changed="handleFavoriteChanged"
   />
   ```

7. **Update ImagePreview component props** (around line 18-29):
   ```vue
   <ImagePreview
     v-show="imgShow"
     :showing="imgShow"
     :img-info="imgInfo"
     :is-local="false"
     :wallpaper-list="wallpaperList"
     :current-index="previewIndex"
     :favorite-ids="favoritedIds"
     @download-img="downloadImg"
     @set-bg="setBg"
     @close="closePreview"
     @navigate="handleNavigate"
     @favorite-changed="handleFavoriteChanged"
   />
   ```

8. **Add helper function for collection names**:
   ```typescript
   /**
    * 获取壁纸所属的收藏夹名称列表
    */
   const getCollectionNamesForWallpaper = (wallpaperId: string): string[] => {
     return getCollectionsForWallpaper(wallpaperId)
   }
   ```
</action>

<acceptance_criteria>
1. `OnlineWallpaper.vue` imports `useFavorites` from '@/composables'
2. Script contains `useFavorites()` initialization
3. Script contains `favoritedIds` computed property
4. Script contains `collectionCounts` computed property
5. Script contains `collectionNamesMap` computed property
6. `onMounted` calls `loadFavorites()`
7. Script contains `handleFavoriteChanged` function
8. `<WallpaperList` component has `:favorite-ids="favoritedIds"` prop
9. `<WallpaperList` component has `@favorite-changed="handleFavoriteChanged"` event handler
10. `<ImagePreview` component has `:favorite-ids="favoritedIds"` prop
11. `<ImagePreview` component has `@favorite-changed="handleFavoriteChanged"` event handler
12. TypeScript compiles without errors
</acceptance_criteria>

---

## Verification

After implementation:
1. Favorites data loads when OnlineWallpaper mounts
2. WallpaperList receives correct favoriteIds prop
3. ImagePreview receives correct favoriteIds prop
4. Favorite changes trigger reload of favorites
5. TypeScript compiles: `npm run typecheck`
6. ESLint passes: `npm run lint`
7. Manual test: Click favorite button on a wallpaper card
8. Manual test: Verify dropdown appears and collection toggle works
9. Manual test: Verify favorite status updates after add/remove

---

## must_haves

For goal-backward verification:
- [ ] useFavorites composable imported and initialized
- [ ] loadFavorites called on mount
- [ ] favoriteIds passed to WallpaperList
- [ ] favoriteIds passed to ImagePreview
- [ ] collectionCounts computed for displaying counts
- [ ] collectionNamesMap computed for tooltips
- [ ] handleFavoriteCreated handler implemented
- [ ] favorite-changed event handled to refresh data
