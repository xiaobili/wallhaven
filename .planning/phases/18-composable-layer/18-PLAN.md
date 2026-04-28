---
wave: 1
depends_on: []
files_modified:
  - src/composables/favorites/useCollections.ts
  - src/composables/favorites/useFavorites.ts
  - src/composables/index.ts
autonomous: true
requirements_addressed:
  - COLL-05
  - FAV-05
  - FAV-06
---

# Phase 18: Composable Layer Implementation

## Goal

Create Vue composables for reactive state management of collections and favorites, providing the reactive layer between views (Phase 19-21) and service layer (Phase 17).

## Requirements

- **COLL-05**: User can view list of all collections in the favorites page
- **FAV-05**: User can see favorite indicator on wallpapers that are in any collection
- **FAV-06**: Wallpaper can exist in multiple collections

## Success Criteria

1. Given a Vue component, when `useFavorites()` is called, then reactive favorites state is available
2. Given favorites loaded, when `isFavorite(wallpaperId)` is called, then result is returned in O(1) time
3. Given a wallpaper in multiple collections, when `getCollectionsForWallpaper(id)` is called, then all collection names are returned
4. Given add/remove operations, when completed, then `favoriteIds` Set is automatically updated

---

## Task 1: Create useCollections Composable

<read_first>
- src/composables/settings/useSettings.ts (existing composable pattern with loading/error state)
- src/services/collections.service.ts (service layer to integrate with)
- src/types/favorite.ts (Collection type definition)
</read_first>

<action>
Create file `src/composables/favorites/useCollections.ts` with the following implementation:

1. Define `UseCollectionsReturn` interface:
   - `collections: ComputedRef<Collection[]>` - readonly collections list
   - `loading: ComputedRef<boolean>` - loading state
   - `error: ComputedRef<string | null>` - error state
   - `load: () => Promise<void>` - load collections from service
   - `create: (name: string) => Promise<boolean>` - create new collection
   - `rename: (id: string, name: string) => Promise<boolean>` - rename collection
   - `delete: (id: string) => Promise<boolean>` - delete collection
   - `getById: (id: string) => Collection | undefined` - get collection by id
   - `getDefault: () => Collection | undefined` - get default collection

2. Implement `useCollections()` function:
   - Use `ref<Collection[]>([])` for internal collections state
   - Use `ref(false)` for loading state
   - Use `ref<string | null>(null)` for error state
   - Import and use `collectionsService` from `@/services`
   - Import and use `useAlert` from `@/composables` for error notifications
   - Implement `load()` method:
     - Set loading.value = true, error.value = null
     - Call `collectionsService.getAll()`
     - On success, update collections.value with result.data
     - On failure, set error.value and call `showError(error.message)`
     - Finally set loading.value = false
   - Implement `create(name: string)` method:
     - Call `collectionsService.create(name)`
     - On success, call `load()` to refresh
     - Return boolean success
   - Implement `rename(id: string, name: string)` method:
     - Call `collectionsService.rename(id, name)`
     - On success, call `load()` to refresh
     - Return boolean success
   - Implement `delete(id: string)` method:
     - Call `collectionsService.delete(id)`
     - On success, call `load()` to refresh
     - Return boolean success
   - Implement `getById(id: string)` method:
     - Return `collections.value.find(c => c.id === id)`
   - Implement `getDefault()` method:
     - Return `collections.value.find(c => c.isDefault)`
   - Return computed refs for state and methods

3. Export the interface and function following existing patterns.
</action>

<acceptance_criteria>
- File `src/composables/favorites/useCollections.ts` exists
- File contains `export interface UseCollectionsReturn` with all required properties
- File contains `export function useCollections(): UseCollectionsReturn`
- Function uses `collectionsService` imported from `@/services`
- Function uses `useAlert` imported from `@/composables`
- `load()` method calls `collectionsService.getAll()`
- `create()` method calls `collectionsService.create()`
- `rename()` method calls `collectionsService.rename()`
- `delete()` method calls `collectionsService.delete()`
- `getById()` method returns `collections.value.find(c => c.id === id)`
- `getDefault()` method returns `collections.value.find(c => c.isDefault)`
- TypeScript compiles without errors
</acceptance_criteria>

