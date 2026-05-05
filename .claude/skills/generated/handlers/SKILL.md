---
name: handlers
description: "Skill for the Handlers area of wallhaven. 38 symbols across 14 files."
---

# Handlers

38 symbols | 14 files | Cohesion: 75%

## When to Use

- Working with code in `electron/`
- Understanding how isResumeDownloadParams, isPendingDownload, getAppSetting work
- Modifying handlers-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `electron/main/ipc/handlers/download.handler.ts` | getStateFilePath, writeStateFile, readStateFile, shouldPersistState, cleanupDownload (+6) |
| `electron/main/ipc/handlers/download-queue.ts` | has, enqueue, processQueue, _emitProgress, remove (+2) |
| `electron/main/database.ts` | getAppSetting, getDownloadPath, getMaxConcurrentDownloads, withTransaction |
| `electron/main/ipc/handlers/base.ts` | getImageDimensions, generateThumbnail, logHandler |
| `src/types/ipc.ts` | isResumeDownloadParams, isPendingDownload |
| `src/stores/modules/favorites/index.ts` | isFavorite, setCachedPage |
| `electron/main/ipc/handlers/store.handler.ts` | keyToTable, registerStoreHandlers |
| `electron/main/ipc/handlers/window.handler.ts` | registerWindowHandlers |
| `electron/main/ipc/handlers/wallpaper.handler.ts` | registerWallpaperHandlers |
| `electron/main/ipc/handlers/index.ts` | registerAllHandlers |

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
| `isFavorite` | Function | `src/stores/modules/favorites/index.ts` | 105 |
| `setCachedPage` | Function | `src/stores/modules/favorites/index.ts` | 219 |
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
| `withTransaction` | Function | `electron/main/database.ts` | 245 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RegisterDownloadHandlers → GetDbPath` | cross_community | 7 |
| `RegisterDownloadHandlers → InitializeSchema` | cross_community | 7 |
| `RegisterDownloadHandlers → RunMigration` | cross_community | 7 |
| `RegisterDownloadHandlers → StartPeriodicCheckpoint` | cross_community | 7 |
| `RegisterAllHandlers → LogHandler` | cross_community | 5 |
| `RegisterAllHandlers → _emitProgress` | cross_community | 5 |
| `ExecuteWithRetry → CreateErrorResponse` | cross_community | 5 |
| `RegisterAllHandlers → Has` | cross_community | 4 |
| `RegisterStoreHandlers → GetDbPath` | cross_community | 4 |
| `RegisterStoreHandlers → InitializeSchema` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Main | 4 calls |
| Services | 3 calls |
| Clients | 2 calls |

## How to Explore

1. `gitnexus_context({name: "isResumeDownloadParams"})` — see callers and callees
2. `gitnexus_query({query: "handlers"})` — find related execution flows
3. Read key files listed above for implementation details
