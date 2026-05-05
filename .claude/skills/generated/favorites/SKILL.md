---
name: favorites
description: "Skill for the Favorites area of wallhaven. 31 symbols across 7 files."
---

# Favorites

31 symbols | 7 files | Cohesion: 67%

## When to Use

- Working with code in `src/`
- Understanding how goToPage, refresh, clearCache work
- Modifying favorites-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/stores/modules/favorites/index.ts` | clearPageCache, getCachedPage, loadFavorites, addFavorite, removeFavorite (+5) |
| `src/composables/favorites/useFavorites.ts` | goToPage, refresh, clearCache, load, loadCounts (+4) |
| `src/composables/favorites/useCollections.ts` | load, create, rename, setDefault, deleteCollection |
| `src/composables/favorites/useFavoriteDropdown.ts` | show, openDropdown, close, handleClickOutside |
| `src/repositories/favorites.repository.ts` | getFavoritesPaginated |
| `src/views/OnlineWallpaper.vue` | open |
| `src/composables/core/useAlert.ts` | showSuccess |

## Entry Points

Start here when exploring this area:

- **`goToPage`** (Function) — `src/composables/favorites/useFavorites.ts:70`
- **`refresh`** (Function) — `src/composables/favorites/useFavorites.ts:130`
- **`clearCache`** (Function) — `src/composables/favorites/useFavorites.ts:145`
- **`clearPageCache`** (Function) — `src/stores/modules/favorites/index.ts:205`
- **`getCachedPage`** (Function) — `src/stores/modules/favorites/index.ts:212`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `goToPage` | Function | `src/composables/favorites/useFavorites.ts` | 70 |
| `refresh` | Function | `src/composables/favorites/useFavorites.ts` | 130 |
| `clearCache` | Function | `src/composables/favorites/useFavorites.ts` | 145 |
| `clearPageCache` | Function | `src/stores/modules/favorites/index.ts` | 205 |
| `getCachedPage` | Function | `src/stores/modules/favorites/index.ts` | 212 |
| `show` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 74 |
| `openDropdown` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 97 |
| `close` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 114 |
| `handleClickOutside` | Function | `src/composables/favorites/useFavoriteDropdown.ts` | 121 |
| `load` | Function | `src/composables/favorites/useFavorites.ts` | 52 |
| `loadFavorites` | Function | `src/stores/modules/favorites/index.ts` | 63 |
| `addFavorite` | Function | `src/stores/modules/favorites/index.ts` | 144 |
| `removeFavorite` | Function | `src/stores/modules/favorites/index.ts` | 160 |
| `moveFavorite` | Function | `src/stores/modules/favorites/index.ts` | 172 |
| `loadCounts` | Function | `src/composables/favorites/useFavorites.ts` | 152 |
| `add` | Function | `src/composables/favorites/useFavorites.ts` | 156 |
| `remove` | Function | `src/composables/favorites/useFavorites.ts` | 172 |
| `move` | Function | `src/composables/favorites/useFavorites.ts` | 184 |
| `showSuccess` | Function | `src/composables/core/useAlert.ts` | 96 |
| `load` | Function | `src/composables/favorites/useCollections.ts` | 33 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DeleteCollection → ShowAlert` | cross_community | 4 |
| `Create → ShowAlert` | cross_community | 4 |
| `Rename → ShowAlert` | cross_community | 4 |
| `Refresh → ShowAlert` | cross_community | 4 |
| `SetDefault → ShowAlert` | cross_community | 4 |
| `DeleteCollection → LoadCollections` | cross_community | 3 |
| `Add → ShowAlert` | cross_community | 3 |
| `Remove → ShowAlert` | cross_community | 3 |
| `Move → ShowAlert` | cross_community | 3 |
| `Load → ShowAlert` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Wallpaper | 10 calls |
| Handlers | 1 calls |
| Download | 1 calls |

## How to Explore

1. `gitnexus_context({name: "goToPage"})` — see callers and callees
2. `gitnexus_query({query: "favorites"})` — find related execution flows
3. Read key files listed above for implementation details
