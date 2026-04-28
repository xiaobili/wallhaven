---
wave: 1
depends_on: []
files_modified:
  - src/components/favorites/CollectionDropdown.vue
requirements:
  - FAV-01
  - FAV-02
  - FAV-03
  - FAV-04
autonomous: true
---

# Plan 1: Create CollectionDropdown Component

## Objective

Create a reusable dropdown component for selecting collections when adding/removing/moving wallpapers. This component will be used by both WallpaperList cards and ImagePreview.

## Tasks

### Task 1: Create CollectionDropdown.vue Component

<read_first>
- `src/components/favorites/CollectionItem.vue` — Existing collection item styling patterns
- `src/components/favorites/CollectionSidebar.vue` — Existing useCollections integration pattern
- `src/composables/favorites/useFavorites.ts` — useFavorites composable API (isFavorite, add, remove, move methods)
- `src/composables/favorites/useCollections.ts` — useCollections composable API
- `src/types/favorite.ts` — Collection, FavoriteItem type definitions
</read_first>

<action>
Create new file `src/components/favorites/CollectionDropdown.vue` with:

1. **Template structure**:
   - A dropdown container with class `collection-dropdown`
   - A "快速添加到默认收藏夹" option at top with star icon (class `quick-add`)
   - A divider line
   - A list of all collections with checkbox states
   - Each collection item shows:
     - Checkbox icon (`fa-check-square` if selected, `fa-square` if not)
     - Collection name
     - "×" remove button (class `remove-btn`) if wallpaper is in that collection
     - Right-click context menu option "移动到此" for move operation

2. **Props interface**:
   ```typescript
   interface Props {
     wallpaperId: string           // The wallpaper being managed
     wallpaperData: WallpaperItem  // Full wallpaper data for adding
     visible: boolean              // Controls dropdown visibility
     position?: { x: number; y: number }  // Position for dropdown
   }
   ```

3. **Events**:
   ```typescript
   emit<{
     close: []                    // Close dropdown
     'collection-changed': []     // Collection state changed (add/remove/move)
   }>
   ```

4. **Script logic**:
   - Import `useFavorites` and `useCollections` from '@/composables'
   - Call `load()` on both composables in `onMounted`
   - Use `getCollectionsForWallpaper(wallpaperId)` to get current collection IDs
   - Use `isFavorite(wallpaperId)` to determine icon state
   - Implement `handleQuickAdd()` — call `add(wallpaperId, defaultCollection.id, wallpaperData)`
   - Implement `handleToggleCollection(collectionId)` — check if in collection, then add or remove
   - Implement `handleRemove(collectionId)` — call `remove(wallpaperId, collectionId)`
   - Implement `handleMoveTo(toCollectionId)` — call `move(wallpaperId, fromCollectionId, toCollectionId)`
   - Use `getDefault()` to get default collection for quick add

5. **Styles**:
   - Dropdown width: 180px
   - Background: #222 (matching existing dark theme)
   - Border: 1px solid #333
   - Border-radius: 4px
   - Position: fixed (for portal-style positioning)
   - z-index: 1000
   - Item hover: rgba(255, 255, 255, 0.1)
   - Quick add item: special styling with star icon color #d4af37
   - Checkbox icons: #85aaaf
   - Remove button: color #ff6b6b on hover

6. **Click outside handling**:
   - Add click listener on document to close dropdown when clicking outside
   - Use `@click.stop` on dropdown container to prevent self-close
</action>

<acceptance_criteria>
1. File `src/components/favorites/CollectionDropdown.vue` exists
2. File contains `<template>` section with class `collection-dropdown`
3. File contains `<script setup lang="ts">` section
4. File imports `useFavorites` from '@/composables'
5. File imports `useCollections` from '@/composables'
6. File imports type `WallpaperItem` from '@/types'
7. Props interface contains `wallpaperId: string`, `wallpaperData: WallpaperItem`, `visible: boolean`
8. Template contains element with class `quick-add`
9. Template contains checkbox icons (`fa-check-square` or `fa-square`)
10. Template contains element with class `remove-btn`
11. Script contains function `handleQuickAdd`
12. Script contains function `handleToggleCollection`
13. Script contains function `handleRemove`
14. Script contains function `handleMoveTo`
15. Style section contains `.collection-dropdown` with `z-index: 1000`
</acceptance_criteria>

---

## Verification

After implementation:
1. File exists at `src/components/favorites/CollectionDropdown.vue`
2. TypeScript compiles without errors: `npm run typecheck`
3. ESLint passes: `npm run lint`

---

## must_haves

For goal-backward verification:
- [ ] CollectionDropdown.vue component created
- [ ] Component uses useFavorites composable for state management
- [ ] Component uses useCollections composable for collection list
- [ ] Quick add to default collection feature works
- [ ] Toggle collection (add/remove) feature works
- [ ] Move between collections feature works
- [ ] Dropdown styling matches existing dark theme
