---
wave: 2
depends_on:
  - PLAN-01
  - PLAN-02
files_modified:
  - src/components/WallpaperList.vue
requirements:
  - FAV-01
  - FAV-03
  - FAV-04
autonomous: true
---

# Plan 3: Add Favorite Button and Indicator to WallpaperList

## Objective

Add the FavoriteButton and CollectionDropdown to each wallpaper card in WallpaperList.vue. This enables users to add/remove/move wallpapers to collections directly from the card view.

## Tasks

### Task 1: Add Favorite Button to Wallpaper Cards

<read_first>
- `src/components/WallpaperList.vue` — Current implementation (full file)
- `src/components/favorites/FavoriteButton.vue` — Newly created FavoriteButton component
- `src/components/favorites/CollectionDropdown.vue` — Newly created CollectionDropdown component
- `src/composables/favorites/useFavorites.ts` — useFavorites composable API
</read_first>

<action>
Modify `src/components/WallpaperList.vue`:

1. **Add imports**:
   ```typescript
   import FavoriteButton from '@/components/favorites/FavoriteButton.vue'
   import CollectionDropdown from '@/components/favorites/CollectionDropdown.vue'
   ```

2. **Add new props**:
   ```typescript
   interface Props {
     // ... existing props
     favoriteIds?: string[]  // List of wallpaper IDs that are favorited
   }
   ```

3. **Add new emits**:
   ```typescript
   emit<{
     // ... existing emits
     'toggle-favorite': [item: WallpaperItem, event: MouseEvent]
     'favorite-changed': []  // Notify parent to refresh favorites
   }>()
   ```

4. **Add reactive state for dropdown**:
   ```typescript
   const showDropdown = ref(false)
   const dropdownWallpaper = ref<WallpaperItem | null>(null)
   const dropdownPosition = ref({ x: 0, y: 0 })
   ```

5. **Add template elements** (inside `<figure class="thumb">` after the checkbox div):

   After the checkbox div (line ~51), add:
   ```vue
   <!-- 收藏按钮 -->
   <FavoriteButton
     :wallpaper-id="liItem.id"
     :show-always="isFavorite(liItem.id)"
     :collection-count="getCollectionCount(liItem.id)"
     :collection-names="getCollectionNames(liItem.id)"
     @click="handleFavoriteClick($event, liItem)"
   />
   ```

6. **Add CollectionDropdown** (after all `<section>` elements, before `.main-bottom`):
   ```vue
   <!-- 收藏夹选择下拉菜单 -->
   <CollectionDropdown
     v-if="dropdownWallpaper"
     :visible="showDropdown"
     :wallpaper-id="dropdownWallpaper.id"
     :wallpaper-data="dropdownWallpaper"
     :position="dropdownPosition"
     @close="closeDropdown"
     @collection-changed="handleCollectionChanged"
   />
   ```

7. **Add helper methods**:
   ```typescript
   const isFavorite = (id: string): boolean => {
     return props.favoriteIds?.includes(id) || false
   }

   const getCollectionCount = (id: string): number => {
     // Will be passed from parent via additional prop
     return 0 // Default, parent should provide actual count
   }

   const getCollectionNames = (id: string): string[] => {
     // Will be passed from parent via additional prop
     return []
   }

   const handleFavoriteClick = (event: MouseEvent, item: WallpaperItem) => {
     dropdownWallpaper.value = item
     dropdownPosition.value = { x: event.clientX, y: event.clientY }
     showDropdown.value = true
   }

   const closeDropdown = () => {
     showDropdown.value = false
     dropdownWallpaper.value = null
   }

   const handleCollectionChanged = () => {
     emit('favorite-changed')
     closeDropdown()
   }
   ```

8. **Add CSS for favorite button positioning**:
   ```css
   /* Favorite button shows on hover */
   .thumb:hover .favorite-btn:not(.is-favorited) {
     opacity: 0.7;
     visibility: visible;
   }

   /* Always show if favorited */
   .thumb:has(.favorite-btn.is-favorited) .favorite-btn {
     opacity: 1;
     visibility: visible;
   }
   ```

9. **Update props interface** to accept additional favorite metadata:
   ```typescript
   interface Props {
     pageData: TotalPageData;
     loading: boolean;
     error: boolean;
     selectedIds?: string[];
     favoriteIds?: string[];
     collectionCounts?: Record<string, number>;  // wallpaperId -> count
     collectionNamesMap?: Record<string, string[]>;  // wallpaperId -> names
   }
   ```
</action>

<acceptance_criteria>
1. `WallpaperList.vue` imports `FavoriteButton` from '@/components/favorites/FavoriteButton.vue'
2. `WallpaperList.vue` imports `CollectionDropdown` from '@/components/favorites/CollectionDropdown.vue'
3. Props interface contains `favoriteIds?: string[]`
4. Template contains `<FavoriteButton` element inside `.thumb` figure
5. Template contains `<CollectionDropdown` element
6. Script contains `handleFavoriteClick` function
7. Script contains `closeDropdown` function
8. Script contains `handleCollectionChanged` function
9. Script contains `isFavorite` helper function
10. Style section contains `.favorite-btn` related styles
11. TypeScript compiles without errors
</acceptance_criteria>

---

## Verification

After implementation:
1. FavoriteButton appears in each wallpaper card
2. Button is hidden by default, shows on card hover
3. Button is always visible if wallpaper is favorited
4. Clicking button opens CollectionDropdown
5. TypeScript compiles: `npm run typecheck`
6. ESLint passes: `npm run lint`

---

## must_haves

For goal-backward verification:
- [ ] FavoriteButton integrated into WallpaperList cards
- [ ] CollectionDropdown integrated
- [ ] Click handler opens dropdown
- [ ] Favorite status correctly displayed (filled vs outline heart)
- [ ] Hover behavior works (hidden by default, visible on hover or if favorited)
- [ ] New props for favoriteIds accepted
- [ ] New emit events for favorite changes
