---
name: services
description: "Skill for the Services area of wallhaven. 47 symbols across 10 files."
---

# Services

47 symbols | 10 files | Cohesion: 89%

## When to Use

- Working with code in `src/`
- Understanding how searchWallpapers, getWallpaperDetail, removeFinished work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/services/collections.service.ts` | create, rename, delete, setDefault, clearCache (+3) |
| `src/services/wallpaperApi.ts` | generateCacheKey, getFromCache, setCache, isProduction, callWallhavenAPIViaIPC (+2) |
| `src/services/download.service.ts` | getDownloadPath, startDownload, cleanupOrphanFiles, constructor, registerProgressListener (+2) |
| `src/services/wallpaper.service.ts` | generateCacheKey, getFromCache, setCache, getApiKey, search (+1) |
| `src/services/favorites.service.ts` | add, remove, move, clearCache, getAll (+1) |
| `src/services/settings.service.ts` | get, set, update, getDefaults, reset |
| `src/repositories/favorites.repository.ts` | getFavoriteStatusMap, addFavorite, getFavorites |
| `electron/main/ipc/handlers/download.handler.ts` | scheduleRetryTimer, waitWithBackoff |
| `src/composables/download/useDownload.ts` | removeFinished, clearFinished |
| `src/clients/store.client.ts` | set |

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
| `addFavorite` | Method | `src/repositories/favorites.repository.ts` | 131 |
| `getFavorites` | Method | `src/repositories/favorites.repository.ts` | 116 |
| `generateCacheKey` | Function | `src/services/wallpaperApi.ts` | 32 |
| `getFromCache` | Function | `src/services/wallpaperApi.ts` | 39 |
| `setCache` | Function | `src/services/wallpaperApi.ts` | 55 |
| `isProduction` | Function | `src/services/wallpaperApi.ts` | 79 |
| `callWallhavenAPIViaIPC` | Function | `src/services/wallpaperApi.ts` | 91 |
| `scheduleRetryTimer` | Function | `electron/main/ipc/handlers/download.handler.ts` | 266 |
| `waitWithBackoff` | Function | `electron/main/ipc/handlers/download.handler.ts` | 296 |
| `set` | Method | `src/clients/store.client.ts` | 46 |
| `generateCacheKey` | Method | `src/services/wallpaper.service.ts` | 45 |
| `getFromCache` | Method | `src/services/wallpaper.service.ts` | 54 |
| `setCache` | Method | `src/services/wallpaper.service.ts` | 72 |
| `getApiKey` | Method | `src/services/wallpaper.service.ts` | 91 |
| `search` | Method | `src/services/wallpaper.service.ts` | 104 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ExecuteWithRetry → CreateErrorResponse` | cross_community | 5 |
| `Refresh → IsProduction` | cross_community | 5 |
| `Refresh → GetErrorCode` | cross_community | 5 |
| `Refresh → GetErrorMessage` | cross_community | 5 |
| `UpdateItemFavoriteStatus → CreateErrorResponse` | cross_community | 5 |
| `WaitWithBackoff → CreateErrorResponse` | cross_community | 5 |
| `ExecuteWithRetry → IsAvailable` | cross_community | 4 |
| `Fetch → IsProduction` | cross_community | 4 |
| `Fetch → GetErrorCode` | cross_community | 4 |
| `Fetch → GetErrorMessage` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Clients | 5 calls |

## How to Explore

1. `gitnexus_context({name: "searchWallpapers"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