---

## Task 2: Create useFavorites Composable

<read_first>
- src/composables/settings/useSettings.ts (existing composable pattern with loading/error state)
- src/composables/download/useDownload.ts (complex state management pattern)
- src/services/favorites.service.ts (service layer to integrate with)
- src/services/collections.service.ts (collections service for getCollectionsForWallpaper)
- src/types/favorite.ts (FavoriteItem, Collection type definitions)
</read_first>

<action>
Create file `src/composables/favorites/useFavorites.ts` with the following implementation:

1. Define `UseFavoritesReturn` interface:
   - `favorites: ComputedRef<FavoriteItem[]>` - readonly favorites list
   - `favoriteIds: ComputedRef<Set<string>>` - Set for O(1) lookup (readonly)
   - `loading: ComputedRef<boolean>` - loading state
   - `error: ComputedRef<string | null>` - error state
   - `load: () => Promise<void>` - load favorites from service
   - `add: (wallpaperId: string, collectionId: string, wallpaperData: WallpaperItem) => Promise<boolean>` - add favorite
   - `remove: (wallpaperId: string, collectionId: string) => Promise<boolean>` - remove favorite
   - `move: (wallpaperId: string, fromCollectionId: string, toCollectionId: string) => Promise<boolean>` - move favorite
   - `isFavorite: (wallpaperId: string) => boolean` - O(1) check if favorited
   - `getCollectionsForWallpaper: (wallpaperId: string) => string[]` - get collection names for wallpaper
   - `getByCollection: (collectionId: string) => FavoriteItem[]` - get favorites by collection

2. Implement `useFavorites()` function:
   - Use `ref<FavoriteItem[]>([])` for internal favorites state
   - Use `ref<Set<string>>(new Set())` for favoriteIds Set (O(1) lookup)
   - Use `ref(false)` for loading state
   - Use `ref<string | null>(null)` for error state
   - Import and use `favoritesService` from `@/services`
   - Import and use `collectionsService` from `@/services`
   - Import and use `useAlert` from `@/composables` for error notifications
   - Import `WallpaperItem` type from `@/types`

   - Implement `load()` method:
     - Set loading.value = true, error.value = null
     - Call `favoritesService.getAll()`
     - On success:
       - Update favorites.value with result.data
       - Rebuild favoriteIds Set: `favoriteIds.value = new Set(result.data.map(f => f.wallpaperId))`
     - On failure, set error.value and call `showError(error.message)`
     - Finally set loading.value = false

   - Implement `isFavorite(wallpaperId: string)` method:
     - Return `favoriteIds.value.has(wallpaperId)` (O(1) operation)

   - Implement `add(wallpaperId, collectionId, wallpaperData)` method:
     - Call `favoritesService.add(wallpaperId, collectionId, wallpaperData)`
     - On success:
       - Add wallpaperId to Set: `favoriteIds.value.add(wallpaperId)`
       - Call `load()` to refresh favorites list
     - Return boolean success

   - Implement `remove(wallpaperId, collectionId)` method:
     - Call `favoritesService.remove(wallpaperId, collectionId)`
     - On success:
       - Check if wallpaperId exists in other collections by checking favorites.value
       - If not in any other collection, remove from Set: `favoriteIds.value.delete(wallpaperId)`
       - Call `load()` to refresh favorites list
     - Return boolean success

   - Implement `move(wallpaperId, fromCollectionId, toCollectionId)` method:
     - Call `favoritesService.move(wallpaperId, fromCollectionId, toCollectionId)`
     - On success, call `load()` to refresh (no need to update Set since wallpaperId unchanged)
     - Return boolean success

   - Implement `getCollectionsForWallpaper(wallpaperId: string)` method:
     - Get all FavoriteItem with matching wallpaperId: `favorites.value.filter(f => f.wallpaperId === wallpaperId)`
     - Extract collectionIds from those items
     - Load collections via `collectionsService.getAll()` or use cached collections
     - Filter collections by those ids and return their names
     - Must return array of collection name strings

   - Implement `getByCollection(collectionId: string)` method:
     - Return `favorites.value.filter(f => f.collectionId === collectionId)`

   - Return computed refs for state and methods

