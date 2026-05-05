---
name: handlers
description: "Skill for the Handlers area of wallhaven. 38 symbols across 14 files."
---

# Handlers

38 symbols | 14 files | Cohesion: 65%

## When to Use

- Working with code in `electron/`
- Understanding how isResumeDownloadParams, isPendingDownload, getAppSetting work
- Modifying handlers-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `electron/main/ipc/handlers/download.handler.ts` | getStateFilePath, writeStateFile, readStateFile, shouldPersistState, cleanupDownload (+7) |
| `electron/main/ipc/handlers/download-queue.ts` | enqueue, processQueue, _emitProgress, remove, clear (+2) |
| `electron/main/database.ts` | getAppSetting, getDownloadPath, getMaxConcurrentDownloads, withTransaction |
| `electron/main/ipc/handlers/base.ts` | getImageDimensions, generateThumbnail, logHandler |
| `src/types/ipc.ts` | isResumeDownloadParams, isPendingDownload |
| `electron/main/ipc/handlers/store.handler.ts` | keyToTable, registerStoreHandlers |
| `electron/main/ipc/handlers/window.handler.ts` | registerWindowHandlers |
| `electron/main/ipc/handlers/wallpaper.handler.ts` | registerWallpaperHandlers |
| `electron/main/ipc/handlers/index.ts` | registerAllHandlers |
| `electron/main/ipc/handlers/file.handler.ts` | registerFileHandlers |

## Entry Points

Start here when exploring this area:

- **`isResumeDownloadParams`** (Function) — `src/types/ipc.ts:394`
- **`isPendingDownload`** (Function) — `src/types/ipc.ts:411`
- **`getAppSetting`** (Function) — `electron/main/database.ts:263`
- **`getDownloadPath`** (Function) — `electron/main/database.ts:285`
- **`getMaxConcurrentDownloads`** (Function) — `electron/main/database.ts:297`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isResumeDownloadParams` | Function | `src/types/ipc.ts` | 394 |
| `isPendingDownload` | Function | `src/types/ipc.ts` | 411 |
| `getAppSetting` | Function | `electron/main/database.ts` | 263 |
| `getDownloadPath` | Function | `electron/main/database.ts` | 285 |
| `getMaxConcurrentDownloads` | Function | `electron/main/database.ts` | 297 |
| `executeDownload` | Function | `electron/main/ipc/handlers/download.handler.ts` | 317 |
| `registerDownloadHandlers` | Function | `electron/main/ipc/handlers/download.handler.ts` | 721 |
| `registerWindowHandlers` | Function | `electron/main/ipc/handlers/window.handler.ts` | 6 |
| `registerWallpaperHandlers` | Function | `electron/main/ipc/handlers/wallpaper.handler.ts` | 8 |
| `registerAllHandlers` | Function | `electron/main/ipc/handlers/index.ts` | 69 |
| `registerFileHandlers` | Function | `electron/main/ipc/handlers/file.handler.ts` | 10 |
| `registerFavoritesHandlers` | Function | `electron/main/ipc/handlers/favorites.handler.ts` | 13 |
| `registerCacheHandlers` | Function | `electron/main/ipc/handlers/cache.handler.ts` | 11 |
| `getImageDimensions` | Function | `electron/main/ipc/handlers/base.ts` | 18 |
| `generateThumbnail` | Function | `electron/main/ipc/handlers/base.ts` | 109 |
| `logHandler` | Function | `electron/main/ipc/handlers/base.ts` | 154 |
| `registerApiHandlers` | Function | `electron/main/ipc/handlers/api.handler.ts` | 11 |
| `isFavorite` | Function | `src/stores/modules/favorites/index.ts` | 105 |
| `withTransaction` | Function | `electron/main/database.ts` | 245 |
| `registerStoreHandlers` | Function | `electron/main/ipc/handlers/store.handler.ts` | 40 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Enqueue → CreateErrorResponse` | cross_community | 8 |
| `Enqueue → IsAvailable` | cross_community | 7 |
| `RegisterDownloadHandlers → CreateErrorResponse` | cross_community | 6 |
| `ExecuteWithRetry → CreateErrorResponse` | cross_community | 6 |
| `Enqueue → GetDbPath` | cross_community | 6 |
| `Enqueue → InitializeSchema` | cross_community | 6 |
| `Enqueue → RunMigration` | cross_community | 6 |
| `Enqueue → StartPeriodicCheckpoint` | cross_community | 6 |
| `Enqueue → IsProduction` | cross_community | 6 |
| `Enqueue → GetErrorCode` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Clients | 8 calls |
| Main | 4 calls |
| Favorites | 4 calls |

## How to Explore

1. `gitnexus_context({name: "isResumeDownloadParams"})` — see callers and callees
2. `gitnexus_query({query: "handlers"})` — find related execution flows
3. Read key files listed above for implementation details
