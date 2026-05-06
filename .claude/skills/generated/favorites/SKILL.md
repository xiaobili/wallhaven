---
name: favorites
description: "Skill for the Favorites area of wallhaven. 27 symbols across 9 files."
---

# Favorites

27 symbols | 9 files | Cohesion: 90%

## When to Use

- Working with code in `src/`
- Understanding how loadCounts, add, remove work
- Modifying favorites-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/composables/favorites/useFavorites.ts` | loadCounts, add, remove, move, useFavorites (+2) |
| `src/services/favorites.service.ts` | getAll, add, remove, move, clearCache |
| `src/stores/modules/favorites/index.ts` | loadFavorites, addFavorite, removeFavorite, moveFavorite, useFavoritesStore |
| `src/composables/favorites/useFavoriteDropdown.ts` | show, openDropdown, close, handleClickOutside |
| `src/composables/favorites/useCollections.ts` | deleteCollection, useCollections |
| `src/services/collections.service.ts` | delete |
| `src/composables/wallpaper/useWallpaperSetter.ts` | useWallpaperSetter |
| `src/composables/local/useLocalFiles.ts` | useLocalFiles |
| `src/composables/core/useAlert.ts` | useAlert |

## Entry Points

Start here when exploring this area:

- **`loadCounts`** (Function) — `src/composables/favorites/useFavorites.ts:152`
- **`add`** (Function) — `src/composables/favorites/useFavorites.ts:156`
- **`remove`** (Function) — `src/composables/favorites/useFavorites.ts:174`
- **`move`** (Function) — `src/composables/favorites/useFavorites.ts:188`
- **`deleteCollection`** (Function) — `src/composables/favorites/useCollections.ts:62`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `loadCounts` | Function | `src/composables/favorites/useFavorites.ts` | 152 |
| `add` | Function | `src/composables/favorites/useFavorites.ts` | 156 |
| `remove` | Function | `src/composables/favorites/useFavorites.ts` | 174 |
| `move` | Function | `src/composables/favorites/useFavorites.ts` | 188 |
| `deleteCollection` | Function | `src/composables/favorites/useCollections.ts` | 62 |
| `loadFavorites` | Function | `src/stores/modules/favorites/index.ts` | 63 |
| `addFavorite` | Function | `src/stores/modules/favorites/index.ts` | 144 |
| `removeFavorite` | Function | `src/stores/modules/favorites/index.ts` | 160 |
| `moveFavorite` | Function | `src/stores/modules/favorites/index.ts` | 172 |
| `useWallpaperSetter` | Function | `src/composables/wallpaper/useWallpaperSetter.ts` | 51 |
| `useLocalFiles` | Function | `src/composables/local/useLocalFiles.ts` | 45 |
| `useFavorites` | Function | `src/composables/favorites/useFavorites.ts` | 48 |
| `useCollections` | Function | `src/composables/favorites/useCollections.ts` | 29 |
| `useAlert` | Function | `src/composables/core/useAlert.ts` | 57 |
| `useFavoritesStore` | Function | `src/stores/modules/favorites/index.ts` | 12 |
| `show` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 74 |
| `openDropdown` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 97 |
| `close` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 114 |
| `handleClickOutside` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 121 |
| `goToPage` | Function | `src/composables/favorites/useFavorites.ts` | 70 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `LoadAll → GetAll` | cross_community | 3 |
| `Add → ClearCache` | intra_community | 3 |
| `Remove → ClearCache` | intra_community | 3 |
| `Move → ClearCache` | intra_community | 3 |
| `DeleteCollection → ClearCache` | cross_community | 3 |
| `DeleteCollection → ClearCache` | intra_community | 3 |
| `RemoveFavorite → ClearCache` | intra_community | 3 |
| `RemoveFavorite → GetAll` | intra_community | 3 |
| `MoveFavorite → ClearCache` | intra_community | 3 |
| `MoveFavorite → GetAll` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 2 calls |

## How to Explore

1. `gitnexus_context({name: "loadCounts"})` — see callers and callees
2. `gitnexus_query({query: "favorites"})` — find related execution flows
3. Read key files listed above for implementation details
