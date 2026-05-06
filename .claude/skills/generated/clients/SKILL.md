---
name: clients
description: "Skill for the Clients area of wallhaven. 95 symbols across 10 files."
---

# Clients

95 symbols | 10 files | Cohesion: 71%

## When to Use

- Working with code in `src/`
- Understanding how storeSet, storeClear, readDirectory work
- Modifying clients-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/clients/index.ts` | storeSet, storeClear, readDirectory, deleteFile, downloadWallpaper (+34) |
| `src/clients/favorites.client.ts` | getCollections, createCollection, renameCollection, setDefaultCollection, add (+10) |
| `src/clients/download.client.ts` | downloadWallpaper, pauseTask, resumeTask, startTask, cancelTask (+4) |
| `src/clients/file.client.ts` | readDirectory, deleteFile, selectFolder, openFolder, fileExists (+1) |
| `src/clients/window.client.ts` | minimize, close, maximize, isMaximized, WindowClientImpl |
| `src/clients/store.client.ts` | set, clear, get, delete, StoreClientImpl |
| `src/clients/base.client.ts` | createErrorResponse, createUnavailableResponse, isAvailable, safeCall, BaseClient |
| `src/clients/api.client.ts` | isProduction, getErrorCode, getErrorMessage, get, post |
| `src/clients/cache.client.ts` | clear, cleanupOrphanFiles, getInfo, CacheClientImpl |
| `src/clients/wallpaper.client.ts` | set, WallpaperClientImpl |

## Entry Points

Start here when exploring this area:

- **`storeSet`** (Function) — `src/clients/index.ts:47`
- **`storeClear`** (Function) — `src/clients/index.ts:49`
- **`readDirectory`** (Function) — `src/clients/index.ts:53`
- **`deleteFile`** (Function) — `src/clients/index.ts:55`
- **`downloadWallpaper`** (Function) — `src/clients/index.ts:59`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BaseClient` | Class | `src/clients/base.client.ts` | 12 |
| `storeSet` | Function | `src/clients/index.ts` | 47 |
| `storeClear` | Function | `src/clients/index.ts` | 49 |
| `readDirectory` | Function | `src/clients/index.ts` | 53 |
| `deleteFile` | Function | `src/clients/index.ts` | 55 |
| `downloadWallpaper` | Function | `src/clients/index.ts` | 59 |
| `pauseDownloadTask` | Function | `src/clients/index.ts` | 67 |
| `resumeDownloadTask` | Function | `src/clients/index.ts` | 69 |
| `favoritesGetCollections` | Function | `src/clients/index.ts` | 79 |
| `favoritesCreateCollection` | Function | `src/clients/index.ts` | 80 |
| `favoritesRenameCollection` | Function | `src/clients/index.ts` | 81 |
| `favoritesSetDefaultCollection` | Function | `src/clients/index.ts` | 84 |
| `favoritesAdd` | Function | `src/clients/index.ts` | 86 |
| `favoritesMove` | Function | `src/clients/index.ts` | 90 |
| `favoritesGetCollectionsForWallpaper` | Function | `src/clients/index.ts` | 93 |
| `favoritesGetCounts` | Function | `src/clients/index.ts` | 97 |
| `minimizeWindow` | Function | `src/clients/index.ts` | 101 |
| `closeWindow` | Function | `src/clients/index.ts` | 103 |
| `setWallpaper` | Function | `src/clients/index.ts` | 107 |
| `clearAppCache` | Function | `src/clients/index.ts` | 110 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Refresh → IsProduction` | cross_community | 5 |
| `Refresh → GetErrorCode` | cross_community | 5 |
| `Refresh → GetErrorMessage` | cross_community | 5 |
| `Fetch → IsProduction` | cross_community | 4 |
| `Fetch → GetErrorCode` | cross_community | 4 |
| `Fetch → GetErrorMessage` | cross_community | 4 |
| `LoadMore → IsProduction` | cross_community | 4 |
| `LoadMore → GetErrorCode` | cross_community | 4 |
| `LoadMore → GetErrorMessage` | cross_community | 4 |
| `StoreGet → CreateErrorResponse` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "storeSet"})` — see callers and callees
2. `gitnexus_query({query: "clients"})` — find related execution flows
3. Read key files listed above for implementation details
