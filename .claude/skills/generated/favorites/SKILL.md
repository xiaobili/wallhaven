---
name: favorites
description: "Skill for the Favorites area of wallhaven. 30 symbols across 7 files."
---

# Favorites

30 symbols | 7 files | Cohesion: 57%

## When to Use

- Working with code in `src/`
- Understanding how goToPage, refresh, clearCache work
- Modifying favorites-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/stores/modules/favorites/index.ts` | clearPageCache, getCachedPage, setCachedPage, loadFavorites, addFavorite (+6) |
| `src/composables/favorites/useFavorites.ts` | goToPage, refresh, clearCache, load, loadCounts (+4) |
| `src/composables/favorites/useCollections.ts` | load, create, rename, deleteCollection, setDefault |
| `src/repositories/favorites.repository.ts` | getFavoritesPaginated, getCounts |
| `src/services/collections.service.ts` | delete |
| `electron/main/ipc/handlers/download.handler.ts` | cancelRetryTimer |
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
| `setCachedPage` | Function | `src/stores/modules/favorites/index.ts` | 219 |
| `load` | Function | `src/composables/favorites/useCollections.ts` | 33 |
| `create` | Function | `src/composables/favorites/useCollections.ts` | 40 |
| `rename` | Function | `src/composables/favorites/useCollections.ts` | 51 |
| `deleteCollection` | Function | `src/composables/favorites/useCollections.ts` | 62 |
| `setDefault` | Function | `src/composables/favorites/useCollections.ts` | 81 |
| `showSuccess` | Function | `src/composables/core/useAlert.ts` | 96 |
| `load` | Function | `src/composables/favorites/useFavorites.ts` | 52 |
| `loadFavorites` | Function | `src/stores/modules/favorites/index.ts` | 63 |
| `addFavorite` | Function | `src/stores/modules/favorites/index.ts` | 144 |
| `removeFavorite` | Function | `src/stores/modules/favorites/index.ts` | 160 |
| `moveFavorite` | Function | `src/stores/modules/favorites/index.ts` | 172 |
| `loadCollections` | Function | `src/stores/modules/favorites/index.ts` | 78 |
| `loadAll` | Function | `src/stores/modules/favorites/index.ts` | 88 |
| `loadCounts` | Function | `src/stores/modules/favorites/index.ts` | 95 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Refresh → CreateErrorResponse` | cross_community | 7 |
| `RegisterDownloadHandlers → CreateErrorResponse` | cross_community | 6 |
| `Refresh → IsAvailable` | cross_community | 6 |
| `RegisterDownloadHandlers → IsAvailable` | cross_community | 5 |
| `RegisterAllHandlers → IsProduction` | cross_community | 5 |
| `Refresh → IsProduction` | cross_community | 5 |
| `Refresh → GetErrorCode` | cross_community | 5 |
| `RegisterDownloadHandlers → GetErrorCode` | cross_community | 4 |
| `RegisterDownloadHandlers → ClearCache` | cross_community | 4 |
| `RegisterDownloadHandlers → ClearCache` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Wallpaper | 10 calls |
| Services | 2 calls |
| Clients | 2 calls |
| Download | 1 calls |
| Handlers | 1 calls |

## How to Explore

1. `gitnexus_context({name: "goToPage"})` — see callers and callees
2. `gitnexus_query({query: "favorites"})` — find related execution flows
3. Read key files listed above for implementation details
