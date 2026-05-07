---
name: favorites
description: "Skill for the Favorites area of wallhaven. 36 symbols across 8 files."
---

# Favorites

36 symbols | 8 files | Cohesion: 87%

## When to Use

- Working with code in `src/`
- Understanding how load, create, rename work
- Modifying favorites-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/stores/modules/favorites/index.ts` | loadFavorites, removeFavorite, moveFavorite, addFavorite, useFavoritesStore (+3) |
| `src/composables/favorites/useFavorites.ts` | remove, loadCounts, add, move, useFavorites (+2) |
| `src/composables/favorites/useCollections.ts` | load, create, rename, deleteCollection, setDefault (+1) |
| `src/services/collections.service.ts` | create, rename, delete, setDefault, getAll |
| `src/services/favorites.service.ts` | getAll, remove, add, move |
| `src/composables/favorites/useFavoriteDropdown.ts` | show, openDropdown, close, handleClickOutside |
| `src/composables/wallpaper/useWallpaperSetter.ts` | useWallpaperSetter |
| `src/composables/core/useAlert.ts` | useAlert |

## Entry Points

Start here when exploring this area:

- **`load`** (Function) — `src/composables/favorites/useCollections.ts:33`
- **`create`** (Function) — `src/composables/favorites/useCollections.ts:40`
- **`rename`** (Function) — `src/composables/favorites/useCollections.ts:51`
- **`deleteCollection`** (Function) — `src/composables/favorites/useCollections.ts:62`
- **`setDefault`** (Function) — `src/composables/favorites/useCollections.ts:81`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `load` | Function | `src/composables/favorites/useCollections.ts` | 33 |
| `create` | Function | `src/composables/favorites/useCollections.ts` | 40 |
| `rename` | Function | `src/composables/favorites/useCollections.ts` | 51 |
| `deleteCollection` | Function | `src/composables/favorites/useCollections.ts` | 62 |
| `setDefault` | Function | `src/composables/favorites/useCollections.ts` | 81 |
| `remove` | Function | `src/composables/favorites/useFavorites.ts` | 175 |
| `loadFavorites` | Function | `src/stores/modules/favorites/index.ts` | 74 |
| `removeFavorite` | Function | `src/stores/modules/favorites/index.ts` | 171 |
| `moveFavorite` | Function | `src/stores/modules/favorites/index.ts` | 183 |
| `loadCounts` | Function | `src/composables/favorites/useFavorites.ts` | 151 |
| `add` | Function | `src/composables/favorites/useFavorites.ts` | 155 |
| `move` | Function | `src/composables/favorites/useFavorites.ts` | 191 |
| `addFavorite` | Function | `src/stores/modules/favorites/index.ts` | 155 |
| `useWallpaperSetter` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 51 |
| `useFavorites` | Function | `src/composables/favorites/useFavorites.ts` | 47 |
| `useCollections` | Function | `src/composables/favorites/useCollections.ts` | 29 |
| `useAlert` | Function | `src/composables/core/useAlert.ts` | 57 |
| `useFavoritesStore` | Function | `src/stores/modules/favorites/index.ts` | 18 |
| `loadCollections` | Function | `src/stores/modules/favorites/index.ts` | 89 |
| `loadAll` | Function | `src/stores/modules/favorites/index.ts` | 99 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `LoadAll → GetAll` | cross_community | 3 |
| `LoadAll → GetAll` | intra_community | 3 |
| `RemoveFavorite → GetAll` | intra_community | 3 |
| `MoveFavorite → GetAll` | intra_community | 3 |
| `UseWallpaperSelection → UseAlert` | cross_community | 3 |
| `UseWallpaperDownload → UseAlert` | cross_community | 3 |
| `AddFavorite → GetAll` | cross_community | 3 |

## How to Explore

1. `gitnexus_context({name: "load"})` — see callers and callees
2. `gitnexus_query({query: "favorites"})` — find related execution flows
3. Read key files listed above for implementation details
