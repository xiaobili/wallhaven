---
name: services
description: "Skill for the Services area of wallhaven. 46 symbols across 9 files."
---

# Services

46 symbols | 9 files | Cohesion: 88%

## When to Use

- Working with code in `src/`
- Understanding how searchWallpapers, getWallpaperDetail, removeFinished work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/services/wallpaperApi.ts` | generateCacheKey, getFromCache, setCache, isProduction, callWallhavenAPIViaIPC (+2) |
| `src/repositories/favorites.repository.ts` | getFavoriteStatusMap, createCollection, renameCollection, setDefaultCollection, addFavorite (+2) |
| `src/services/collections.service.ts` | create, rename, setDefault, clearCache, getAll (+2) |
| `src/services/wallpaper.service.ts` | generateCacheKey, getFromCache, setCache, getApiKey, search (+1) |
| `src/services/favorites.service.ts` | add, remove, move, clearCache, getAll (+1) |
| `src/services/settings.service.ts` | get, set, update, getDefaults, reset |
| `src/services/download.service.ts` | getDownloadPath, startDownload, cleanupOrphanFiles, removeFinishedRecord, clearFinishedRecords |
| `src/composables/download/useDownload.ts` | removeFinished, clearFinished |
| `src/clients/electron.client.ts` | startDownloadTask |

## Entry Points

Start here when exploring this area:

- **`searchWallpapers`** (Function) — `src/services/wallpaperApi.ts:200`
- **`getWallpaperDetail`** (Function) — `src/services/wallpaperApi.ts:249`
- **`removeFinished`** (Function) — `src/composables/download/useDownload.ts:384`
- **`clearFinished`** (Function) — `src/composables/download/useDownload.ts:399`
- **`getFavoriteStatusMap`** (Method) — `src/repositories/favorites.repository.ts:272`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `searchWallpapers` | Function | `src/services/wallpaperApi.ts` | 200 |
| `getWallpaperDetail` | Function | `src/services/wallpaperApi.ts` | 249 |
| `removeFinished` | Function | `src/composables/download/useDownload.ts` | 384 |
| `clearFinished` | Function | `src/composables/download/useDownload.ts` | 399 |
| `getFavoriteStatusMap` | Method | `src/repositories/favorites.repository.ts` | 272 |
| `createCollection` | Method | `src/repositories/favorites.repository.ts` | 47 |
| `renameCollection` | Method | `src/repositories/favorites.repository.ts` | 61 |
| `setDefaultCollection` | Method | `src/repositories/favorites.repository.ts` | 97 |
| `addFavorite` | Method | `src/repositories/favorites.repository.ts` | 131 |
| `getCollections` | Method | `src/repositories/favorites.repository.ts` | 29 |
| `getFavorites` | Method | `src/repositories/favorites.repository.ts` | 116 |
| `generateCacheKey` | Function | `src/services/wallpaperApi.ts` | 32 |
| `getFromCache` | Function | `src/services/wallpaperApi.ts` | 39 |
| `setCache` | Function | `src/services/wallpaperApi.ts` | 55 |
| `isProduction` | Function | `src/services/wallpaperApi.ts` | 79 |
| `callWallhavenAPIViaIPC` | Function | `src/services/wallpaperApi.ts` | 91 |
| `generateCacheKey` | Method | `src/services/wallpaper.service.ts` | 45 |
| `getFromCache` | Method | `src/services/wallpaper.service.ts` | 54 |
| `setCache` | Method | `src/services/wallpaper.service.ts` | 72 |
| `getApiKey` | Method | `src/services/wallpaper.service.ts` | 91 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SearchWallpapers → CreateErrorResponse` | cross_community | 6 |
| `Fetch → CreateErrorResponse` | cross_community | 6 |
| `LoadMore → CreateErrorResponse` | cross_community | 6 |
| `GetWallpaperDetail → CreateErrorResponse` | cross_community | 6 |
| `SearchWallpapers → IsAvailable` | cross_community | 5 |
| `Fetch → IsAvailable` | cross_community | 5 |
| `LoadMore → IsAvailable` | cross_community | 5 |
| `GoToPage → IsAvailable` | cross_community | 5 |
| `GetWallpaperDetail → IsAvailable` | cross_community | 5 |
| `GetDetail → CreateErrorResponse` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Clients | 8 calls |
| Favorites | 2 calls |

## How to Explore

1. `gitnexus_context({name: "searchWallpapers"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