3. Export the interface and function following existing patterns.
</action>

<acceptance_criteria>
- File `src/composables/favorites/useFavorites.ts` exists
- File contains `export interface UseFavoritesReturn` with all required properties
- File contains `export function useFavorites(): UseFavoritesReturn`
- Function uses `favoritesService` imported from `@/services`
- Function uses `collectionsService` imported from `@/services`
- Function uses `useAlert` imported from `@/composables`
- `favoriteIds` is implemented as `ref<Set<string>>(new Set())`
- `load()` method calls `favoritesService.getAll()` and rebuilds favoriteIds Set
- `isFavorite()` method returns `favoriteIds.value.has(wallpaperId)` (O(1) lookup)
- `add()` method calls `favoritesService.add()` and updates favoriteIds Set
- `remove()` method calls `favoritesService.remove()` and conditionally updates favoriteIds Set
- `move()` method calls `favoritesService.move()`
- `getCollectionsForWallpaper()` returns array of collection name strings
- `getByCollection()` returns filtered FavoriteItem array
- TypeScript compiles without errors
</acceptance_criteria>

---

## Task 3: Export Composables from Index

<read_first>
- src/composables/index.ts (current export pattern)
- src/composables/favorites/useCollections.ts (created in Task 1)
- src/composables/favorites/useFavorites.ts (created in Task 2)
</read_first>

<action>
Update file `src/composables/index.ts` to add exports for the new composables:

1. Add the following exports after existing exports:
```typescript
// Favorites
export { useCollections, type UseCollectionsReturn } from './favorites/useCollections'
export { useFavorites, type UseFavoritesReturn } from './favorites/useFavorites'
```

2. Ensure export order follows the existing pattern (grouped by domain).
</action>

<acceptance_criteria>
- File `src/composables/index.ts` contains export for `useCollections`
- File `src/composables/index.ts` contains export for `useFavorites`
- File `src/composables/index.ts` contains export for `UseCollectionsReturn` type
- File `src/composables/index.ts` contains export for `UseFavoritesReturn` type
- Exports follow existing pattern with comment `// Favorites`
- TypeScript compiles without errors
- `import { useCollections, useFavorites } from '@/composables'` works correctly
</acceptance_criteria>

---

## Verification

After all tasks complete, verify:

1. TypeScript compilation: `npm run typecheck` passes
2. ESLint check: `npm run lint` passes
3. Import test: Both composables can be imported from `@/composables`
4. Type inference: Return types are correctly inferred when using composables

## must_haves

For goal-backward verification, the following MUST be present after plan execution:

1. `src/composables/favorites/useCollections.ts` exists with:
   - `collections: ComputedRef<Collection[]>` state
   - `load()` method calling `collectionsService.getAll()`
   - CRUD methods (create, rename, delete) calling respective service methods

2. `src/composables/favorites/useFavorites.ts` exists with:
   - `favoriteIds: ComputedRef<Set<string>>` state (not `ref<Set<string>>`)
   - `isFavorite(wallpaperId)` method returning `favoriteIds.value.has(wallpaperId)`
   - `getCollectionsForWallpaper(wallpaperId)` returning collection names
   - Set synchronization logic in `add()` and `remove()` methods

3. `src/composables/index.ts` contains:
   - `export { useCollections, type UseCollectionsReturn } from './favorites/useCollections'`
   - `export { useFavorites, type UseFavoritesReturn } from './favorites/useFavorites'`

4. All files compile without TypeScript errors
