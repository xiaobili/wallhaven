---
wave: 3
depends_on:
  - PLAN-01
  - PLAN-02
files_modified:
  - src/components/ImagePreview.vue
requirements:
  - FAV-02
autonomous: true
---

# Plan 4: Add Favorite Button to ImagePreview

## Objective

Add a favorite button to the ImagePreview sidebar, allowing users to manage collections while viewing the full-size wallpaper preview.

## Tasks

### Task 1: Add Favorite Button to ImagePreview Sidebar

<read_first>
- `src/components/ImagePreview.vue` — Current implementation (full file)
- `src/components/favorites/FavoriteButton.vue` — Newly created FavoriteButton component
- `src/components/favorites/CollectionDropdown.vue` — Newly created CollectionDropdown component
- `src/composables/favorites/useFavorites.ts` — useFavorites composable API
</read_first>

<action>
Modify `src/components/ImagePreview.vue`:

1. **Add imports**:
   ```typescript
   import FavoriteButton from '@/components/favorites/FavoriteButton.vue'
   import CollectionDropdown from '@/components/favorites/CollectionDropdown.vue'
   ```

2. **Add new props** (extend existing Props interface):
   ```typescript
   interface Props {
     showing: boolean;
     imgInfo: WallpaperItem | null;
     isLocal: boolean;
     wallpaperList?: WallpaperItem[];
     currentIndex?: number;
     favoriteIds?: string[];  // NEW: List of favorited wallpaper IDs
   }
   ```

3. **Add new emits**:
   ```typescript
   emit<{
     close: [value: boolean];
     'set-bg': [item: WallpaperItem];
     'download-img': [item: WallpaperItem];
     navigate: [direction: 'prev' | 'next'];
     'favorite-changed': [];  // NEW: Notify parent of favorite change
   }>()
   ```

4. **Add reactive state for dropdown**:
   ```typescript
   const showFavoriteDropdown = ref(false)
   const dropdownPosition = ref({ x: 0, y: 0 })
   ```

5. **Add template elements**:

   In the `.details-sidebar-fixed-box.hi-de` div (around line 45-66), add a new sidebar-fixed_box for favorite button BETWEEN the "设为壁纸" and "下载" buttons:

   ```vue
   <div class="details-sidebar-fixed-box hi-de">
     <!-- 设为壁纸按钮 (existing) -->
     <div
       class="sidebar-fixed_box comments-middle-icon"
       title="设为壁纸"
       @click="setBg(imgInfo)"
     >
       <div class="icon-wrap">
         <i class="fas fa-repeat-alt" />
       </div>
     </div>
     
     <!-- 收藏按钮 (NEW) -->
     <div
       v-show="!isLocal"
       class="sidebar-fixed_box favorite-middle-icon sidebar-favorite"
       :class="{ 'is-favorited': isFavorited }"
       :title="favoriteTooltip"
       @click="handleFavoriteClick"
     >
       <div class="icon-wrap">
         <i :class="isFavorited ? 'fas fa-heart' : 'far fa-heart'" />
       </div>
     </div>
     
     <!-- 下载按钮 (existing) -->
     <div
       v-show="!isLocal"
       class="sidebar-fixed_box share-middle-icon sidebar-share"
       title="下载"
       @click="downloadImg(imgInfo)"
     >
       <div class="icon-wrap">
         <i class="fas fa-download" />
       </div>
     </div>
   </div>
   ```

6. **Add CollectionDropdown** (after the `.sidebar-fixed-wrapper` div):
   ```vue
   <!-- 收藏夹选择下拉菜单 -->
   <CollectionDropdown
     v-if="imgInfo"
     :visible="showFavoriteDropdown"
     :wallpaper-id="imgInfo.id"
     :wallpaper-data="imgInfo"
     :position="dropdownPosition"
     @close="closeFavoriteDropdown"
     @collection-changed="handleCollectionChanged"
   />
   ```

7. **Add computed properties and methods**:
   ```typescript
   const isFavorited = computed(() => {
     if (!props.imgInfo) return false
     return props.favoriteIds?.includes(props.imgInfo.id) || false
   })

   const favoriteTooltip = computed(() => {
     return isFavorited.value ? '已收藏' : '添加到收藏'
   })

   const handleFavoriteClick = (event: MouseEvent) => {
     if (!props.imgInfo) return
     dropdownPosition.value = { x: event.clientX, y: event.clientY }
     showFavoriteDropdown.value = true
   }

   const closeFavoriteDropdown = () => {
     showFavoriteDropdown.value = false
   }

   const handleCollectionChanged = () => {
     emit('favorite-changed')
     closeFavoriteDropdown()
   }
   ```

8. **Add CSS for favorite button**:
   ```css
   /* Favorite button in preview sidebar */
   .favorite-middle-icon {
     border: 1px solid #E9E9E9;
     background-color: #222;
     transition: background 0.3s;
   }

   .favorite-middle-icon.is-favorited .icon-wrap {
     color: #ff6b6b;
   }

   .favorite-middle-icon:hover {
     background-color: rgba(255, 255, 255, 0.1);
   }
   ```
</action>

<acceptance_criteria>
1. `ImagePreview.vue` imports `FavoriteButton` from '@/components/favorites/FavoriteButton.vue'
2. `ImagePreview.vue` imports `CollectionDropdown` from '@/components/favorites/CollectionDropdown.vue'
3. Props interface extended with `favoriteIds?: string[]`
4. Template contains new sidebar-fixed_box element with class `favorite-middle-icon`
5. Template contains `<CollectionDropdown` element
6. Script contains `isFavorited` computed property
7. Script contains `handleFavoriteClick` function
8. Script contains `closeFavoriteDropdown` function
9. Script contains `handleCollectionChanged` function
10. Favorite button is positioned between "设为壁纸" and "下载" buttons
11. Style section contains `.favorite-middle-icon` styles
12. Style section contains `.is-favorited` styles with color #ff6b6b
13. TypeScript compiles without errors
</acceptance_criteria>

---

## Verification

After implementation:
1. Favorite button appears in ImagePreview sidebar
2. Button shows filled heart if favorited, outline if not
3. Button is positioned between "设为壁纸" and "下载"
4. Clicking button opens CollectionDropdown
5. TypeScript compiles: `npm run typecheck`
6. ESLint passes: `npm run lint`

---

## must_haves

For goal-backward verification:
- [ ] Favorite button integrated into ImagePreview sidebar
- [ ] CollectionDropdown integrated
- [ ] Favorite status correctly displayed
- [ ] Button positioned correctly (between set-bg and download)
- [ ] New favoriteIds prop accepted
- [ ] New favorite-changed emit event added
