---
wave: 1
depends_on: []
files_modified:
  - src/components/favorites/FavoriteButton.vue
requirements:
  - FAV-01
  - FAV-02
autonomous: true
---

# Plan 2: Create FavoriteButton Component

## Objective

Create a reusable favorite button component that displays heart icon (filled if favorited, outline if not) and can show/hide based on hover state. This button will trigger the CollectionDropdown when clicked.

## Tasks

### Task 1: Create FavoriteButton.vue Component

<read_first>
- `src/components/WallpaperList.vue` — Existing thumb-checkbox and thumb-btn-fav patterns for button styling
- `src/composables/favorites/useFavorites.ts` — isFavorite method for checking favorite status
- `src/types/favorite.ts` — Collection, FavoriteItem type definitions
</read_first>

<action>
Create new file `src/components/favorites/FavoriteButton.vue` with:

1. **Template structure**:
   - A button container with class `favorite-btn`
   - When not favorited: `<i class="far fa-heart" />` (outline heart)
   - When favorited: `<i class="fas fa-heart" />` (filled heart)
   - Optional badge showing collection count (if in multiple collections)
   - Tooltip showing "添加到收藏" or collection names on hover

2. **Props interface**:
   ```typescript
   interface Props {
     wallpaperId: string           // Wallpaper ID to check favorite status
     showAlways?: boolean          // If true, always visible; if false, show on hover
     collectionCount?: number      // Number of collections this wallpaper is in
     collectionNames?: string[]    // Names of collections for tooltip
   }
   ```

3. **Events**:
   ```typescript
   emit<{
     click: [event: MouseEvent]   // Forward click event for parent to handle
   }>
   ```

4. **Script logic**:
   - Import `useFavorites` from '@/composables'
   - Use `isFavorite(wallpaperId)` to determine filled/outline state
   - Computed property `isFavorited` based on composable result
   - Computed property `tooltipText`:
     - If not favorited: "添加到收藏"
     - If favorited in one collection: "已收藏: {collectionName}"
     - If favorited in multiple: "已收藏: {name1}, {name2}, ..."

5. **Styles** (matching WallpaperList.vue patterns):
   - Base styling similar to `.thumb-checkbox`:
     ```css
     .favorite-btn {
       position: absolute;
       top: 8px;
       right: 8px;
       width: 24px;
       height: 24px;
       background: rgba(0, 0, 0, 0.5);
       border: 2px solid rgba(255, 255, 255, 0.8);
       border-radius: 4px;
       display: flex;
       align-items: center;
       justify-content: center;
       cursor: pointer;
       z-index: 150;
       transition: all 0.2s ease;
     }
     ```
   - Hidden by default (`opacity: 0; visibility: hidden`)
   - Show on parent hover (will be controlled by parent component)
   - Show always when favorited (use `isFavorited` class)
   - Filled heart color: `#ff6b6b` (red) or `#667eea` (theme color)
   - Hover effect: scale(1.1), opacity 1

6. **Badge styling**:
   - Small circle on top-right of button
   - Background: #667eea
   - Color: white
   - Font-size: 10px
   - Only show when collectionCount > 1
</action>

<acceptance_criteria>
1. File `src/components/favorites/FavoriteButton.vue` exists
2. File contains `<template>` section with class `favorite-btn`
3. File contains `<script setup lang="ts">` section
4. File imports `useFavorites` from '@/composables'
5. Props interface contains `wallpaperId: string`
6. Props interface contains `showAlways?: boolean`
7. Template contains heart icon (`fa-heart`)
8. Script contains computed property using `isFavorite(wallpaperId)`
9. Style section contains `.favorite-btn` with `position: absolute`
10. Style section contains `.favorite-btn.is-favorited` or similar class for filled state
11. Heart color for favorited state is defined (either #ff6b6b or #667eea)
</acceptance_criteria>

---

## Verification

After implementation:
1. File exists at `src/components/favorites/FavoriteButton.vue`
2. TypeScript compiles without errors: `npm run typecheck`
3. ESLint passes: `npm run lint`

---

## must_haves

For goal-backward verification:
- [ ] FavoriteButton.vue component created
- [ ] Component displays heart icon
- [ ] Icon changes between outline and filled based on favorite status
- [ ] Component uses useFavorites.isFavorite() for status check
- [ ] Styling matches existing button patterns in WallpaperList
- [ ] Optional badge for multiple collections
