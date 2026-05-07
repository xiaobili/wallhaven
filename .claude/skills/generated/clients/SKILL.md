---
name: clients
description: "Skill for the Clients area of wallhaven. 107 symbols across 12 files."
---

# Clients

107 symbols | 12 files | Cohesion: 72%

## When to Use

- Working with code in `src/`
- Understanding how storeGet, storeDelete, readDirectory work
- Modifying clients-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/clients/index.ts` | storeGet, storeDelete, readDirectory, deleteFile, downloadWallpaper (+34) |
| `src/clients/favorites.client.ts` | createCollection, deleteCollection, getByCollection, remove, isFavorite (+10) |
| `src/repositories/download-task.repository.ts` | downloadWallpaper, pauseDownloadTask, resumeDownloadTask, startDownloadTask, cancelDownloadTask (+5) |
| `src/clients/download.client.ts` | downloadWallpaper, pauseTask, resumeTask, startTask, cancelTask (+4) |
| `src/clients/file.client.ts` | readDirectory, deleteFile, openFolder, FileClientImpl, selectFolder (+1) |
| `src/clients/window.client.ts` | minimize, maximize, close, isMaximized, WindowClientImpl |
| `src/clients/store.client.ts` | get, delete, set, clear, StoreClientImpl |
| `src/clients/base.client.ts` | createErrorResponse, createUnavailableResponse, isAvailable, safeCall, BaseClient |
| `src/clients/api.client.ts` | isProduction, getErrorCode, getErrorMessage, get, post |
| `src/clients/cache.client.ts` | getInfo, clear, cleanupOrphanFiles, CacheClientImpl |

## Entry Points

Start here when exploring this area:

- **`storeGet`** (Function) — `src/clients/index.ts:46`
- **`storeDelete`** (Function) — `src/clients/index.ts:48`
- **`readDirectory`** (Function) — `src/clients/index.ts:53`
- **`deleteFile`** (Function) — `src/clients/index.ts:55`
- **`downloadWallpaper`** (Function) — `src/clients/index.ts:59`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BaseClient` | Class | `src/clients/base.client.ts` | 12 |
| `storeGet` | Function | `src/clients/index.ts` | 46 |
| `storeDelete` | Function | `src/clients/index.ts` | 48 |
| `readDirectory` | Function | `src/clients/index.ts` | 53 |
| `deleteFile` | Function | `src/clients/index.ts` | 55 |
| `downloadWallpaper` | Function | `src/clients/index.ts` | 59 |
| `pauseDownloadTask` | Function | `src/clients/index.ts` | 67 |
| `resumeDownloadTask` | Function | `src/clients/index.ts` | 69 |
| `favoritesCreateCollection` | Function | `src/clients/index.ts` | 80 |
| `favoritesDeleteCollection` | Function | `src/clients/index.ts` | 83 |
| `favoritesGetByCollection` | Function | `src/clients/index.ts` | 85 |
| `favoritesRemove` | Function | `src/clients/index.ts` | 88 |
| `favoritesIsFavorite` | Function | `src/clients/index.ts` | 92 |
| `favoritesGetPaginated` | Function | `src/clients/index.ts` | 95 |
| `favoritesGetStatusMap` | Function | `src/clients/index.ts` | 98 |
| `minimizeWindow` | Function | `src/clients/index.ts` | 101 |
| `maximizeWindow` | Function | `src/clients/index.ts` | 102 |
| `closeWindow` | Function | `src/clients/index.ts` | 103 |
| `isMaximized` | Function | `src/clients/index.ts` | 104 |
| `getCacheInfo` | Function | `src/clients/index.ts` | 111 |

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
| `SelectFolder → CreateErrorResponse` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "storeGet"})` — see callers and callees
2. `gitnexus_query({query: "clients"})` — find related execution flows
3. Read key files listed above for implementation details
