---
name: clients
description: "Skill for the Clients area of wallhaven. 95 symbols across 10 files."
---

# Clients

95 symbols | 10 files | Cohesion: 71%

## When to Use

- Working with code in `src/`
- Understanding how storeGet, storeDelete, selectFolder work
- Modifying clients-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/clients/index.ts` | storeGet, storeDelete, selectFolder, openFolder, fileExists (+34) |
| `src/clients/favorites.client.ts` | getCollections, createCollection, deleteCollection, getByCollection, remove (+10) |
| `src/clients/download.client.ts` | startTask, cancelTask, getPendingDownloads, downloadWallpaper, pauseTask (+4) |
| `src/clients/file.client.ts` | selectFolder, openFolder, fileExists, readDirectory, deleteFile (+1) |
| `src/clients/window.client.ts` | minimize, close, maximize, isMaximized, WindowClientImpl |
| `src/clients/store.client.ts` | get, delete, set, clear, StoreClientImpl |
| `src/clients/base.client.ts` | createErrorResponse, createUnavailableResponse, isAvailable, safeCall, BaseClient |
| `src/clients/api.client.ts` | isProduction, getErrorCode, getErrorMessage, get, post |
| `src/clients/cache.client.ts` | getInfo, clear, cleanupOrphanFiles, CacheClientImpl |
| `src/clients/wallpaper.client.ts` | set, WallpaperClientImpl |

## Entry Points

Start here when exploring this area:

- **`storeGet`** (Function) — `src/clients/index.ts:46`
- **`storeDelete`** (Function) — `src/clients/index.ts:48`
- **`selectFolder`** (Function) — `src/clients/index.ts:52`
- **`openFolder`** (Function) — `src/clients/index.ts:54`
- **`fileExists`** (Function) — `src/clients/index.ts:56`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BaseClient` | Class | `src/clients/base.client.ts` | 12 |
| `storeGet` | Function | `src/clients/index.ts` | 46 |
| `storeDelete` | Function | `src/clients/index.ts` | 48 |
| `selectFolder` | Function | `src/clients/index.ts` | 52 |
| `openFolder` | Function | `src/clients/index.ts` | 54 |
| `fileExists` | Function | `src/clients/index.ts` | 56 |
| `startDownloadTask` | Function | `src/clients/index.ts` | 61 |
| `cancelDownloadTask` | Function | `src/clients/index.ts` | 68 |
| `getPendingDownloads` | Function | `src/clients/index.ts` | 71 |
| `favoritesGetCollections` | Function | `src/clients/index.ts` | 79 |
| `favoritesCreateCollection` | Function | `src/clients/index.ts` | 80 |
| `favoritesDeleteCollection` | Function | `src/clients/index.ts` | 83 |
| `favoritesGetByCollection` | Function | `src/clients/index.ts` | 85 |
| `favoritesRemove` | Function | `src/clients/index.ts` | 88 |
| `favoritesIsFavorite` | Function | `src/clients/index.ts` | 92 |
| `favoritesGetPaginated` | Function | `src/clients/index.ts` | 95 |
| `favoritesGetStatusMap` | Function | `src/clients/index.ts` | 98 |
| `minimizeWindow` | Function | `src/clients/index.ts` | 101 |
| `closeWindow` | Function | `src/clients/index.ts` | 103 |
| `setWallpaper` | Function | `src/clients/index.ts` | 107 |

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
| `StoreGet → CreateErrorResponse` | intra_community | 4 |

## How to Explore

1. `gitnexus_context({name: "storeGet"})` — see callers and callees
2. `gitnexus_query({query: "clients"})` — find related execution flows
3. Read key files listed above for implementation details
